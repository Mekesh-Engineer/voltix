"use client";

import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Edit2, Trash2, Check, X, Pin, PinOff, MessageSquare } from "lucide-react";
import { Conversation } from "@/types/conversation";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  minified?: boolean;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
  minified = false,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSaveRename = () => {
    if (editTitle.trim()) {
      onRename(conversation.id, editTitle.trim());
    } else {
      setEditTitle(conversation.title);
    }
    setIsEditing(false);
    setMenuOpen(false);
  };

  const handleCancelRename = () => {
    setEditTitle(conversation.title);
    setIsEditing(false);
  };

  if (minified) {
    return (
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-label={conversation.title}
        className={`w-full flex items-center justify-center p-2.5 rounded-xl text-xs transition-all duration-150 group relative ${
          isActive
            ? "bg-blue-600/15 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-medium"
            : "hover:bg-stone-200/60 dark:hover:bg-neutral-800/70 text-stone-500 dark:text-neutral-400"
        }`}
        title={conversation.title}
      >
        <span
          className={`w-2 h-2 rounded-full transition-transform ${
            isActive
              ? "bg-blue-600 dark:bg-blue-400 scale-125 ring-2 ring-blue-500/20"
              : "bg-stone-400 dark:bg-neutral-600 group-hover:scale-110"
          }`}
        />
        {conversation.isPinned && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-white dark:ring-neutral-900" />
        )}
      </button>
    );
  }

  return (
    <div
      className={`group relative flex items-center justify-between w-full px-2.5 py-1.5 rounded-xl text-sm transition-all duration-150 select-none ${
        isActive
          ? "bg-blue-500/10 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 font-medium border-l-2 border-blue-600 dark:border-blue-500 pl-2 shadow-xs"
          : "hover:bg-stone-200/50 dark:hover:bg-neutral-800/60 text-stone-600 dark:text-neutral-400 hover:text-stone-900 dark:hover:text-neutral-200 border-l-2 border-transparent"
      }`}
    >
      {isEditing ? (
        <div className="flex items-center gap-1.5 w-full py-0.5">
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") handleCancelRename();
            }}
            className="flex-1 bg-white dark:bg-neutral-900 border border-blue-500 dark:border-blue-400 rounded-lg px-2 py-1 text-xs text-stone-900 dark:text-white outline-none ring-2 ring-blue-500/20"
          />
          <button
            type="button"
            onClick={handleSaveRename}
            className="p-1 rounded-md text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title="Save"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCancelRename}
            className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            title="Cancel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            className="truncate flex-1 text-left py-0.5 flex items-center gap-2 group-hover:translate-x-0.5 transition-transform"
            title={conversation.title}
          >
            {conversation.isPinned ? (
              <Pin className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 rotate-45" />
            ) : (
              <MessageSquare className="w-3.5 h-3.5 text-stone-400 dark:text-neutral-500 shrink-0 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            )}
            <span className="truncate text-xs font-normal leading-snug">
              {conversation.title}
            </span>
          </button>

          {/* Quick Hover Actions & 3-dots Menu */}
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {onTogglePin && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(conversation.id, !conversation.isPinned);
                }}
                className="p-1 rounded-md text-stone-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-stone-200/60 dark:hover:bg-neutral-700/60 transition-colors"
                title={conversation.isPinned ? "Unpin chat" : "Pin chat"}
              >
                {conversation.isPinned ? (
                  <PinOff className="w-3 h-3" />
                ) : (
                  <Pin className="w-3 h-3" />
                )}
              </button>
            )}

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className={`p-1 rounded-md text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-neutral-700/60 transition-colors ${
                  menuOpen ? "bg-stone-200/80 dark:bg-neutral-700 text-stone-800 dark:text-stone-100" : ""
                }`}
                title="More options"
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-stone-200/80 dark:border-white/10 bg-white/95 dark:bg-[#15171e]/95 backdrop-blur-md shadow-xl z-50 p-1 text-xs space-y-0.5 animate-in fade-in duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-white/[0.08] text-stone-700 dark:text-neutral-300 text-left transition-colors"
                  >
                    <Edit2 className="w-3 h-3 text-stone-400" />
                    <span>Rename</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(conversation.id);
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
