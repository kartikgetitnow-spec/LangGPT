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
    title: "Create a workout routine",
    subtitle: "for beginners focusing on core & flexibility",
    prompt: "Design a 4-week home workout routine for a beginner focusing on core strength, mobility, and flexibility with no equipment needed.",
    iconName: "Activity",
  },
  {
    id: "2",
    title: "Brainstorm startup names",
    subtitle: "for an AI-powered developer tool",
    prompt: "Brainstorm 10 catchy, modern brand names for an AI-powered developer productivity tool, including domain name viability ideas and taglines.",
    iconName: "Lightbulb",
  },
  {
    id: "3",
    title: "Write a clean Python script",
    subtitle: "to scrape data and export to JSON",
    prompt: "Write a robust Python script using modern libraries (like httpx or requests with BeautifulSoup) to scrape and format structured data into JSON with error handling.",
    iconName: "Code",
  },
  {
    id: "4",
    title: "Summarize complex topic",
    subtitle: "explain quantum computing in simple terms",
    prompt: "Explain quantum computing and quantum superposition like I'm a 12-year-old, using intuitive analogies and everyday examples.",
    iconName: "BookOpen",
  },
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    title: "Next.js 16 App Architecture",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    modelId: "gpt-4o",
    messages: [
      {
        id: "m-1",
        role: "user",
        content: "What are the recommended folder structure patterns for a modern Next.js project with App Router?",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: "m-2",
        role: "assistant",
        content: `Here is a scalable and clean structure for a modern Next.js application using App Router:

\`\`\`bash
src/
├── app/                  # App Router: routes, pages, layouts, loading & error boundaries
│   ├── (auth)/           # Route grouping for login/register
│   ├── (dashboard)/      # Main application area
│   ├── api/              # Route handlers (REST / Webhooks)
│   ├── globals.css       # Tailwind & global design tokens
│   ├── layout.tsx        # Root HTML shell
│   └── page.tsx          # Landing / root route
├── components/           # Reusable UI components
│   ├── ui/               # Primitive design system components (Button, Modal, Input)
│   └── chat/             # Domain-specific components
├── hooks/                # Custom React hooks (useChat, useLocalStorage)
├── lib/                  # Utilities, helpers, and singleton clients
├── services/             # API client calls and backend integrations
└── types/                # TypeScript interface definitions
\`\`\`

### Key Highlights:
1. **Route Groups \`(group)\`**: Helps organize routes logically without affecting the URL path.
2. **Co-location**: Keep component styles, test files, and child components close to where they are used.
3. **App Router Conventions**: Take full advantage of \`loading.tsx\`, \`error.tsx\`, and Server Actions where appropriate!`,
        createdAt: new Date(Date.now() - 3600000 * 2 + 5000).toISOString(),
        model: "GPT-4o",
      },
    ],
  },
  {
    id: "conv-2",
    title: "TypeScript Utility Types & Generics",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    modelId: "gpt-4o",
    messages: [
      {
        id: "m-3",
        role: "user",
        content: "Can you give me examples of `Extract`, `Exclude`, and conditional types in TypeScript?",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "m-4",
        role: "assistant",
        content: `Certainly! Here are concise examples of TypeScript's built-in utility types and conditional types:

### 1. \`Exclude<T, U>\`
Removes types from \`T\` that are assignable to \`U\`.

\`\`\`typescript
type Status = "idle" | "loading" | "success" | "error";

// Exclude 'idle' and 'loading'
type SettledStatus = Exclude<Status, "idle" | "loading">;
// Result: "success" | "error"
\`\`\`

### 2. \`Extract<T, U>\`
Extracts types from \`T\` that are assignable to \`U\`.

\`\`\`typescript
type Event = 
  | { type: "click"; x: number; y: number }
  | { type: "hover"; element: string }
  | { type: "keydown"; key: string };

type MouseEvent = Extract<Event, { x: number }>;
// Result: { type: "click"; x: number; y: number }
\`\`\`

Let me know if you would like to explore template literal types or recursive mapped types!`,
        createdAt: new Date(Date.now() - 86400000 * 2 + 3000).toISOString(),
        model: "GPT-4o",
      },
    ],
  },
];
