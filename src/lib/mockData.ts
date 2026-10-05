import { AIModel, Conversation, PromptSuggestion } from "@/types/chat";

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    description: "Fast, versatile, and multimodal with high-speed response times",
    badge: "Flash",
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    description: "Best for complex reasoning, code architecture, math, and deep analysis",
    badge: "Pro",
    isNew: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Next-generation model optimized for ultra-low latency and tool calling",
    badge: "Next-Gen",
    isNew: true,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "OpenAI flagship omni-model for general tasks",
    badge: "Omni",
  },
];

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  {
    id: "1",
    title: "Create a plan",
    subtitle: "organize projects and milestones",
    prompt: "Help me create a step-by-step project plan with clear milestones and deliverables.",
    iconName: "Activity",
  },
  {
    id: "2",
    title: "Brainstorm ideas",
    subtitle: "explore fresh angles and concepts",
    prompt: "Brainstorm innovative ideas and concepts for my new project.",
    iconName: "Lightbulb",
  },
  {
    id: "3",
    title: "Write code",
    subtitle: "generate functions or debug issues",
    prompt: "Write a clean, modular code implementation with error handling.",
    iconName: "Code",
  },
  {
    id: "4",
    title: "Summarize text",
    subtitle: "extract key points and insights",
    prompt: "Summarize this topic into concise, high-level takeaways.",
    iconName: "BookOpen",
  },
];

// Clean empty initial conversations
export const INITIAL_CONVERSATIONS: Conversation[] = [];
