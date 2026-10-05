"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Moon,
  Sun,
  Monitor,
  Settings,
  Database,
  Trash2,
  Download,
  Info,
  Check,
  Brain,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllChats?: () => void;
  conversationsData?: unknown;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onClearAllChats,
  conversationsData,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"general" | "context" | "backend" | "data" | "about">("general");

  // Narrative Profile & Context State
  const [profileText, setProfileText] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Backend URL state
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000/api/chat");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch narrative profile from localdb on open
  useEffect(() => {
    if (isOpen) {
      fetch("/api/context")
        .then((res) => res.json())
        .then((data) => {
          if (data && typeof data.profileText === "string") {
            setProfileText(data.profileText);
            setUpdatedAt(data.updatedAt || null);
          }
        })
        .catch((err) => console.error("Error loading profile context:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveProfile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileText }),
      });

      if (res.ok) {
        const data = await res.json();
        setProfileText(data.profileText);
        setUpdatedAt(data.updatedAt);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleClearProfile = async () => {
    if (!confirm("Are you sure you want to clear your entire profile memory?")) return;
    try {
      const res = await fetch("/api/context", { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setProfileText(data.profileText || "");
        setUpdatedAt(data.updatedAt);
      }
    } catch (err) {
      console.error("Failed to clear profile memory:", err);
    }
  };

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(conversationsData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `langgpt_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="sm:w-48 p-3 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-zinc-800 space-y-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === "general"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Settings className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab("context")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === "context"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Brain className="w-4 h-4 text-purple-400" />
              Memory & Context
            </button>
            <button
              onClick={() => setActiveTab("backend")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === "backend"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Database className="w-4 h-4 text-emerald-400" />
              Backend API
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === "data"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Data Controls
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors cursor-pointer ${
                activeTab === "about"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Info className="w-4 h-4 text-blue-400" />
              About
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm">
            {/* General Tab */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Theme</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Choose how the LangGPT interface looks to you.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        theme === "dark"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Moon className="w-5 h-5" />
                      Dark
                    </button>
                    <button
                      onClick={() => setTheme("light")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        theme === "light"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Sun className="w-5 h-5" />
                      Light
                    </button>
                    <button
                      onClick={() => setTheme("system")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        theme === "system"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                          : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      <Monitor className="w-5 h-5" />
                      System
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Narrative Paragraph Memory & Context Tab */}
            {activeTab === "context" && (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      Memory & Narrative Profile
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Auto-Updated by LLM
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    This is your living context paragraph. Whenever you share saveable preferences or background details during chat, the LLM automatically synthesizes and updates this paragraph in the local database.
                  </p>
                </div>

                {/* Narrative Profile Paragraph Box */}
                <form onSubmit={handleSaveProfile} className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={profileText}
                      onChange={(e) => setProfileText(e.target.value)}
                      placeholder="e.g. Kartik is a software engineer who specializes in Next.js and TypeScript. He prefers clean, modular code with descriptive comments and uses Tailwind CSS v4 for styling. He likes concise and direct answers without unnecessary boilerplate."
                      rows={6}
                      className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-[13.5px] leading-relaxed text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-purple-400 dark:focus:border-purple-400 transition-all resize-y shadow-xs"
                    />
                  </div>

                  {updatedAt && (
                    <div className="text-[11px] text-zinc-400 flex items-center justify-between px-1">
                      <span>Last updated: {new Date(updatedAt).toLocaleString()}</span>
                      <span>{profileText.length} characters</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Saved to Local DB!</span>
                        </>
                      ) : (
                        <span>Save Paragraph</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearProfile}
                      className="text-xs text-rose-500 hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear Profile Memory
                    </button>
                  </div>
                </form>

                {/* How it works info card */}
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300 leading-relaxed space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    How Context Learning Works
                  </div>
                  <p className="text-[11.5px] opacity-90">
                    Whenever you mention personal details, working habits, preferred frameworks, or guidelines in any chat turn (e.g. <em>&quot;I code in Go&quot;</em>, <em>&quot;Call me Alex&quot;</em>, <em>&quot;Keep answers brief&quot;</em>), the backend asks Gemini to evaluate if the information is saveable and smoothly integrates it into this narrative paragraph.
                  </p>
                </div>
              </div>
            )}

            {/* Backend API Tab */}
            {activeTab === "backend" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Backend Integration Hook
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Your backend API runs inside{" "}
                    <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[11px]">
                      src/app/api/chat/route.ts
                    </code>{" "}
                    powered by LangChain and Google Gemini.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Endpoint URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={backendUrl}
                      onChange={(e) => setBackendUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-900 dark:text-zinc-100 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xs font-medium transition-colors"
                    >
                      {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : "Save"}
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Profile memory is persistently saved in <code className="font-mono">data/context_db.json</code>.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                  ✓ LangChain Google Gemini streaming with dynamic Local DB narrative profile memory is active!
                </div>
              </div>
            )}

            {/* Data Controls Tab */}
            {activeTab === "data" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Export Chat Data
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Download all your conversations as a JSON file.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Export all conversations
                  </button>
                </div>

                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-medium text-rose-600 dark:text-rose-400 mb-1">
                    Delete All Conversations
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Permanently delete all chats from local storage.
                  </p>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete all conversations? This cannot be undone.")) {
                        onClearAllChats?.();
                        onClose();
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete all chats
                  </button>
                </div>
              </div>
            )}

            {/* About Tab */}
            {activeTab === "about" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  LangGPT (Next.js 16 + LangChain + Gemini)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Engineered with pixel-perfect attention to modern AI UI patterns, powered by
                  LangChain TypeScript, Google Gemini 2.5 streaming, multi-turn session memory, and
                  Local DB dynamic narrative context awareness.
                </p>
                <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  Version 1.4.0 • LangGPT Active
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
