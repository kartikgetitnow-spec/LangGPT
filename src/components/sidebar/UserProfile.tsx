"use client";

import React, { useState, useRef, useEffect } from "react";
import { Settings, Sparkles, LogOut, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface UserProfileProps {
  onOpenSettings: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onOpenSettings }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { actualTheme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative p-2 border-t border-zinc-200 dark:border-zinc-800" ref={dropdownRef}>
      {/* User row trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
        type="button"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
          K
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            Kartik
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Free Plan
          </div>
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-16 left-2 right-2 rounded-2xl bg-white dark:bg-[#282828] border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 p-1.5 space-y-1 text-xs">
          <button
            onClick={() => {
              toggleTheme();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            {actualTheme === "dark" ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Switch to Light mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-purple-500" />
                <span>Switch to Dark mode</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              onOpenSettings();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <div className="my-1 border-t border-zinc-200 dark:border-zinc-700/60" />

          <button
            onClick={() => {
              alert("Upgrade to Plus modal demo");
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>Upgrade plan</span>
          </button>

          <button
            onClick={() => {
              alert("Logged out demo");
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
};
