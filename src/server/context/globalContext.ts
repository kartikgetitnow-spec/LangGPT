/**
 * ==============================================================================
 * STEP 2: GLOBAL CONTEXT AWARENESS MANAGER (DYNAMIC LOCAL DB BACKED)
 * ==============================================================================
 * Dynamically loads user preferences, system directives, and learned chat context
 * from the local database (`data/context_db.json`).
 * 
 * NO HARDCODED TEXT:
 * All user preferences, persona instructions, custom guidelines, and learned rules
 * are persisted in and queried from the local DB.
 */

import { localContextDb, UserPreferences } from "../db/localDb";

export interface GlobalContextState {
  assistantName: string;
  role: string;
  baseRules: string[];
}

const defaultSystemDirectives: GlobalContextState = {
  assistantName: "ChatGPT",
  role: "A world-class, helpful, highly analytical, and versatile AI assistant.",
  baseRules: [
    "Always provide clear, accurate, and structured answers.",
    "Use GitHub-flavored markdown for all formatted content, lists, and tables.",
    "When outputting code, always declare the language tag on fences (e.g., ```typescript, ```python).",
    "Break complex explanations into logical, easy-to-read sections.",
  ],
};

/**
 * Builds the complete dynamic system instruction from the local database.
 */
export async function buildGlobalContextInstructionAsync(
  overridePreferences?: Partial<UserPreferences>
): Promise<string> {
  const dbPreferences = await localContextDb.getPreferences();
  const preferences: UserPreferences = {
    ...dbPreferences,
    ...overridePreferences,
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sections: string[] = [];

  // 1. System Directives & Temporal Awareness
  sections.push(
    `[SYSTEM DIRECTIVES]\nYou are ${defaultSystemDirectives.assistantName}, ${defaultSystemDirectives.role}\nCurrent Date: ${currentDate}\n\nCore Guidelines:\n${defaultSystemDirectives.baseRules
      .map((r, idx) => `${idx + 1}. ${r}`)
      .join("\n")}`
  );

  // 2. User Preferences (Only included if configured)
  const userDetails: string[] = [];
  if (preferences.userName) {
    userDetails.push(`- User's Name: ${preferences.userName}`);
  }
  if (preferences.role) {
    userDetails.push(`- Role / Occupation: ${preferences.role}`);
  }
  if (preferences.preferredLanguages && preferences.preferredLanguages.length > 0) {
    userDetails.push(`- Preferred Languages / Stack: ${preferences.preferredLanguages.join(", ")}`);
  }
  if (preferences.codingStyle) {
    userDetails.push(`- Coding Style: ${preferences.codingStyle}`);
  }
  if (preferences.tone) {
    userDetails.push(`- Preferred Response Tone: ${preferences.tone}`);
  }

  if (userDetails.length > 0) {
    sections.push(`[USER PREFERENCES & CONTEXT]\n${userDetails.join("\n")}`);
  }

  // 3. User's Custom Instructions & Rules (from Settings)
  if (preferences.customRules && preferences.customRules.length > 0) {
    sections.push(
      `[USER CUSTOM INSTRUCTIONS]\n${preferences.customRules
        .map((rule, idx) => `${idx + 1}. ${rule}`)
        .join("\n")}`
    );
  }

  // 4. Automatically Learned Preferences (extracted from chat history)
  if (preferences.learnedPreferences && preferences.learnedPreferences.length > 0) {
    sections.push(
      `[LEARNED CONTEXT & USER TRAITS]\n${preferences.learnedPreferences
        .map((p, idx) => `• ${p}`)
        .join("\n")}`
    );
  }

  sections.push(
    "Tailor your explanations, tone, and code examples to naturally adhere to the above user context without explicitly reciting these rules unless requested."
  );

  return sections.join("\n\n").trim();
}
