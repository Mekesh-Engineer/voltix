"use client";

import React from "react";
import { ArrowUp, Square, Play, ShieldAlert, RotateCcw } from "lucide-react";
import { ComposerState } from "./types";

interface SendButtonProps {
  state?: ComposerState;
  disabled?: boolean;
  onSend?: () => void;
  onClick?: () => void;
  onStop?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
}

export function SendButton({
  state = "ready",
  disabled = false,
  onSend,
  onClick,
  onStop,
  onResume,
  onRetry,
}: SendButtonProps) {
  const handleAction = onSend || onClick || (() => {});
  if (state === "running" || state === "submitting") {
    return (
      <button
        type="button"
        onClick={onStop}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 transition-transform active:scale-90 shadow-2xs focus:outline-none"
        title="Stop generation (Esc)"
        aria-label="Stop generation"
      >
        <Square className="h-3 w-3 fill-current" />
      </button>
    );
  }

  if (state === "paused" && onResume) {
    return (
      <button
        type="button"
        onClick={onResume}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 text-white transition-transform active:scale-90 shadow-2xs focus:outline-none"
        title="Resume agent execution"
        aria-label="Resume agent execution"
      >
        <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
      </button>
    );
  }

  if (state === "waiting_approval") {
    return (
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white shadow-2xs focus:outline-none animate-pulse"
        title="Waiting for permission approval"
        aria-label="Waiting for permission approval"
      >
        <ShieldAlert className="h-4 w-4" />
      </button>
    );
  }

  if (state === "error" && onRetry) {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-700 text-white transition-transform active:scale-90 shadow-2xs focus:outline-none"
        title="Retry last request"
        aria-label="Retry last request"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    );
  }

  // Ready or Idle: Circular Voltix Blue Tactile Button (Section 24)
  return (
    <button
      type="button"
      onClick={handleAction}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-150 focus:outline-none ${
        disabled
          ? "bg-stone-100 dark:bg-white/[0.06] text-stone-300 dark:text-neutral-600 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white shadow-xs hover:shadow-sm active:scale-90"
      }`}
      title="Send prompt (Enter / ⌘↵)"
      aria-label="Send prompt"
    >
      <ArrowUp className="h-4 w-4 stroke-[2.5]" />
    </button>
  );
}

export function StopButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors shadow-2xs focus:outline-none"
      title="Stop generation"
    >
      <Square className="h-3 w-3 fill-current" />
    </button>
  );
}
