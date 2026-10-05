export type Role = "user" | "assistant" | "system";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
  model?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  modelId: string;
  isPinned?: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  badge?: string;
  icon?: string;
  isNew?: boolean;
}

export interface PromptSuggestion {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
  iconName: string;
}
