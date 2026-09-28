"use client";

import React from "react";
import { FileText, X, Loader2 } from "lucide-react";
import { FileInfo } from "@/types/file";

interface AttachmentStripProps {
  attachments: FileInfo[];
  uploading: boolean;
  onRemove: (fileId: string) => void;
}

export function AttachmentStrip({
  attachments,
  uploading,
  onRemove,
}: AttachmentStripProps) {
  if (attachments.length === 0 && !uploading) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 pt-2 pb-1 border-b border-stone-100 dark:border-neutral-800">
      {attachments.map((file) => (
        <div
          key={file.id}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        >
          <FileText className="h-3.5 w-3.5 text-blue-500" />
          <span className="truncate max-w-[140px] font-medium">{file.originalName}</span>
          <span className="text-[10px] text-stone-400 dark:text-neutral-500">
            ({file.formattedSize})
          </span>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="rounded p-0.5 text-stone-400 hover:bg-stone-200 hover:text-stone-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            aria-label="Remove attachment"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      {uploading && (
        <div className="flex items-center gap-1.5 rounded-lg border border-dashed border-blue-400 bg-blue-50/50 px-2.5 py-1 text-xs text-blue-600 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-400 animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Indexing document...</span>
        </div>
      )}
    </div>
  );
}
