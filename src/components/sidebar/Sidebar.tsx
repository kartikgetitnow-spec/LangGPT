"use client";

import React, { useState } from "react";
import {
  PanelLeftClose,
  PanelLeft,
  SquarePen,
  Search,
  Sparkles,
  Compass,
} from "lucide-react";
import { Conversation } from "@/types/chat";
import { ChatHistory } from "./ChatHistory";
import { UserProfile } from "./UserProfile";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onTogglePin?: (id: string) => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  isOpen,
  onToggle,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
  onOpenSettings,
  onOpenAuth,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : conversations;

  const handleNewChat = () => {
    onNewChat();
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          onTouchEnd={(e) => {
            e.preventDefault();
            onToggle();
          }}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity cursor-pointer touch-manipulation"
          role="button"
          tabIndex={0}
          aria-label="Close sidebar backdrop"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-30 flex flex-col w-[280px] sm:w-[260px] bg-zinc-50 dark:bg-[#171717] border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none touch-manipulation ${
          isOpen ? "translate-x-0" : "-translate-x-full md:-ml-[260px]"
        }`}
      >
        {/* Header Actions */}
        <div className="p-3 flex items-center justify-between border-b border-transparent">
          <button
            onClick={onToggle}
            className="p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            title="Close sidebar"
            type="button"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsSearching(!isSearching)}
              className="p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title="Search chats"
              type="button"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={handleNewChat}
              className="p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title="New chat"
              type="button"
            >
              <SquarePen className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search input bar if toggled */}
        {isSearching && (
          <div className="px-3 pb-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/70 border border-zinc-300 dark:border-zinc-700 text-xs">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                autoFocus
                className="bg-transparent flex-1 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-xs"
              />
            </div>
          </div>
        )}

        {/* New Chat Primary Button */}
        <div className="px-3 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-200/70 dark:hover:bg-zinc-800/70 text-zinc-800 dark:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
            type="button"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Sparkles className="w-3 h-3 fill-current" />
            </div>
            <span className="flex-1 text-left">LangGPT</span>
            <SquarePen className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Explore GPTs Shortcut */}
        <div className="px-3 pb-2">
          <button
            onClick={() => alert("Explore GPTs demo")}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors cursor-pointer"
            type="button"
          >
            <Compass className="w-4 h-4 text-zinc-500" />
            <span>Explore GPTs</span>
          </button>
        </div>

        {/* Conversations History List */}
        <ChatHistory
          conversations={filteredConversations}
          activeId={activeId}
          onSelectChat={(id) => {
            onSelectChat(id);
            if (window.innerWidth < 768) {
              onToggle(); // Close sidebar on mobile
            }
          }}
          onDeleteChat={onDeleteChat}
          onRenameChat={onRenameChat}
          onTogglePin={onTogglePin}
        />

        {/* Bottom User Profile */}
        <UserProfile onOpenSettings={onOpenSettings} onOpenAuth={onOpenAuth} />
      </aside>
    </>
  );
};
