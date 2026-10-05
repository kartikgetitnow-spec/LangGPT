"use client";

import React, { useState } from "react";
import { X, Moon, Sun, Monitor, Settings, Database, Trash2, Download, Info, Check } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"general" | "backend" | "data" | "about">("general");
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000/api/chat");
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(conversationsData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chatgpt_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Navigation Tabs */}
          <div className="sm:w-44 p-3 border-b sm:border-b-0 sm:border-r border-zinc-200 dark:border-zinc-800 space-y-1">
            <button
              onClick={() => setActiveTab("general")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === "general"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Settings className="w-4 h-4" />
              General
            </button>
            <button
              onClick={() => setActiveTab("backend")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === "backend"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Database className="w-4 h-4" />
              Backend API
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === "data"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Data Controls
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                activeTab === "about"
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <Info className="w-4 h-4" />
              About
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm">
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">Theme</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Choose how the ChatGPT interface looks to you.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setTheme("dark")}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
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
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
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
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
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

            {activeTab === "backend" && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Backend Integration Hook
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    You can easily connect your backend (FastAPI, Express, LangGraph, etc.) in{" "}
                    <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 font-mono text-[11px]">
                      src/services/chatService.ts
                    </code>
                    .
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
                    Set <code className="font-mono">NEXT_PUBLIC_BACKEND_URL</code> in your <code className="font-mono">.env.local</code>.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                  ✓ Streaming simulation is active out-of-the-box so you can test all UI features right now!
                </div>
              </div>
            )}

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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-900 dark:text-zinc-100 transition-colors"
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
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete all chats
                  </button>
                </div>
              </div>
            )}

            {activeTab === "about" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  ChatGPT Frontend Clone (Next.js 16 + React 19)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Engineered with pixel-perfect attention to OpenAI ChatGPT&apos;s UI patterns, including
                  collapsible sidebar, model selector, prompt cards, token-by-token streaming,
                  syntax highlighted code blocks with one-click copy, and multi-file attachments.
                </p>
                <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  Version 1.0.0 • Ready for backend integration
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
