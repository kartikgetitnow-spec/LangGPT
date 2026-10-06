"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Sparkles, Zap, Brain } from "lucide-react";
import { AVAILABLE_MODELS } from "@/lib/mockData";
import { AIModel } from "@/types/chat";

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModelId,
  onSelectModel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedModel =
    AVAILABLE_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getModelIcon = (model: AIModel) => {
    if (model.id.includes("o1")) {
      return <Brain className="w-4 h-4 text-purple-500" />;
    }
    if (model.id.includes("mini")) {
      return <Zap className="w-4 h-4 text-amber-500" />;
    }
    return <Sparkles className="w-4 h-4 text-emerald-500" />;
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-base sm:text-lg transition-colors cursor-pointer touch-manipulation"
        type="button"
      >
        <span suppressHydrationWarning>{selectedModel.name}</span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-[#282828] border border-zinc-200 dark:border-zinc-700 shadow-xl z-50 p-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="text-xs font-semibold px-3 py-1.5 text-zinc-400 uppercase tracking-wider">
            Model
          </div>
          <div className="space-y-1">
            {AVAILABLE_MODELS.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-zinc-100 dark:bg-zinc-700/60"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  <div className="mt-0.5">{getModelIcon(model)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
