"use client";

/**
 * ==============================================================================
 * WELCOME SCREEN
 * ==============================================================================
 * Displays greeting and starter prompt cards.
 * If user is unauthenticated, prompts them to log in before starting.
 */

import React from "react";
import { useSession } from "next-auth/react";
import { PROMPT_SUGGESTIONS } from "@/lib/mockData";
import { Sparkles, Code, Lightbulb, Activity, BookOpen, LucideIcon } from "lucide-react";

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string) => void;
  onOpenAuth?: () => void;
}

const iconMap: { [key: string]: LucideIcon } = {
  Activity,
  Lightbulb,
  Code,
  BookOpen,
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectPrompt, onOpenAuth }) => {
  const { data: session } = useSession();

  const handleCardClick = (promptText: string) => {
    if (!session?.user) {
      onOpenAuth?.();
      return;
    }
    onSelectPrompt(promptText);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 max-w-3xl mx-auto w-full text-center my-auto">
      {/* LangGPT Icon */}
      <div className="mb-4 sm:mb-6 mt-2 sm:mt-0 relative group">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shadow-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
          <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>

      {/* Main Title */}
      <h1 className="text-xl sm:text-3xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6 sm:mb-8 tracking-tight">
        What can I help with today?
      </h1>

      {/* 4 Prompt Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-2xl text-left">
        {PROMPT_SUGGESTIONS.map((item) => {
          const IconComponent = iconMap[item.iconName] || Sparkles;
          return (
            <button
              key={item.id}
              onClick={() => handleCardClick(item.prompt)}
              className="flex items-start gap-3 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white/50 dark:bg-zinc-900/40 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60 transition-all text-left group shadow-xs cursor-pointer touch-manipulation active:scale-[0.98]"
            >
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1">
                  {item.title}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                  {item.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
