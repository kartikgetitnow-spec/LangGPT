"use client";

import React, { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from "react";
import {
  ArrowUp,
  Square,
  Paperclip,
  Globe,
  Brain,
  Mic,
  X,
  FileText,
} from "lucide-react";
import { Attachment } from "@/types/chat";

interface ChatInputProps {
  onSendMessage: (text: string, attachments: Attachment[]) => void;
  isGenerating: boolean;
  onStopGeneration: () => void;
  inputPrompt?: string;
  onClearInputPrompt?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isGenerating,
  onStopGeneration,
  inputPrompt,
  onClearInputPrompt,
}) => {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isWebSearchActive, setIsWebSearchActive] = useState(false);
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync external prompt if passed from suggestions
  useEffect(() => {
    if (inputPrompt) {
      setContent(inputPrompt);
      onClearInputPrompt?.();
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [inputPrompt, onClearInputPrompt]);

  // Auto-resize textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [content]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isGenerating) {
      onStopGeneration();
      return;
    }

    if (!content.trim() && attachments.length === 0) return;

    let finalContent = content.trim();
    if (isWebSearchActive) {
      finalContent = `[Web Search Active] ${finalContent}`;
    }
    if (isDeepThinkActive) {
      finalContent = `[Deep Reasoning Active] ${finalContent}`;
    }

    onSendMessage(finalContent, attachments);
    setContent("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleRecording = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    setIsRecording(!isRecording);
    // Visual toggle for mock/browser speech
  };

  const canSubmit = content.trim().length > 0 || attachments.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      <div className="relative rounded-3xl bg-zinc-100 dark:bg-[#2f2f2f] border border-zinc-200/80 dark:border-zinc-700/60 shadow-lg px-4 pt-3 pb-2 transition-all focus-within:border-zinc-400 dark:focus-within:border-zinc-500">
        {/* Attachment preview tags */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-2 mb-2 border-b border-zinc-200 dark:border-zinc-700/50">
            {attachments.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-200"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate max-w-[140px] font-medium">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(file.id)}
                  className="hover:text-rose-500 transition-colors ml-1 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={1}
          className="w-full resize-none bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 text-[15px] sm:text-[16px] leading-relaxed max-h-[200px]"
        />

        {/* Tools and Action Bar */}
        <div className="flex items-center justify-between pt-2">
          {/* Left tools: Attach, Web Search, Deep Think */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach files"
              className="p-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-400 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Web Search Toggle Pill */}
            <button
              type="button"
              onClick={() => setIsWebSearchActive(!isWebSearchActive)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isWebSearchActive
                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                  : "hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>

            {/* Deep Reasoning Toggle Pill */}
            <button
              type="button"
              onClick={() => setIsDeepThinkActive(!isDeepThinkActive)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isDeepThinkActive
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Reason</span>
            </button>
          </div>

          {/* Right actions: Voice mode & Send/Stop button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleRecording}
              title="Voice input"
              className={`p-2 rounded-full transition-colors ${
                isRecording
                  ? "bg-rose-500 text-white animate-pulse"
                  : "hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-400"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* Send / Stop Generation Button */}
            {isGenerating ? (
              <button
                type="button"
                onClick={onStopGeneration}
                title="Stop generating"
                className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center transition-transform hover:scale-105 shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                title="Send message"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  canSubmit
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:opacity-90 shadow-sm"
                    : "bg-zinc-300 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                }`}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ChatGPT Disclaimer */}
      <div className="text-center text-[11.5px] text-zinc-500 dark:text-zinc-400 mt-2">
        ChatGPT can make mistakes. Check important info.
      </div>
    </div>
  );
};
