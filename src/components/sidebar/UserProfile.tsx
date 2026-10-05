"use client";

/**
 * ==============================================================================
 * SIDEBAR USER PROFILE
 * ==============================================================================
 * Displays authenticated user information (Google / GitHub / Email), avatar,
 * plan status, and provides actions to open Auth modal, Settings, or Sign out.
 */

import React, { useState, useRef, useEffect } from "react";
import { Settings, LogOut, Sun, Moon, LogIn } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "@/context/ThemeContext";

interface UserProfileProps {
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ onOpenSettings, onOpenAuth }) => {
  const { data: session, status } = useSession();
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

  // Loading skeleton state
  if (status === "loading") {
    return (
      <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
        <div className="w-full flex items-center gap-3 p-2 rounded-xl animate-pulse">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
            <div className="h-2.5 w-14 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated: Show Sign In button
  if (!session?.user) {
    return (
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onOpenAuth}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-medium text-xs transition-colors shadow-xs cursor-pointer"
          type="button"
        >
          <LogIn className="w-4 h-4" />
          <span>Log in or Sign up</span>
        </button>
      </div>
    );
  }

  const user = session.user;
  const initial = (user.name || user.email || "U").charAt(0).toUpperCase();

  return (
    <div className="relative p-2 border-t border-zinc-200 dark:border-zinc-800" ref={dropdownRef}>
      {/* User row trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors text-left cursor-pointer"
        type="button"
      >
        {user.image ? (
          <img
            src={user.image}
            alt={user.name || "Avatar"}
            className="w-8 h-8 rounded-full object-cover shadow-xs border border-zinc-300 dark:border-zinc-700"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {user.name || user.email?.split("@")[0] || "User"}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            {user.email || "LangGPT Member"}
          </div>
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-16 left-2 right-2 rounded-2xl bg-white dark:bg-[#282828] border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 p-1.5 space-y-1 text-xs">
          {/* User Email Banner */}
          <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700/60 mb-1">
            <p className="text-[11px] text-zinc-400 font-medium truncate">Signed in as</p>
            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">{user.email}</p>
          </div>

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
              setIsOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      )}
    </div>
  );
};
