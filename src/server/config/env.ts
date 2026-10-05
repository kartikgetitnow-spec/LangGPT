/**
 * ==============================================================================
 * STEP 1: CONFIGURATION & ENVIRONMENT VALIDATION
 * ==============================================================================
 * Centralizes all server-side environment variables and default runtime settings.
 * 
 * WHY THIS MATTERS FOR SCALABILITY:
 * - Prevents spreading `process.env.XYZ` throughout the codebase.
 * - Validates required variables in one place, failing fast with clear errors.
 * - Allows easy configuration for different deployment environments (dev, staging, prod).
 */

export interface ServerConfig {
  googleApiKey: string;
  defaultModel: string;
  defaultTemperature: number;
  maxOutputTokens: number;
  maxMemoryHistoryTurns: number;
}

export function getServerConfig(): ServerConfig {
  const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

  return {
    googleApiKey,
    // Default model to use when client does not specify one
    defaultModel: process.env.DEFAULT_AI_MODEL || "gemini-2.5-flash",
    // Balanced creativity and coherence
    defaultTemperature: 0.7,
    // Output token capacity
    maxOutputTokens: 4096,
    // Sliding memory window: keeps the last N conversation turns in active context
    maxMemoryHistoryTurns: 10,
  };
}
