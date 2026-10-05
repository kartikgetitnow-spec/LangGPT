/**
 * ==============================================================================
 * REFRESH TOKEN & ACCESS TOKEN ROTATION MANAGER
 * ==============================================================================
 * Handles enterprise-grade OAuth token rotation for Google and GitHub.
 * Automatically refreshes expired access tokens using the stored refresh token
 * and synchronizes the refreshed credentials with the Prisma PostgreSQL Account table.
 */

import { prisma } from "@/server/db/prisma";
import type { JWT } from "next-auth/jwt";

export interface RefreshedTokenResult {
  accessToken: string;
  accessTokenExpires: number;
  refreshToken?: string;
  error?: string;
}

/**
 * Refreshes Google OAuth access token using refresh_token
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<RefreshedTokenResult> {
  try {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("Google token refresh failed:", refreshedTokens);
      throw refreshedTokens;
    }

    return {
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Math.floor(Date.now() / 1000 + (refreshedTokens.expires_in || 3600)),
      refreshToken: refreshedTokens.refresh_token ?? refreshToken, // Fallback to existing if not rotated
    };
  } catch (error) {
    console.error("Error refreshing Google access token:", error);
    return {
      accessToken: "",
      accessTokenExpires: 0,
      error: "RefreshAccessTokenError",
    };
  }
}

/**
 * Persists updated tokens to the Prisma PostgreSQL Account model
 */
export async function syncTokensToDatabase(
  userId: string,
  provider: string,
  tokens: { accessToken: string; refreshToken?: string; expiresAt: number }
) {
  try {
    await prisma.account.updateMany({
      where: {
        userId,
        provider,
      },
      data: {
        access_token: tokens.accessToken,
        ...(tokens.refreshToken ? { refresh_token: tokens.refreshToken } : {}),
        expires_at: tokens.expiresAt,
      },
    });
  } catch (dbError) {
    console.warn("Could not sync refreshed tokens to PostgreSQL database:", (dbError as Error).message);
  }
}

/**
 * Main token rotator invoked inside the NextAuth JWT callback
 */
export async function rotateTokenIfNeeded(token: JWT): Promise<JWT> {
  // If no expiration or provider is not oauth, return token as-is
  if (!token.accessTokenExpires || !token.refreshToken || !token.provider) {
    return token;
  }

  // Token is still valid (with a 2-minute safety buffer)
  const isExpiringSoon = Date.now() >= ((token.accessTokenExpires as number) - 120) * 1000;
  if (!isExpiringSoon) {
    return token;
  }

  console.log(`[Auth Token] Access token for provider ${token.provider} is expiring. Refreshing...`);

  if (token.provider === "google") {
    const refreshed = await refreshGoogleAccessToken(token.refreshToken as string);

    if (refreshed.error) {
      return {
        ...token,
        error: "RefreshAccessTokenError",
      };
    }

    // Persist to Postgres
    if (token.sub) {
      await syncTokensToDatabase(token.sub, "google", {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.accessTokenExpires,
      });
    }

    return {
      ...token,
      accessToken: refreshed.accessToken,
      accessTokenExpires: refreshed.accessTokenExpires,
      refreshToken: refreshed.refreshToken ?? token.refreshToken,
      error: undefined,
    };
  }

  return token;
}
