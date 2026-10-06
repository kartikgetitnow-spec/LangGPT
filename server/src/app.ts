import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import dotenv from "dotenv";

// Load server-specific environment variables (server/.env)
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: ".env.local" });
dotenv.config();

import chatRoutes from "./routes/chatRoutes";
import conversationRoutes from "./routes/conversationRoutes";
import contextRoutes from "./routes/contextRoutes";
import authRoutes from "./routes/authRoutes";
import ragRoutes from "./routes/ragRoutes";
import voiceRoutes from "./routes/voiceRoutes";
import errorRoutes from "./routes/errorRoutes";
import { DiagnosticService } from "./services/diagnosticService";

export const app = express();

// Enable CORS for Next.js frontend, public IP, and Vercel deployments
app.use(
  cors({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Root Public Endpoint
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "LangGPT Node.js Backend Server",
    message: "LangGPT Backend API is live and publicly accessible.",
    endpoints: {
      health: "/health",
      diagnostics_and_errors: "/error",
      chat: "/api/chat",
      conversations: "/api/conversations",
      context: "/api/context",
      auth: "/api/auth",
      rag: "/api/rag",
      voice: "/api/voice",
    },
    timestamp: new Date().toISOString(),
  });
});

// Health Check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "LangGPT Node.js Backend Server",
    timestamp: new Date().toISOString(),
  });
});

// Mount Error & Diagnostic Routes
app.use("/error", errorRoutes);
app.use("/api/error", errorRoutes);

// Mount API routes
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/context", contextRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/rag", ragRoutes);
app.use("/api/voice", voiceRoutes);

// Global Error Handler Middleware
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorObj = err instanceof Error ? err : new Error(String(err));
  console.error("Unhandled Backend Exception:", errorObj);

  DiagnosticService.logError({
    category: "SYSTEM",
    severity: "CRITICAL",
    message: errorObj.message || "Unhandled server error",
    error: errorObj,
    endpoint: req.originalUrl || req.url,
    method: req.method,
    ip: (req.headers["x-forwarded-for"] as string) || req.ip,
  });

  if (!res.headersSent) {
    res.status(500).json({
      error: "Internal Server Error",
      message: errorObj.message || "An unexpected error occurred on the LangGPT backend.",
    });
  }
});

// Fallback 404
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found on LangGPT backend." });
});
