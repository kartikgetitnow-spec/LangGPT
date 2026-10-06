/**
 * ==============================================================================
 * DIAGNOSTIC & ERROR LOGGING SERVICE
 * ==============================================================================
 * Real-time telemetry, active health probes, and structured error ring-buffer
 * for Database, Authentication, Gemini AI, Redis, RAG, and System resources.
 */

import { prisma } from "@/server/db/prisma";
import { redis } from "@/server/db/redis";
import { vectorStore } from "../rag/vectorStore";
import fs from "fs";
import os from "os";

export type ErrorCategory = "DATABASE" | "AUTH" | "AI_MODEL" | "REDIS" | "RAG" | "SYSTEM";
export type ErrorSeverity = "CRITICAL" | "ERROR" | "WARNING" | "INFO";

export interface DiagnosticError {
  id: string;
  timestamp: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userId?: string;
  details?: Record<string, unknown>;
  suggestion?: string;
}

export interface ServiceProbe {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  message: string;
  details?: Record<string, unknown>;
  troubleshooting?: string;
}

export class DiagnosticService {
  private static readonly MAX_LOGS = 100;
  private static errorLogs: DiagnosticError[] = [];
  private static startTime = Date.now();
  private static lastRateLimit: { model: string; timestamp: string; resetTime?: string } | null = null;

  /**
   * Log a structured error into the in-memory ring buffer
   */
  static logError(params: {
    category: ErrorCategory;
    severity?: ErrorSeverity;
    message: string;
    error?: unknown;
    endpoint?: string;
    method?: string;
    ip?: string;
    userId?: string;
    details?: Record<string, unknown>;
    suggestion?: string;
  }): DiagnosticError {
    const {
      category,
      severity = "ERROR",
      message,
      error,
      endpoint,
      method,
      ip,
      userId,
      details,
      suggestion,
    } = params;

    let stack: string | undefined;
    let computedMessage = message;

    if (error instanceof Error) {
      stack = error.stack;
      if (!computedMessage) {
        computedMessage = error.message;
      }
    } else if (typeof error === "string") {
      computedMessage = `${message}: ${error}`;
    }

    // Auto-detect rate-limit quota exhaustion
    if (computedMessage.includes("429") || computedMessage.includes("QuotaExhausted") || computedMessage.includes("quota exceeded")) {
      this.lastRateLimit = {
        model: (details?.model as string) || "gemini-2.5-flash",
        timestamp: new Date().toISOString(),
      };
    }

    // Auto-generate actionable suggestions based on category and message
    const finalSuggestion = suggestion || this.generateSuggestion(category, computedMessage);

    const entry: DiagnosticError = {
      id: "err-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      category,
      severity,
      message: computedMessage,
      stack,
      endpoint,
      method,
      ip,
      userId,
      details,
      suggestion: finalSuggestion,
    };

    // Prepend to ring buffer (newest first)
    this.errorLogs.unshift(entry);
    if (this.errorLogs.length > this.MAX_LOGS) {
      this.errorLogs.pop();
    }

    return entry;
  }

  /**
   * Clear error logs buffer
   */
  static clearLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Get all captured error logs, optionally filtered by category
   */
  static getLogs(category?: ErrorCategory): DiagnosticError[] {
    if (!category) return [...this.errorLogs];
    return this.errorLogs.filter((l) => l.category === category);
  }

  /**
   * Record a rate limit event
   */
  static recordRateLimit(model: string, resetTime?: string): void {
    this.lastRateLimit = {
      model,
      timestamp: new Date().toISOString(),
      resetTime,
    };
  }

  /**
   * Probe Database (PostgreSQL / Prisma)
   */
  static async probeDatabase(): Promise<ServiceProbe> {
    const start = performance.now();
    try {
      // Execute lightweight query with timeout
      await Promise.race([
        prisma.$queryRaw`SELECT 1 as healthy`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Database query timed out (3000ms)")), 3000)),
      ]);
      const latencyMs = Math.round(performance.now() - start);
      return {
        name: "PostgreSQL Database (Prisma)",
        status: "healthy",
        latencyMs,
        message: `Connected successfully (${latencyMs}ms latency)`,
        details: {
          databaseUrl: this.maskUrl(process.env.DATABASE_URL || ""),
          clientVersion: "Prisma 6.19.3",
        },
      };
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "Database connection failed";
      this.logError({
        category: "DATABASE",
        severity: "CRITICAL",
        message: `PostgreSQL connection check failed: ${errorMsg}`,
        error: err,
      });

      return {
        name: "PostgreSQL Database (Prisma)",
        status: "down",
        message: errorMsg,
        details: {
          databaseUrl: this.maskUrl(process.env.DATABASE_URL || ""),
          fallbackActive: "In-memory / JSON local fallback currently serving queries",
        },
        troubleshooting:
          "Verify your PostgreSQL database is running (`sudo systemctl status postgresql` or Docker) and DATABASE_URL in server/.env points to a valid instance.",
      };
    }
  }

  /**
   * Probe Redis Cache
   */
  static async probeRedis(): Promise<ServiceProbe> {
    const start = performance.now();
    try {
      const result = await Promise.race([
        redis.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Redis ping timed out (2000ms)")), 2000)),
      ]);
      const latencyMs = Math.round(performance.now() - start);

      if (result === "PONG") {
        return {
          name: "Redis Fast Cache Layer",
          status: "healthy",
          latencyMs,
          message: `Connected (PONG returned in ${latencyMs}ms)`,
          details: {
            redisUrl: this.maskUrl(process.env.REDIS_URL || "redis://localhost:6379"),
          },
        };
      }
      throw new Error(`Unexpected Redis response: ${result}`);
    } catch (err: unknown) {
      const errorMsg = (err as Error).message || "Redis ping failed";
      this.logError({
        category: "REDIS",
        severity: "WARNING",
        message: `Redis probe warning: ${errorMsg}`,
        error: err,
      });

      return {
        name: "Redis Fast Cache Layer",
        status: "degraded",
        message: errorMsg,
        details: {
          redisUrl: this.maskUrl(process.env.REDIS_URL || "redis://localhost:6379"),
          fallback: "In-memory Map cache serving conversation acceleration",
        },
        troubleshooting:
          "Start Redis locally using `redis-server` or `docker run -p 6379:6379 redis:alpine`. In-memory cache is maintaining continuity.",
      };
    }
  }

  /**
   * Probe Authentication & Token Secrets
   */
  static probeAuth(): ServiceProbe {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    const trustHost = process.env.AUTH_TRUST_HOST === "true";
    const googleId = process.env.GOOGLE_CLIENT_ID;
    const githubId = process.env.GITHUB_ID;

    if (!secret) {
      return {
        name: "Authentication & JWT Security",
        status: "down",
        message: "CRITICAL: AUTH_SECRET and NEXTAUTH_SECRET are missing!",
        troubleshooting: "Add AUTH_SECRET='<random-64-char-string>' to server/.env and restart server.",
      };
    }

    if (secret.length < 32) {
      return {
        name: "Authentication & JWT Security",
        status: "degraded",
        message: "AUTH_SECRET is shorter than recommended 32 characters.",
        troubleshooting: "Generate a cryptographically strong secret with `openssl rand -hex 32`.",
      };
    }

    return {
      name: "Authentication & JWT Security",
      status: "healthy",
      message: "JWT token signing secrets active & valid",
      details: {
        secretLength: secret.length,
        trustHostEnabled: trustHost,
        googleOAuthAvailable: !!googleId,
        githubOAuthAvailable: !!githubId,
      },
    };
  }

  /**
   * Probe Google Gemini AI Provider
   */
  static probeGemini(): ServiceProbe {
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    const defaultModel = process.env.DEFAULT_AI_MODEL || "gemini-2.5-flash-lite";

    if (!apiKey) {
      return {
        name: "Google Gemini AI Engine",
        status: "down",
        message: "GOOGLE_API_KEY is not configured!",
        troubleshooting: "Get an API key from https://aistudio.google.com/app/apikey and add to server/.env.",
      };
    }

    if (this.lastRateLimit) {
      const elapsedMins = Math.round((Date.now() - new Date(this.lastRateLimit.timestamp).getTime()) / 60000);
      if (elapsedMins < 60) {
        return {
          name: "Google Gemini AI Engine",
          status: "degraded",
          message: `Recent quota exhaustion (429) on ${this.lastRateLimit.model} (${elapsedMins}m ago). Automatic fallback to gemini-2.5-flash-lite active.`,
          details: {
            defaultModel,
            keyConfigured: true,
            maskedKey: this.maskApiKey(apiKey),
            last429: this.lastRateLimit.timestamp,
          },
          troubleshooting: "LangGPT automatically cascades to gemini-2.5-flash-lite and gemini-flash-latest with high daily quotas.",
        };
      }
    }

    return {
      name: "Google Gemini AI Engine",
      status: "healthy",
      message: `API Key active. Default model: ${defaultModel}`,
      details: {
        defaultModel,
        keyLength: apiKey.length,
        maskedKey: this.maskApiKey(apiKey),
        fallbackCascade: ["gemini-2.5-flash-lite", "gemini-flash-latest"],
      },
    };
  }

  /**
   * Probe RAG & Vector Store
   */
  static probeRag(): ServiceProbe {
    try {
      const stats = vectorStore.getStats();
      const chunks = stats.totalChunks;
      const embeddingModel = process.env.EMBEDDING_MODEL || "models/gemini-embedding-001";

      return {
        name: "LangChain RAG & Vector Store",
        status: "healthy",
        message: `${chunks} document chunks loaded & searchable`,
        details: {
          totalChunks: chunks,
          uniqueUsers: stats.uniqueUsers,
          uniqueConversations: stats.uniqueConversations,
          embeddingModel,
        },
      };
    } catch (err: unknown) {
      return {
        name: "LangChain RAG & Vector Store",
        status: "degraded",
        message: (err as Error).message || "VectorStore query failed",
      };
    }
  }

  /**
   * Probe System Telemetry
   */
  static getSystemTelemetry(): ServiceProbe {
    const mem = process.memoryUsage();
    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const secs = uptimeSec % 60;
    const uptimeString = `${hours}h ${mins}m ${secs}s`;

    const rssMb = Math.round(mem.rss / 1024 / 1024);
    const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMb = Math.round(mem.heapTotal / 1024 / 1024);

    return {
      name: "Node.js System Telemetry",
      status: "healthy",
      message: `Uptime: ${uptimeString} | Memory: ${heapUsedMb}MB / ${heapTotalMb}MB`,
      details: {
        uptimeString,
        pid: process.pid,
        nodeVersion: process.version,
        platform: `${os.platform()} (${os.arch()})`,
        rssMb: `${rssMb} MB`,
        heapUsedMb: `${heapUsedMb} MB`,
        heapTotalMb: `${heapTotalMb} MB`,
        systemCpus: os.cpus().length,
        loadAverage: os.loadavg().map((n) => n.toFixed(2)),
      },
    };
  }

  /**
   * Collect overall health status across all probes
   */
  static async getFullDiagnostics() {
    const [dbProbe, redisProbe] = await Promise.all([
      this.probeDatabase(),
      this.probeRedis(),
    ]);

    const authProbe = this.probeAuth();
    const geminiProbe = this.probeGemini();
    const ragProbe = this.probeRag();
    const systemProbe = this.getSystemTelemetry();

    const probes = [dbProbe, redisProbe, authProbe, geminiProbe, ragProbe, systemProbe];

    // Determine overall state
    let overallStatus: "healthy" | "degraded" | "down" = "healthy";
    if (probes.some((p) => p.status === "down")) {
      overallStatus = "down";
    } else if (probes.some((p) => p.status === "degraded")) {
      overallStatus = "degraded";
    }

    const counts = {
      total: this.errorLogs.length,
      database: this.errorLogs.filter((l) => l.category === "DATABASE").length,
      auth: this.errorLogs.filter((l) => l.category === "AUTH").length,
      aiModel: this.errorLogs.filter((l) => l.category === "AI_MODEL").length,
      redis: this.errorLogs.filter((l) => l.category === "REDIS").length,
      system: this.errorLogs.filter((l) => l.category === "SYSTEM").length,
    };

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      probes,
      errorCounts: counts,
      recentErrors: this.errorLogs,
      environmentAudit: this.getEnvironmentAudit(),
    };
  }

  /**
   * Safe Environment Variable Audit (all secrets masked)
   */
  static getEnvironmentAudit() {
    return [
      { key: "PORT", value: process.env.PORT || "5000", status: "ok" },
      { key: "NODE_ENV", value: process.env.NODE_ENV || "development", status: "ok" },
      { key: "BACKEND_URL", value: process.env.BACKEND_URL || "not set", status: process.env.BACKEND_URL ? "ok" : "info" },
      {
        key: "DATABASE_URL",
        value: this.maskUrl(process.env.DATABASE_URL || ""),
        status: process.env.DATABASE_URL ? "ok" : "missing",
      },
      {
        key: "REDIS_URL",
        value: this.maskUrl(process.env.REDIS_URL || "redis://localhost:6379"),
        status: "ok",
      },
      {
        key: "GOOGLE_API_KEY",
        value: this.maskApiKey(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ""),
        status: (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY) ? "ok" : "missing",
      },
      {
        key: "AUTH_SECRET",
        value: this.maskApiKey(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ""),
        status: (process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET) ? "ok" : "missing",
      },
      {
        key: "AUTH_TRUST_HOST",
        value: process.env.AUTH_TRUST_HOST || "not set",
        status: process.env.AUTH_TRUST_HOST === "true" ? "ok" : "warning",
      },
      {
        key: "DEFAULT_AI_MODEL",
        value: process.env.DEFAULT_AI_MODEL || "gemini-2.5-flash-lite",
        status: "ok",
      },
      {
        key: "EMBEDDING_MODEL",
        value: process.env.EMBEDDING_MODEL || "models/gemini-embedding-001",
        status: "ok",
      },
    ];
  }

  // Masking helpers
  private static maskApiKey(key: string): string {
    if (!key) return "MISSING";
    if (key.length <= 8) return "********";
    return key.slice(0, 4) + "..." + key.slice(-4);
  }

  private static maskUrl(url: string): string {
    if (!url) return "NOT CONFIGURED";
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = "******";
      }
      return parsed.toString();
    } catch {
      return url.replace(/:([^:@]+)@/, ":******@");
    }
  }

  private static generateSuggestion(category: ErrorCategory, msg: string): string {
    const lower = msg.toLowerCase();
    switch (category) {
      case "DATABASE":
        if (lower.includes("can't reach database") || lower.includes("econnrefused")) {
          return "PostgreSQL is not responding on port 5432. Check `sudo systemctl status postgresql` or verify DATABASE_URL.";
        }
        if (lower.includes("authentication failed")) {
          return "PostgreSQL credentials rejected. Check database username and password in DATABASE_URL.";
        }
        return "Review Prisma schema migration status with `npx prisma migrate status`.";
      case "AUTH":
        if (lower.includes("unauthorized") || lower.includes("no token")) {
          return "User requested a protected route without valid JWT cookies or x-user-id header.";
        }
        if (lower.includes("secret")) {
          return "Ensure AUTH_SECRET in server/.env exactly matches AUTH_SECRET in the frontend.";
        }
        return "Ensure NextAuth session cookies are included in request headers.";
      case "AI_MODEL":
        if (lower.includes("429") || lower.includes("quota")) {
          return "Gemini API rate limit hit. LangGPT will auto-fallback to gemini-2.5-flash-lite or gemini-flash-latest.";
        }
        if (lower.includes("api key")) {
          return "Verify GOOGLE_API_KEY in server/.env. Check key validity in Google AI Studio.";
        }
        return "Review model name and prompt length limits in Google Generative AI docs.";
      case "REDIS":
        return "Start local Redis via `redis-server` or verify REDIS_URL. Memory fallback is handling active requests.";
      case "RAG":
        return "Verify server/data/vectors.json has read/write permissions.";
      default:
        return "Inspect stack trace below for debugging context.";
    }
  }
}
