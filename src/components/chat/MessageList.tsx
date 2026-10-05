"use client";

import React, { useEffect, useRef, useState } from "react";
import { Message } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { ArrowDown } from "lucide-react";

interface MessageListProps {
  messages: Message[];
  onRegenerateLast?: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onRegenerateLast,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Auto-scroll to bottom on message changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Monitor scroll position
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isFarFromBottom = scrollHeight - scrollTop - clientHeight > 180;
    setShowScrollBottom(isFarFromBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto w-full relative"
    >
      <div className="flex flex-col pb-10">
        {messages.map((message, index) => {
          const isLast = index === messages.length - 1;
          return (
            <MessageItem
              key={message.id}
              message={message}
              isLast={isLast}
              onRegenerate={isLast ? onRegenerateLast : undefined}
            />
          );
        })}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-28 right-8 p-2 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 shadow-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all cursor-pointer z-20"
          title="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
