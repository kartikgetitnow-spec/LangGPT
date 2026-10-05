/**
 * ==============================================================================
 * STEP 5: MODEL FACTORY (LLM PROVIDER ABSTRACTION)
 * ==============================================================================
 * Encapsulates the instantiation and configuration of AI models.
 * 
 * WHY USE A FACTORY?
 * - Decouples model initialization parameters (temperature, tokens, keys) from request handlers.
 * - Allows seamless switching between Gemini 2.5 Flash, Gemini 2.5 Pro, or future models.
 * - Enables easy addition of multi-provider routing (e.g. Gemini + OpenAI + Anthropic + Ollama)
 *   in a single centralized file.
 */

import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getServerConfig } from "../config/env";

export interface ModelOptions {
  modelName?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export class ModelFactory {
  /**
   * Resolves the proper Google Gemini model name based on client selection.
   */
  static resolveModelName(requested?: string): string {
    if (!requested) return "gemini-2.5-flash";

    const normalized = requested.toLowerCase();

    if (normalized.includes("pro")) {
      return "gemini-2.5-pro";
    }
    if (normalized.includes("2.5") || normalized.includes("latest")) {
      return requested;
    }
    if (normalized.includes("flash")) {
      return "gemini-2.5-flash";
    }

    return "gemini-2.5-flash";
  }

  /**
   * Creates a configured ChatGoogleGenerativeAI instance.
   */
  static createGeminiModel(options?: ModelOptions): ChatGoogleGenerativeAI {
    const config = getServerConfig();

    if (!config.googleApiKey) {
      throw new Error(
        "Google API Key is missing. Please set GOOGLE_API_KEY in your .env.local file."
      );
    }

    const resolvedModelName = this.resolveModelName(options?.modelName || config.defaultModel);

    return new ChatGoogleGenerativeAI({
      model: resolvedModelName,
      apiKey: config.googleApiKey,
      temperature: options?.temperature ?? config.defaultTemperature,
      maxOutputTokens: options?.maxOutputTokens ?? config.maxOutputTokens,
    });
  }
}
