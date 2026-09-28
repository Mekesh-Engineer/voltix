"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl";
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "md",
}: SlideOverProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthStyles = {
    md: "w-full sm:w-96",
    lg: "w-full sm:w-[460px]",
    xl: "w-full sm:w-[560px]",
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex flex-col border-l border-stone-200 bg-white shadow-2xl transition-transform duration-200 ease-in-out dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100",
        widthStyles[width]
      )}
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-neutral-800">
        <div>
          <h2 className="text-sm font-semibold text-stone-900 dark:text-neutral-100">{title}</h2>
          {subtitle && (
            <p className="text-xs text-stone-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </aside>
  );
}
