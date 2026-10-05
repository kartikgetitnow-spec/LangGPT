"use client";

import React from "react";
import { Conversation } from "@/types/chat";
import { ChatItem } from "./ChatItem";
import { groupConversationsByDate } from "@/lib/utils";

interface ChatHistoryProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onTogglePin?: (id: string) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  conversations,
  activeId,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onTogglePin,
}) => {
  const pinnedChats = conversations.filter((c) => c.isPinned);
  const unpinnedChats = conversations.filter((c) => !c.isPinned);
  const grouped = groupConversationsByDate(unpinnedChats);

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-xs text-zinc-400">
        No conversation history yet. Start a new chat!
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2">
      {/* Pinned Section */}
      {pinnedChats.length > 0 && (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-3 py-1">
            Pinned
          </div>
          {pinnedChats.map((c) => (
            <ChatItem
              key={c.id}
              conversation={c}
              isActive={c.id === activeId}
              onSelect={() => onSelectChat(c.id)}
              onDelete={() => onDeleteChat(c.id)}
              onRename={(title) => onRenameChat(c.id, title)}
              onTogglePin={onTogglePin ? () => onTogglePin(c.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Chronological Groups */}
      {grouped.map((group) => (
        <div key={group.label} className="space-y-1">
          <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 px-3 py-1">
            {group.label}
          </div>
          {group.items.map((c) => (
            <ChatItem
              key={c.id}
              conversation={c}
              isActive={c.id === activeId}
              onSelect={() => onSelectChat(c.id)}
              onDelete={() => onDeleteChat(c.id)}
              onRename={(title) => onRenameChat(c.id, title)}
              onTogglePin={onTogglePin ? () => onTogglePin(c.id) : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
