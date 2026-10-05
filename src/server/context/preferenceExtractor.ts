/**
 * ==============================================================================
 * AUTOMATIC USER PREFERENCE EXTRACTOR
 * ==============================================================================
 * Analyzes conversational turns in the background to automatically identify and
 * save explicit user preferences into the local database.
 * 
 * DESIGN PRINCIPLES:
 * - Asynchronous & Non-blocking: Runs in the background AFTER the chat response
 *   has streamed so the user experience is lightning fast with zero latency penalty.
 * - Selective & Conservative: Only extracts clear, durable user preferences
 *   (e.g., tech stack, name, coding style, tone, constraints).
 */

import { localContextDb } from "../db/localDb";
import { ModelFactory } from "../models/modelFactory";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class PreferenceExtractor {
  /**
   * Fast heuristic pattern checks for explicit preference declarations.
   */
  private static extractWithPatterns(userText: string): string[] {
    const preferences: string[] = [];
    const text = userText.trim();

    // Check for "call me [Name]" or "my name is [Name]"
    const nameMatch = text.match(/(?:call me|my name is|i am)\s+([A-Z][a-z]+)/i);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1];
      if (!["a", "an", "the", "not", "just", "here"].includes(name.toLowerCase())) {
        preferences.push(`User's name is ${name}`);
      }
    }

    // Check for "i prefer [XYZ]" or "i always prefer [XYZ]"
    const preferMatch = text.match(/(?:i prefer|i like to use|my preferred stack is)\s+([^.!?\n]+)/i);
    if (preferMatch && preferMatch[1] && preferMatch[1].length < 80) {
      preferences.push(`Prefers: ${preferMatch[1].trim()}`);
    }

    // Check for "always [do XYZ]" or "never [do XYZ]"
    const constraintMatch = text.match(/(?:always|never|please keep answers)\s+([^.!?\n]{8,80})/i);
    if (constraintMatch && constraintMatch[0]) {
      preferences.push(constraintMatch[0].trim());
    }

    return preferences;
  }

  /**
   * Main entrypoint: Extracts preferences from the user's message and saves to localdb.
   */
  static async extractAndSave(userMessage: string, assistantReply?: string): Promise<void> {
    if (!userMessage || userMessage.trim().length < 5) return;

    try {
      // 1. First run fast regex heuristic check
      const heuristicMatches = this.extractWithPatterns(userMessage);
      for (const pref of heuristicMatches) {
        await localContextDb.addLearnedPreference(pref);
      }

      // 2. If the message appears to contain personal info/directives, use Gemini to extract clean statements
      const hasIndicators = /(prefer|call me|my name|i work as|always|never|i use|i develop in|my stack)/i.test(
        userMessage
      );

      if (hasIndicators) {
        try {
          const llm = ModelFactory.createGeminiModel({
            modelName: "gemini-2.5-flash",
            temperature: 0.1,
          });

          const extractionPrompt = [
            new SystemMessage(
              "You are an AI context memory extractor. Analyze the user's message. " +
              "If the user explicitly shares a personal preference, name, tech stack, or instruction about how they like answers formatted, extract it as a single concise fact (e.g. 'Prefers TypeScript over Python', 'User's name is Alex'). " +
              "If NO user preference is stated, reply with exactly 'NONE'. Output ONLY the fact or 'NONE'."
            ),
            new HumanMessage(userMessage),
          ];

          const response = await llm.invoke(extractionPrompt);
          const extractedText = typeof response.content === "string" ? response.content.trim() : "";

          if (extractedText && extractedText !== "NONE" && !extractedText.includes("NONE") && extractedText.length < 120) {
            await localContextDb.addLearnedPreference(extractedText);
          }
        } catch (llmErr) {
          // Heuristic pattern extraction already succeeded, log LLM error silently
          console.warn("LLM preference extraction skipped:", llmErr);
        }
      }
    } catch (err) {
      console.error("Error in PreferenceExtractor.extractAndSave:", err);
    }
  }
}
