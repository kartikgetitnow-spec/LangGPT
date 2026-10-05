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

export const app = express();

// Enable CORS for Next.js frontend (port 3000)
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health Check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "LangGPT Node.js Backend Server",
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use("/api/chat", chatRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/context", contextRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/rag", ragRoutes);

// Fallback 404
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found on LangGPT backend." });
});
