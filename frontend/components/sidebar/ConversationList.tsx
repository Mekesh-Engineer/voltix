"use client";

import React, { useMemo } from "react";
import { Pin, Sparkles } from "lucide-react";
import { Conversation } from "@/types/conversation";
import { groupConversationsByDate } from "@/lib/utils";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onTogglePin?: (id: string, isPinned: boolean) => void;
  minified?: boolean;
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
  minified = false,
}: ConversationListProps) {
  const pinnedConversations = useMemo(
    () => conversations.filter((c) => Boolean(c.isPinned)),
    [conversations]
  );

  const unpinnedConversations = useMemo(
    () => conversations.filter((c) => !c.isPinned),
    [conversations]
  );

  const groups = useMemo(() => {
    return groupConversationsByDate(unpinnedConversations);
  }, [unpinnedConversations]);

  if (conversations.length === 0) {
    return (
      <div className="py-12 px-3 text-center">
        {!minified ? (
          <div className="space-y-2">
            <div className="w-8 h-8 mx-auto rounded-xl bg-blue-500/10 dark:bg-cyan-500/10 flex items-center justify-center text-blue-600 dark:text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-stone-600 dark:text-neutral-400">
              No conversations yet
            </p>
            <p className="text-[11px] text-stone-400 dark:text-neutral-500">
              Start a new chat to begin exploring with Voltix
            </p>
          </div>
        ) : (
          <div className="w-2 h-2 mx-auto rounded-full bg-stone-300 dark:bg-neutral-700" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      {/* Pinned Section */}
      {pinnedConversations.length > 0 && (
        <div className="space-y-1">
          {!minified && (
            <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold tracking-wider text-amber-500 dark:text-amber-400 uppercase">
              <div className="flex items-center gap-1.5">
                <Pin className="w-3 h-3 rotate-45" />
                <span>Pinned</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {pinnedConversations.length}
              </span>
            </div>
          )}
          <div className="space-y-0.5">
            {pinnedConversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                minified={minified}
              />
            ))}
          </div>
        </div>
      )}

      {/* Date-Grouped History */}
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          {!minified && (
            <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold tracking-wider text-stone-400 dark:text-neutral-500 uppercase">
              <span>{group.label}</span>
              <span className="text-[10px] font-mono text-stone-400 dark:text-neutral-600">
                {group.conversations.length}
              </span>
            </div>
          )}
          <div className="space-y-0.5">
            {group.conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === activeId}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                minified={minified}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
