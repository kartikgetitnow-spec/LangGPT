/**
 * ==============================================================================
 * LLM-DRIVEN PROFILE & MEMORY UPDATER
 * ==============================================================================
 * Asks the LLM after each chat turn whether there is any new saveable information
 * or user preference to integrate into the user's living profile paragraph.
 * 
 * Flow:
 * 1. Reads the current narrative profile from `localContextDb`.
 * 2. Prompts Gemini with the current profile + the latest interaction.
 * 3. If saveable info is found, Gemini rewrites the profile paragraph smoothly.
 * 4. Saves the updated paragraph back into `localContextDb`.
 * 5. If no saveable info, returns "NO_CHANGE" without modifying the database.
 */

import { localContextDb } from "../db/localDb";
import { ModelFactory } from "../models/modelFactory";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export class ProfileUpdater {
  /**
   * Analyzes the conversation turn in the background and updates the user profile paragraph.
   */
  static async evaluateAndUpdate(userMessage: string, assistantReply?: string): Promise<void> {
    if (!userMessage || userMessage.trim().length < 5) return;

    try {
      const currentProfileState = await localContextDb.getProfile();
      const currentProfile = currentProfileState.profileText || "";

      // Quick filter: If message is clearly generic greeting with no content, skip LLM call
      if (/^(hi|hello|hey|test|ping)$/i.test(userMessage.trim())) {
        return;
      }

      const llm = ModelFactory.createGeminiModel({
        modelName: "gemini-2.5-flash",
        temperature: 0.1,
      });

      const prompt = [
        new SystemMessage(
          `You are an intelligent memory synthesizer for an AI assistant.
Your task is to maintain a natural, coherent 3rd-person profile paragraph about the user.

CURRENT USER PROFILE:
"""
${currentProfile || "(No profile saved yet)"}
"""

TASK:
Determine if the user shared any durable personal details, background, role, tech stack, preferences, or working style that should be remembered in their profile paragraph (e.g. "I work as...", "I use...", "Call me...", "I prefer...").

CRITICAL RULES:
1. If the user shared saveable information:
   Rewrite and synthesize the profile as a single, natural, cohesive 3rd-person paragraph (e.g. "Kartik is a software engineer who...").
   Keep it concise, clear, and relevant (maximum 2 to 4 sentences).
   Output ONLY the updated paragraph. No introductory phrases, no quotes, no conversational filler.
2. If the user shared NO new personal details or preferences:
   Output EXACTLY "NO_CHANGE".`
        ),
        new HumanMessage(
          `User said: "${userMessage}"\nAssistant replied: "${assistantReply || ""}"`
        ),
      ];

      const response = await llm.invoke(prompt);
      const text = typeof response.content === "string" ? response.content.trim() : "";

      // If Gemini synthesized an updated paragraph, save it to the local database!
      if (
        text &&
        text !== "NO_CHANGE" &&
        !text.includes("NO_CHANGE") &&
        text.length >= 10 &&
        text.length <= 800
      ) {
        console.log("[ProfileUpdater] Updated user profile paragraph in localdb:", text);
        await localContextDb.updateProfile(text);
      }
    } catch (err) {
      console.warn("[ProfileUpdater] Background profile update skipped:", err);
    }
  }
}
