"use client";

import React, { useState, useEffect } from "react";
import { useChat } from "@/hooks/useChat";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { AuthModal } from "@/components/modals/AuthModal";

export default function Home() {
  const {
    conversations,
    currentConversationId,
    activeConversation,
    selectedModel,
    isGenerating,
    setCurrentConversationId,
    setSelectedModel,
    startNewChat,
    deleteConversation,
    renameConversation,
    togglePinConversation,
    sendMessage,
    stopGeneration,
    regenerateLastMessage,
  } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Responsive sidebar initial state on screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Keyboard shortcut listener (Ctrl+Shift+O for new chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        startNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startNewChat]);

  const handleClearAllChats = () => {
    localStorage.removeItem("langgpt_conversations");
    localStorage.removeItem("langgpt_active_id");
    window.location.reload();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#212121]">
      {/* LangGPT Collapsible Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={currentConversationId}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        onSelectChat={(id) => setCurrentConversationId(id)}
        onNewChat={startNewChat}
        onDeleteChat={deleteConversation}
        onRenameChat={renameConversation}
        onTogglePin={togglePinConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Main Chat Interface */}
      <ChatArea
        conversation={activeConversation}
        selectedModel={selectedModel}
        isGenerating={isGenerating}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onSelectModel={setSelectedModel}
        onSendMessage={sendMessage}
        onStopGeneration={stopGeneration}
        onRegenerateLast={regenerateLastMessage}
        onNewChat={startNewChat}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onClearAllChats={handleClearAllChats}
        conversationsData={conversations}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
