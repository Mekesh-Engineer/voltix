"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PanelLeftClose,
  PanelLeft,
  X,
  Settings,
  Swords,
  Activity,
} from "lucide-react";
import { Conversation } from "@/types/conversation";
import { ModelInfo } from "@/types/model";
import { VoltixLogo } from "@/components/ui/Icons";
import { NewChatButton } from "./NewChatButton";
import { SearchChats } from "./SearchChats";
import { ModelSelector } from "./ModelSelector";
import { ConversationList } from "./ConversationList";

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenSettings: () => void;
  models?: ModelInfo[];
  selectedModel?: string;
  onSelectModel?: (modelId: string) => void;
  ollamaActive?: boolean;
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onTogglePin,
  isOpenMobile,
  onCloseMobile,
  onOpenSettings,
  models = [],
  selectedModel = "qwen2.5:7b",
  onSelectModel,
  ollamaActive = true,
}: SidebarProps) {
  const [minified, setMinified] = useState(false);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Main Futuristic Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 md:static flex flex-col border-r border-stone-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#070b14]/95 backdrop-blur-xl transition-all duration-300 ease-in-out select-none ${
          minified ? "w-[72px]" : "w-[270px]"
        } ${
          isOpenMobile
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-stone-200/60 dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <button
              type="button"
              onClick={onNewChat}
              className="flex items-center gap-2.5 focus:outline-none group text-left"
              title="Voltix AI Home"
            >
              <VoltixLogo
                className="w-8 h-8 shrink-0"
                showWordmark={!minified}
                wordmarkClassName="font-extrabold text-base tracking-tight text-stone-900 dark:text-white"
              />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Minify Toggle */}
            <button
              type="button"
              onClick={() => setMinified(!minified)}
              className="hidden md:flex p-1.5 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/[0.08] transition-colors focus:outline-none"
              title={minified ? "Expand sidebar" : "Minify sidebar"}
              aria-label={minified ? "Expand sidebar" : "Minify sidebar"}
            >
              {minified ? (
                <PanelLeft className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex md:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/[0.08] transition-colors focus:outline-none"
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary Action Zone: New Chat, Search & AI Model Selector */}
        <div className="p-3 space-y-2 border-b border-stone-200/60 dark:border-white/[0.06] shrink-0">
          <NewChatButton onClick={onNewChat} minified={minified} />
          <SearchChats
            conversations={conversations}
            onSelectConversation={(id) => {
              onSelectConversation(id);
              onCloseMobile();
            }}
            minified={minified}
          />
          {onSelectModel && (
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
              ollamaActive={ollamaActive}
              minified={minified}
            />
          )}
        </div>

        {/* Quick Engine & Feature Launchers */}
        <div className="px-3 py-2 border-b border-stone-200/60 dark:border-white/[0.06] shrink-0 space-y-1">
          <Link
            href="/studio"
            className={`w-full flex items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-stone-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-stone-100 dark:hover:bg-white/[0.06] ${
              minified ? "justify-center p-2" : "px-2.5 py-2"
            }`}
            title="Model Studio Arena — Compare models side-by-side"
          >
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 dark:bg-blue-500/15 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Swords className="w-3.5 h-3.5" />
            </div>
            {!minified && (
              <>
                <span className="truncate flex-1 text-left">Studio Arena</span>
                <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Arena
                </span>
              </>
            )}
          </Link>

          {!minified && (
            <div className="px-2.5 py-1.5 rounded-xl bg-stone-100/70 dark:bg-white/[0.03] border border-stone-200/60 dark:border-white/[0.04] flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-stone-600 dark:text-neutral-400 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="truncate">Voltix Core Engine</span>
              </div>
              <Activity className="w-3 h-3 text-emerald-500 shrink-0" />
            </div>
          )}
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            onSelect={(id) => {
              onSelectConversation(id);
              onCloseMobile();
            }}
            onRename={onRenameChat}
            onDelete={onDeleteChat}
            onTogglePin={onTogglePin}
            minified={minified}
          />
        </div>

        {/* Futuristic User Profile & Settings Footer */}
        <div className="p-3 border-t border-stone-200/60 dark:border-white/[0.06] shrink-0 bg-stone-50/50 dark:bg-white/[0.01]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              {/* Holographic Squircle Avatar */}
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm shadow-blue-500/20 ring-1 ring-white/20"
                title="Workspace Profile"
              >
                V
              </div>
              {!minified && (
                <div className="truncate text-left">
                  <div className="text-xs font-semibold text-stone-900 dark:text-white truncate">
                    Voltix Workspace
                  </div>
                  <div className="text-[10px] text-stone-400 dark:text-neutral-500 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Local & Cloud LLMs</span>
                  </div>
                </div>
              )}
            </div>

            {!minified && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-white/[0.08] transition-all duration-150 focus:outline-none group"
                title="System Settings & LLM Config"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 transition-transform duration-300 group-hover:rotate-45" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
