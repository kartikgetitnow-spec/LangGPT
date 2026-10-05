"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Message } from "@/types/chat";
import { CodeBlock } from "./CodeBlock";
import {
  Copy,
  Check,
  RotateCw,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  Sparkles,
  FileText,
  Share2,
} from "lucide-react";

interface MessageItemProps {
  message: Message;
  isLast: boolean;
  onRegenerate?: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isLast,
  onRegenerate,
}) => {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReadAloud = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message.content);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className={`w-full py-4 px-4 sm:px-6 transition-colors ${
      isUser ? "" : "bg-zinc-50/50 dark:bg-[#212121]"
    }`}>
      <div className="max-w-3xl mx-auto flex gap-4 text-base">
        {/* Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-900 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
              U
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 fill-current" />
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* Header Name */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {isUser ? "You" : "LangGPT"}
            </span>
            {message.model && !isUser && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                {message.model}
              </span>
            )}
          </div>

          {/* Attachments if any */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.attachments.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-200/70 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-200 shadow-sm"
                >
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Message Body */}
          <div className="text-zinc-800 dark:text-zinc-200 leading-relaxed text-[15px] sm:text-[15.5px]">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content}</div>
            ) : (
              <div className={`prose-chat ${message.isStreaming ? "streaming-cursor" : ""}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match && !String(children).includes("\n");

                      if (isInline) {
                        return (
                          <code className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded font-mono text-[13px]" {...props}>
                            {children}
                          </code>
                        );
                      }

                      return (
                        <CodeBlock
                          language={match ? match[1] : ""}
                          value={String(children).replace(/\n$/, "")}
                        />
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Assistant Action Buttons */}
          {!isUser && !message.isStreaming && message.content && (
            <div className="flex items-center gap-1.5 mt-3 text-zinc-400 dark:text-zinc-500">
              <button
                onClick={handleCopyMessage}
                title="Copy response"
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>

              <button
                onClick={handleReadAloud}
                title="Read aloud"
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onClick={() => setLiked(liked === true ? null : true)}
                title="Good response"
                className={`p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${
                  liked === true ? "text-emerald-500" : "hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>

              <button
                onClick={() => setLiked(liked === false ? null : false)}
                title="Bad response"
                className={`p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors ${
                  liked === false ? "text-rose-500" : "hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>

              {isLast && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate response"
                  className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex items-center gap-1 text-xs"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>
              )}

              <button
                onClick={handleCopyMessage}
                title="Share"
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors ml-auto"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
