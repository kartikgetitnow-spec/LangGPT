"use client";

import React, { useState, useRef, useEffect, MouseEvent } from "react";
import { MessageSquare, MoreHorizontal, Pencil, Trash2, Pin, Check, X } from "lucide-react";
import { Conversation } from "@/types/chat";

interface ChatItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  onTogglePin?: () => void;
}

export const ChatItem: React.FC<ChatItemProps> = ({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const handleSaveRename = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (editTitle.trim()) {
      onRename(editTitle.trim());
    } else {
      setEditTitle(conversation.title);
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  const handleMenuClick = (e: MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  if (isEditing) {
    return (
      <form
        onSubmit={handleSaveRename}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="bg-transparent flex-1 outline-none text-zinc-900 dark:text-zinc-100 text-xs"
        />
        <button
          type="submit"
          className="p-1 hover:text-emerald-500 text-zinc-500"
          title="Save"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleCancelRename}
          className="p-1 hover:text-rose-500 text-zinc-500"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </form>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer select-none ${
        isActive
          ? "bg-zinc-200/80 dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 font-semibold"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-[#212121]/50"
      }`}
    >
      <MessageSquare className="w-4 h-4 text-zinc-500 flex-shrink-0" />

      <span className="flex-1 truncate">{conversation.title}</span>

      {conversation.isPinned && (
        <Pin className="w-3.5 h-3.5 text-zinc-400 rotate-45 flex-shrink-0" />
      )}

      {/* Options menu button (visible on hover or when active) */}
      <div className={`relative ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity`}>
        <button
          onClick={handleMenuClick}
          type="button"
          className="p-1 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>

        {showMenu && (
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 mt-1 w-36 rounded-xl bg-white dark:bg-[#282828] border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 p-1 text-xs"
          >
            {onTogglePin && (
              <button
                onClick={() => {
                  onTogglePin();
                  setShowMenu(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <Pin className="w-3.5 h-3.5" />
                <span>{conversation.isPinned ? "Unpin" : "Pin"}</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsEditing(true);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Rename</span>
            </button>

            <button
              onClick={() => {
                onDelete();
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
