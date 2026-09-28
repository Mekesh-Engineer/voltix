import React from "react";
import { UploadCloud } from "lucide-react";

interface DropOverlayProps {
  isDragging: boolean;
}

export function DropOverlay({ isDragging }: DropOverlayProps) {
  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-blue-500/10 backdrop-blur-xs border-2 border-dashed border-blue-500 rounded-2xl m-2 transition-all">
      <div className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-white shadow-2xl dark:bg-neutral-900 border border-stone-200 dark:border-neutral-800">
        <UploadCloud className="h-10 w-10 text-blue-500 animate-bounce" />
        <h3 className="text-sm font-semibold text-stone-900 dark:text-neutral-100">
          Drop documents to upload & index
        </h3>
        <p className="text-xs text-stone-500 dark:text-neutral-400">
          PDF, DOCX, XLSX, PPTX, CSV, HTML, code files up to 25MB
        </p>
      </div>
    </div>
  );
}
