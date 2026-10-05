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
  Plus,
  Sparkles,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAllChats?: () => void;
  conversationsData?: unknown;
}

interface ContextPreferences {
  userName: string;
  role: string;
  preferredLanguages: string[];
  codingStyle: string;
  tone: string;
  customRules: string[];
  learnedPreferences: string[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onClearAllChats,
  conversationsData,
}) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<"general" | "context" | "backend" | "data" | "about">("general");

  // Context Awareness State
  const [contextData, setContextData] = useState<ContextPreferences>({
    userName: "",
    role: "",
    preferredLanguages: [],
    codingStyle: "",
    tone: "informative and balanced",
    customRules: [],
    learnedPreferences: [],
  });
  const [languagesInput, setLanguagesInput] = useState("");
  const [newRuleInput, setNewRuleInput] = useState("");
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Backend URL state
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000/api/chat");
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Fetch context from localdb on open
  useEffect(() => {
    if (isOpen) {
      fetch("/api/context")
        .then((res) => res.json())
        .then((data: ContextPreferences) => {
          if (data) {
            setContextData(data);
            setLanguagesInput(data.preferredLanguages ? data.preferredLanguages.join(", ") : "");
          }
        })
        .catch((err) => console.error("Error loading context preferences:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSavePreferences = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsSavingContext(true);
    try {
      const languages = languagesInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        userName: contextData.userName,
        role: contextData.role,
        preferredLanguages: languages,
        codingStyle: contextData.codingStyle,
        tone: contextData.tone,
      };

      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        setContextData(updated);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save context preferences:", err);
    } finally {
      setIsSavingContext(false);
    }
  };

  const handleAddCustomRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleInput.trim()) return;

    try {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_rule",
          rule: newRuleInput.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setContextData(updated);
        setNewRuleInput("");
      }
    } catch (err) {
      console.error("Failed to add custom rule:", err);
    }
  };

  const handleDeleteRule = async (index: number) => {
    try {
      const res = await fetch(`/api/context?action=delete_rule&index=${index}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updated = await res.json();
        setContextData(updated);
      }
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  const handleDeleteLearned = async (index: number) => {
    try {
      const res = await fetch(`/api/context?action=delete_learned&index=${index}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const updated = await res.json();
        setContextData(updated);
      }
    } catch (err) {
      console.error("Failed to delete learned trait:", err);
    }
  };

  const handleClearAllContext = async () => {
    if (!confirm("Are you sure you want to clear all stored user preferences and context memory?")) return;
    try {
      const res = await fetch("/api/context?action=clear_all", { method: "DELETE" });
      if (res.ok) {
        const reset = await res.json();
        setContextData(reset);
        setLanguagesInput("");
      }
    } catch (err) {
      console.error("Failed to clear context memory:", err);
    }
  };

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
      <div className="bg-white dark:bg-[#212121] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
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

            {/* Memory & Context Tab */}
            {activeTab === "context" && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-400" />
                      Context Awareness & Memory
                    </h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                      Saved in Local DB
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    ChatGPT remembers your preferences, instructions, and learns relevant context across all chats.
                  </p>
                </div>

                {/* User Profile Form */}
                <form onSubmit={handleSavePreferences} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        What should ChatGPT call you?
                      </label>
                      <input
                        type="text"
                        value={contextData.userName}
                        onChange={(e) =>
                          setContextData({ ...contextData, userName: e.target.value })
                        }
                        placeholder="e.g. Kartik"
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Your Role / Occupation
                      </label>
                      <input
                        type="text"
                        value={contextData.role}
                        onChange={(e) =>
                          setContextData({ ...contextData, role: e.target.value })
                        }
                        placeholder="e.g. Senior Frontend Engineer"
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Preferred Languages / Tech Stack (comma separated)
                    </label>
                    <input
                      type="text"
                      value={languagesInput}
                      onChange={(e) => setLanguagesInput(e.target.value)}
                      placeholder="e.g. Next.js, TypeScript, Tailwind, Python"
                      className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Preferred Coding Style
                      </label>
                      <input
                        type="text"
                        value={contextData.codingStyle}
                        onChange={(e) =>
                          setContextData({ ...contextData, codingStyle: e.target.value })
                        }
                        placeholder="e.g. Clean, modular, fully typed"
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Response Tone
                      </label>
                      <select
                        value={contextData.tone}
                        onChange={(e) =>
                          setContextData({ ...contextData, tone: e.target.value })
                        }
                        className="mt-1 w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-purple-400"
                      >
                        <option value="informative and balanced">Informative and balanced</option>
                        <option value="concise and direct">Concise and direct</option>
                        <option value="technical and detailed">Technical and detailed</option>
                        <option value="instructive and step-by-step">Instructive and step-by-step</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="submit"
                      disabled={isSavingContext}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {savedSuccess ? (
                        <>
                          <Check className="w-4 h-4 text-white" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <span>Save Preferences</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAllContext}
                      className="text-xs text-rose-500 hover:underline transition-colors cursor-pointer"
                    >
                      Reset All Context Memory
                    </button>
                  </div>
                </form>

                {/* Custom Rules / Directives Section */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Custom Directives & Guidelines
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Explicit instructions applied to every response.
                      </p>
                    </div>
                  </div>

                  {/* Add rule input */}
                  <form onSubmit={handleAddCustomRule} className="flex gap-2">
                    <input
                      type="text"
                      value={newRuleInput}
                      onChange={(e) => setNewRuleInput(e.target.value)}
                      placeholder="e.g. Always write clean type-safe functions..."
                      className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 outline-none"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </form>

                  {/* Custom Rules List */}
                  {contextData.customRules && contextData.customRules.length > 0 ? (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {contextData.customRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-800 dark:text-zinc-200"
                        >
                          <span className="flex-1">{rule}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(idx)}
                            className="text-zinc-400 hover:text-rose-500 p-1 transition-colors cursor-pointer"
                            title="Delete directive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 italic">No custom rules added yet.</div>
                  )}
                </div>

                {/* Automatically Learned Preferences Section */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        Learned from Conversations
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Preferences automatically detected from your messages. Delete any item you want ChatGPT to forget.
                      </p>
                    </div>
                  </div>

                  {contextData.learnedPreferences && contextData.learnedPreferences.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                      {contextData.learnedPreferences.map((trait, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-600 dark:text-purple-300"
                        >
                          <span>{trait}</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteLearned(idx)}
                            className="hover:text-rose-500 p-0.5 ml-1 transition-colors cursor-pointer"
                            title="Forget this"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-400 italic">
                      No learned traits yet. As you chat, explicit preferences you share will automatically appear here.
                    </div>
                  )}
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
                    Local database storage is active at <code className="font-mono">data/context_db.json</code>.
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                  ✓ LangChain Google Gemini streaming with dynamic Local DB context awareness is active!
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
                  ChatGPT Frontend Clone + LangChain Gemini
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Engineered with pixel-perfect attention to OpenAI ChatGPT&apos;s UI patterns, powered by
                  LangChain TypeScript, Google Gemini 2.5 streaming, multi-turn session memory, and
                  Local DB dynamic context awareness.
                </p>
                <div className="text-xs text-zinc-400 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  Version 1.2.0 • Local DB Context Awareness Active
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
