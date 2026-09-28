"use client";

import React, { useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  File,
  X,
  Loader2,
  ZoomIn,
} from "lucide-react";
import { FileInfo } from "@/types/file";

interface AttachmentTrayProps {
  attachments: FileInfo[];
  uploading: boolean;
  onRemove: (fileId: string) => void;
  onQuickAction?: (actionPrompt: string) => void;
}

function getFileMeta(file: FileInfo) {
  const name = (file.originalName || "").toLowerCase();
  if (name.endsWith(".pdf")) {
    return {
      type: "pdf" as const,
      icon: FileText,
      color: "text-red-500 dark:text-red-400",
      bg: "bg-red-50/60 dark:bg-red-950/30 border-red-200/70 dark:border-red-900/40",
      tag: "PDF",
      quickActions: ["Summarize", "Extract Insights", "Key Findings"],
    };
  }
  if (name.endsWith(".xlsx") || name.endsWith(".csv") || name.endsWith(".xls")) {
    return {
      type: "spreadsheet" as const,
      icon: FileSpreadsheet,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-900/40",
      tag: "Data",
      quickActions: ["Analyze Data", "Generate Charts", "Summary Stats"],
    };
  }
  if (
    name.endsWith(".py") ||
    name.endsWith(".ts") ||
    name.endsWith(".js") ||
    name.endsWith(".json") ||
    name.endsWith(".html") ||
    name.endsWith(".css")
  ) {
    return {
      type: "code" as const,
      icon: FileCode,
      color: "text-blue-500 dark:text-blue-400",
      bg: "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-900/40",
      tag: "Code",
      quickActions: ["Explain Code", "Review & Fix", "Generate Tests"],
    };
  }
  if (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif") ||
    name.endsWith(".bmp") ||
    name.endsWith(".svg") ||
    name.endsWith(".ico") ||
    name.endsWith(".avif") ||
    (file.mimeType && file.mimeType.startsWith("image/"))
  ) {
    return {
      type: "image" as const,
      icon: FileImage,
      color: "text-amber-500 dark:text-amber-400",
      bg: "bg-amber-50/60 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-900/40",
      tag: "Image",
      quickActions: ["Analyze Visuals", "OCR Extract Text", "Describe Diagram"],
    };
  }
  return {
    type: "generic" as const,
    icon: File,
    color: "text-stone-500 dark:text-stone-400",
    bg: "bg-stone-50/80 dark:bg-neutral-800/80 border-stone-200/70 dark:border-neutral-700/60",
    tag: "Doc",
    quickActions: ["Summarize", "Search Content"],
  };
}

export function AttachmentTray({
  attachments,
  uploading,
  onRemove,
  onQuickAction,
}: AttachmentTrayProps) {
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);

  if (attachments.length === 0 && !uploading) return null;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:8000";

  return (
    <>
      <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-2 border-b border-stone-100 dark:border-neutral-800">
        <div className="flex flex-wrap items-center gap-2">
          {attachments.map((file) => {
            const meta = getFileMeta(file);
            const Icon = meta.icon;
            const isImage = meta.type === "image";
            const imageUrl = `${API_BASE}/api/files/${file.id}/content`;

            return (
              <div
                key={file.id}
                className={`group relative flex items-center gap-2 rounded-xl border px-2.5 py-1 text-xs transition-all ${meta.bg}`}
              >
                {/* Visual Thumbnail or Document Icon */}
                {isImage ? (
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ url: imageUrl, name: file.originalName })}
                    className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-amber-300/60 dark:border-amber-700/50 bg-neutral-100 dark:bg-neutral-800 cursor-zoom-in group/img"
                    title="Click to preview image"
                  >
                    <img
                      src={imageUrl}
                      alt={file.originalName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if image fails to render
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-3 h-3 text-white" />
                    </div>
                  </button>
                ) : (
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.color}`} />
                )}
                
                <div className="flex items-center gap-1.5 truncate max-w-[180px] sm:max-w-[240px]">
                  <span className="truncate font-medium text-stone-800 dark:text-neutral-200">
                    {file.originalName}
                  </span>
                  <span className="text-[10px] text-stone-400 dark:text-neutral-500 shrink-0 font-mono">
                    {file.formattedSize}
                  </span>
                </div>

                {/* Quick Actions Hover/Expand */}
                {onQuickAction && (
                  <div className="hidden sm:flex items-center gap-1 ml-1 pl-1.5 border-l border-stone-200/60 dark:border-neutral-700/60">
                    {meta.quickActions.slice(0, 2).map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => onQuickAction(`${action} for ${file.originalName}: `)}
                        className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-white/70 dark:bg-neutral-800/70 hover:bg-white dark:hover:bg-neutral-700 text-stone-600 dark:text-neutral-300 transition-colors shadow-2xs"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Dismiss button */}
                <button
                  type="button"
                  onClick={() => onRemove(file.id)}
                  className="rounded-full p-0.5 text-stone-400 hover:bg-stone-200/80 hover:text-stone-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200 transition-colors ml-0.5"
                  title={`Remove ${file.originalName}`}
                  aria-label={`Remove ${file.originalName}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {uploading && (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-blue-400 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-950/30 px-3 py-1 text-xs text-blue-600 dark:text-blue-400 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="font-medium">Uploading & preparing image...</span>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] bg-stone-900 rounded-2xl overflow-hidden shadow-2xl border border-stone-700/80 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-stone-800/90 border-b border-stone-700">
              <span className="text-sm font-medium text-stone-200 truncate">
                {previewImage.name}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
                title="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

