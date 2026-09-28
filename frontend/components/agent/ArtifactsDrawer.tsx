"use client";

import React, { useEffect, useState } from "react";
import { Download, FileText, FileSpreadsheet, FileCode, File, HardDrive, RefreshCw } from "lucide-react";

interface ArtifactItem {
  id: string;
  name: string;
  file_type: string;
  size_bytes: number;
  version: number;
  run_id?: string;
  created_at: string;
}

interface ArtifactsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArtifactsDrawer({ isOpen, onClose }: ArtifactsDrawerProps) {
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchArtifacts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/artifacts");
      if (res.ok) {
        const data = await res.json();
        setArtifacts(data.artifacts || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    if (isOpen) {
      fetch("/api/artifacts")
        .then((res) => (res.ok ? res.json() : { artifacts: [] }))
        .then((data) => {
          if (active) {
            setArtifacts(data.artifacts || []);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [isOpen]);


  if (!isOpen) return null;

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "csv":
      case "xlsx":
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case "json":
      case "code":
        return <FileCode className="w-5 h-5 text-amber-400" />;
      default:
        return <FileText className="w-5 h-5 text-cyan-400" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Artifact Workspace</h3>
              <p className="text-[11px] text-neutral-400">Generated reports, spreadsheets, and deliverables</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchArtifacts}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {artifacts.length === 0 ? (
            <div className="text-center py-16 text-neutral-500 text-xs space-y-2">
              <File className="w-8 h-8 mx-auto opacity-40 text-neutral-400" />
              <p>No artifacts created yet.</p>
              <p className="text-[11px] text-neutral-600">Execute an agent research or analysis task to produce deliverables.</p>
            </div>
          ) : (
            artifacts.map((a) => (
              <div
                key={a.id}
                className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    {getFileIcon(a.file_type)}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white block truncate">{a.name}</span>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5">
                      <span>{formatSize(a.size_bytes)}</span>
                      <span>•</span>
                      <span className="uppercase">{a.file_type}</span>
                      <span>•</span>
                      <span>v{a.version}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={`/api/artifacts/${a.id}/download`}
                  download={a.name}
                  className="p-2 rounded-lg bg-neutral-800 hover:bg-cyan-600 text-neutral-300 hover:text-white transition-colors"
                  title="Download File"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
