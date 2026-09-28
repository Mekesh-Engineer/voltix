"use client";

import { useState } from "react";
import { FileInfo } from "@/types/file";
import { uploadFile as apiUploadFile, deleteFile as apiDeleteFile } from "@/lib/api";

export function useFileUpload(conversationId?: string) {
  const [attachments, setAttachments] = useState<FileInfo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setUploadError(null);
      const uploaded = await apiUploadFile(file, conversationId);
      setAttachments((prev) => [...prev, uploaded]);
      return uploaded;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload file";
      console.error("Upload error:", err);
      setUploadError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (fileId: string) => {
    try {
      await apiDeleteFile(fileId);
      setAttachments((prev) => prev.filter((a) => a.id !== fileId));
    } catch (err) {
      console.warn("Could not delete file from server, removing locally:", err);
      setAttachments((prev) => prev.filter((a) => a.id !== fileId));
    }
  };

  const clearAttachments = () => {
    setAttachments([]);
    setUploadError(null);
  };

  return {
    attachments,
    uploading,
    uploadError,
    handleUpload,
    removeAttachment,
    clearAttachments,
  };
}
