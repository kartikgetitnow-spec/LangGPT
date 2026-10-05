/**
 * ==============================================================================
 * STEP 2: GLOBAL CONTEXT AWARENESS MANAGER
 * ==============================================================================
 * Manages overarching, cross-cutting context that applies to every conversation turn.
 * 
 * WHAT IS GLOBAL CONTEXT?
 * Unlike conversation-specific history (which is specific to a single chat thread),
 * Global Context provides the AI with:
 * 1. Persona & System Directives: Identity, tone, formatting standards.
 * 2. User Profile Awareness: User name, role, preferences, technical skill level.
 * 3. Environment & Temporal Awareness: Real-time date, active runtime environment.
 * 
 * HOW TO SCALE IN THE FUTURE:
 * - Load user preferences dynamically from a database (e.g., PostgreSQL, Supabase).
 * - Inject enterprise knowledge or RAG (Retrieval-Augmented Generation) document summaries.
 */

export interface UserContext {
  userName?: string;
  preferredLanguage?: string;
  codingStylePreference?: string;
  tone?: "concise" | "detailed" | "instructive";
}

export interface SystemDirectives {
  assistantName: string;
  role: string;
  rules: string[];
}

export interface GlobalContextState {
  system: SystemDirectives;
  user: UserContext;
}

// In-memory global state default (can be updated or fetched from DB per request)
const defaultGlobalState: GlobalContextState = {
  system: {
    assistantName: "ChatGPT",
    role: "A world-class, helpful, highly analytical, and versatile AI assistant.",
    rules: [
      "Always provide clear, accurate, and structured answers.",
      "Use GitHub-flavored markdown for all formatted content, lists, and tables.",
      "When outputting code, always declare the language tag on fences (e.g., ```typescript, ```python).",
      "Break complex explanations into logical, easy-to-read sections.",
      "Be proactive in suggesting optimal design patterns, best practices, and error handling.",
    ],
  },
  user: {
    userName: "Kartik",
    preferredLanguage: "TypeScript & Python",
    codingStylePreference: "Clean, modular, fully typed with descriptive comments",
    tone: "detailed",
  },
};

/**
 * Returns formatted global context instructions ready to be injected into system prompts.
 */
export function buildGlobalContextInstruction(customUserContext?: Partial<UserContext>): string {
  const user = { ...defaultGlobalState.user, ...customUserContext };
  const system = defaultGlobalState.system;

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
[GLOBAL SYSTEM DIRECTIVES]
You are ${system.assistantName}, ${system.role}
Current Date: ${currentDate}

Rules & Guidelines:
${system.rules.map((rule, idx) => `${idx + 1}. ${rule}`).join("\n")}

[GLOBAL USER CONTEXT]
- Active User: ${user.userName || "User"}
- Preferred Programming Language / Stack: ${user.preferredLanguage || "Standard"}
- Code Style: ${user.codingStylePreference || "Standard clean code"}
- Communication Style: ${user.tone || "informative and clear"}

Always tailor your explanations to align with the user's preferences without explicitly reciting this background unless requested.
`.trim();
}
