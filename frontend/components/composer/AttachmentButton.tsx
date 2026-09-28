"use client";

import React, { useRef } from "react";
import { Paperclip, Loader2, X, FileText } from "lucide-react";
import { FileInfo } from "@/types/file";

interface AttachmentButtonProps {
  attachments: FileInfo[];
  uploading: boolean;
  onUpload: (file: File) => Promise<unknown>;
  onRemove: (fileId: string) => void;
}

export function AttachmentButton({
  attachments,
  uploading,
  onUpload,
  onRemove,
}: AttachmentButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        await onUpload(files[i]);
      }
      e.target.value = "";
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.pptx,.json,.html,.py,.js,.ts"
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="p-2 rounded-lg text-stone-500 hover:text-stone-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none disabled:opacity-50"
        title="Attach documents for RAG (PDF, DOCX, TXT, CSV, etc.)"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
      </button>

      {attachments.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {attachments.map((file) => (
            <span
              key={file.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-stone-100 dark:bg-neutral-800 text-stone-700 dark:text-neutral-300 border border-stone-200 dark:border-neutral-700 max-w-[150px]"
            >
              <FileText className="w-3 h-3 text-blue-500 shrink-0" />
              <span className="truncate">{file.originalName}</span>
              <button
                type="button"
                onClick={() => onRemove(file.id)}
                className="hover:text-stone-900 dark:hover:text-white ml-0.5 focus:outline-none"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
