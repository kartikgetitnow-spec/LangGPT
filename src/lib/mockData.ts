import { AIModel, Conversation, PromptSuggestion } from "@/types/chat";

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Great for most tasks, smart and fast with vision and reasoning",
    badge: "Omni",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    description: "Fastest and lightweight model for everyday tasks",
    badge: "Fast",
  },
  {
    id: "o1-preview",
    name: "o1-preview",
    description: "Advanced reasoning for complex math, science, and coding",
    badge: "Reasoning",
    isNew: true,
  },
  {
    id: "o1-mini",
    name: "o1-mini",
    description: "Faster reasoning model especially adept at coding tasks",
    badge: "Reasoning",
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

// Clean empty initial conversations (no hardcoded chat history)
export const INITIAL_CONVERSATIONS: Conversation[] = [];
