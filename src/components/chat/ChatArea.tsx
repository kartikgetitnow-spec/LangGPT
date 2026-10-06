"use client";

import React, { useState } from "react";
import { PanelLeft, SquarePen, Share, ShieldAlert, Radio } from "lucide-react";
import { Conversation, Attachment } from "@/types/chat";
import { ModelSelector } from "./ModelSelector";
import { MessageList } from "./MessageList";
import { WelcomeScreen } from "./WelcomeScreen";
import { ChatInput } from "./ChatInput";

interface ChatAreaProps {
  conversation: Conversation | null;
  selectedModel: string;
  isGenerating: boolean;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSelectModel: (modelId: string) => void;
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  onStopGeneration: () => void;
  onRegenerateLast: () => void;
  onNewChat: () => void;
  onOpenAuth: () => void;
  onOpenVoiceModal?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  selectedModel,
  isGenerating,
  isSidebarOpen,
  onToggleSidebar,
  onSelectModel,
  onSendMessage,
  onStopGeneration,
  onRegenerateLast,
  onNewChat,
  onOpenAuth,
  onOpenVoiceModal,
}) => {
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>();
  const [isTemporaryChat, setIsTemporaryChat] = useState(false);

  const messages = conversation?.messages || [];
  const hasMessages = messages.length > 0;

  const handleSelectPrompt = (promptText: string) => {
    setSelectedPrompt(promptText);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: conversation?.title || "LangGPT Conversation",
          text: `Check out this conversation: ${conversation?.title}`,
          url: window.location.href,
        });
      } catch {
        // ignore
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("Conversation link copied to clipboard!");
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-white dark:bg-[#212121] overflow-hidden relative">
      {/* Top Header Bar */}
      <header className="h-14 flex items-center justify-between px-4 z-10 border-b border-transparent">
        {/* Left: Sidebar Toggle & Model Selector */}
        <div className="flex items-center gap-2">
          {!isSidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer touch-manipulation"
              title="Open sidebar"
              type="button"
            >
              <PanelLeft className="w-5 h-5" />
            </button>
          )}

          <ModelSelector
            selectedModelId={selectedModel}
            onSelectModel={onSelectModel}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Temporary Chat indicator */}
          {isTemporaryChat && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Temporary Chat</span>
            </div>
          )}

          {/* Gemini Live Voice Mode Header Button */}
          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-all cursor-pointer shadow-xs touch-manipulation"
              title="Activate Gemini Live Voice AI"
              type="button"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">Live Voice</span>
            </button>
          )}

          {hasMessages && (
            <button
              onClick={handleShare}
              className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer touch-manipulation"
              title="Share chat"
              type="button"
            >
              <Share className="w-4 h-4" />
            </button>
          )}

          {!isSidebarOpen && (
            <button
              onClick={onNewChat}
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer touch-manipulation"
              title="New chat"
              type="button"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Conversation Feed or Welcome Empty State */}
      <div className="flex-1 flex flex-col overflow-y-auto relative overscroll-contain">
        {hasMessages ? (
          <MessageList
            messages={messages}
            onRegenerateLast={onRegenerateLast}
          />
        ) : (
          <WelcomeScreen
            onSelectPrompt={handleSelectPrompt}
            onOpenAuth={onOpenAuth}
          />
        )}
      </div>

      {/* Floating Prompt Input Box */}
      <ChatInput
        onSendMessage={onSendMessage}
        isGenerating={isGenerating}
        onStopGeneration={onStopGeneration}
        inputPrompt={selectedPrompt}
        onClearInputPrompt={() => setSelectedPrompt(undefined)}
        onOpenAuth={onOpenAuth}
        onOpenVoiceModal={onOpenVoiceModal}
      />
    </main>
  );
};
