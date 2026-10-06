import { Request, Response, NextFunction } from "express";
import { decode } from "next-auth/jwt";
import { DiagnosticService } from "../services/diagnosticService";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Direct header injected by Next.js proxy/rewrites
  const proxyUserId = req.headers["x-user-id"] as string;
  if (proxyUserId) {
    req.user = {
      id: proxyUserId,
      email: (req.headers["x-user-email"] as string) || undefined,
      name: (req.headers["x-user-name"] as string) || undefined,
    };
    return next();
  }

  // 2. Bearer Authorization header
  const authHeader = req.headers.authorization;
  let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // 3. NextAuth session cookie
  if (!token && req.cookies) {
    token =
      req.cookies["authjs.session-token"] ||
      req.cookies["__Secure-authjs.session-token"] ||
      req.cookies["next-auth.session-token"] ||
      req.cookies["__Secure-next-auth.session-token"];
  }

  if (token) {
    try {
      const secret =
        process.env.AUTH_SECRET ||
        process.env.NEXTAUTH_SECRET ||
        "fallback_auth_secret_for_development";
      const salt = req.cookies?.["__Secure-authjs.session-token"]
        ? "__Secure-authjs.session-token"
        : "authjs.session-token";

      const decoded = await decode({
        token,
        secret,
        salt,
      }).catch(() => null);

      if (decoded && (decoded.sub || decoded.email)) {
        req.user = {
          id: (decoded.sub || decoded.email || (decoded as Record<string, unknown>).id) as string,
          email: decoded.email as string | undefined,
          name: decoded.name as string | undefined,
        };
        return next();
      } else {
        DiagnosticService.logError({
          category: "AUTH",
          severity: "WARNING",
          message: `JWT token decode failed (invalid signature or expired token) on ${req.method} ${req.originalUrl || req.url}`,
          endpoint: req.originalUrl || req.url,
          method: req.method,
          ip: (req.headers["x-forwarded-for"] as string) || req.ip,
          details: {
            tokenSnippet: token ? `${token.slice(0, 10)}...` : undefined,
            saltUsed: salt,
            hasAuthSecret: Boolean(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
          },
          suggestion: "AUTH_SECRET on client and server must be identical. If on phone/different IP, check if cookies are cross-domain blocked.",
        });
      }
    } catch (err) {
      console.warn("Token decode verification failed:", err);
      DiagnosticService.logError({
        category: "AUTH",
        severity: "ERROR",
        message: `Token decode error: ${(err as Error).message}`,
        error: err,
        endpoint: req.originalUrl || req.url,
        method: req.method,
        ip: (req.headers["x-forwarded-for"] as string) || req.ip,
      });
    }
  } else {
    // Missing credentials
    DiagnosticService.logError({
      category: "AUTH",
      severity: "WARNING",
      message: `Unauthorized access: No session token or proxy user header provided for ${req.method} ${req.originalUrl || req.url}`,
      endpoint: req.originalUrl || req.url,
      method: req.method,
      ip: (req.headers["x-forwarded-for"] as string) || req.ip,
      details: {
        hasCookies: Boolean(req.cookies && Object.keys(req.cookies).length > 0),
        cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
        hasAuthHeader: Boolean(authHeader),
        userAgent: req.headers["user-agent"],
      },
      suggestion: "If logging in from phone, ensure cookies can be set over HTTPS, or send 'Authorization: Bearer <token>' in API requests.",
    });
  }

  return res.status(401).json({
    error: "Unauthorized",
    message: "You must be authenticated to chat or view conversation history.",
  });
}
