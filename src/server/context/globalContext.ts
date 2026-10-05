/**
 * ==============================================================================
 * STEP 2: GLOBAL CONTEXT AWARENESS (PARAGRAPH-BASED PROFILE)
 * ==============================================================================
 * Injects the living narrative user profile from PostgreSQL / localContextDb into the system
 * prompt for full global awareness, scoped per user.
 */

import { localContextDb } from "../db/localDb";

/**
 * Builds the complete dynamic system prompt instruction.
 */
export async function buildGlobalContextInstructionAsync(
  overrideProfile?: string,
  userId?: string
): Promise<string> {
  const profileState = await localContextDb.getProfile(userId);
  const profile = overrideProfile !== undefined ? overrideProfile : profileState.profileText;

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sections: string[] = [
    `[SYSTEM DIRECTIVES]
You are LangGPT, a world-class, helpful, and highly analytical AI assistant.
Current Date: ${currentDate}

Core Guidelines:
1. Always provide clear, accurate, and structured answers.
2. Use GitHub-flavored markdown for all formatted content, lists, and tables.
3. When outputting code, always declare the language tag on fences (e.g., \`\`\`typescript, \`\`\`python).
4. Break complex explanations into logical, easy-to-read sections.`,
  ];

  // Inject natural paragraph profile
  if (profile && profile.trim()) {
    sections.push(
      `[USER PROFILE & CONTEXT MEMORY]
${profile.trim()}

Guidelines for Personalization:
- Keep the user's profile and preferences in mind for all answers.
- Tailor your code examples and recommendations to their tech stack and preferred style.
- Do NOT explicitly repeat or recite this profile back to the user unless they ask.`
    );
  }

  return sections.join("\n\n").trim();
}
