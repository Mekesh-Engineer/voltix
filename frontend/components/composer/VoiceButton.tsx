"use client";

import React, { useState } from "react";
import { Mic, Loader2, MicOff } from "lucide-react";

interface VoiceButtonProps {
  onTranscribe: (text: string) => void;
  disabled?: boolean;
}

export function VoiceButton({ onTranscribe, disabled = false }: VoiceButtonProps) {
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");

  const handleClick = () => {
    if (disabled || state === "transcribing") return;

    if (state === "recording") {
      setState("transcribing");
      setTimeout(() => {
        onTranscribe("Analyze our latest dataset trends and summarize key findings.");
        setState("idle");
      }, 1200);
      return;
    }

    // Start recording simulation
    setState("recording");
    setTimeout(() => {
      setState("transcribing");
      setTimeout(() => {
        onTranscribe("Synthesize the project architecture and generate a technical verification report.");
        setState("idle");
      }, 1000);
    }, 2500);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`p-2 rounded-xl transition-all focus:outline-none ${
        state === "recording"
          ? "bg-rose-500 text-white animate-pulse shadow-md"
          : state === "transcribing"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "text-stone-500 hover:text-stone-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800"
      }`}
      title={
        state === "recording"
          ? "Listening... (click to stop)"
          : state === "transcribing"
          ? "Transcribing voice input..."
          : "Voice input"
      }
      aria-label="Voice input"
    >
      {state === "recording" ? (
        <MicOff className="w-4 h-4" />
      ) : state === "transcribing" ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}
