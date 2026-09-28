"use client";

import React from "react";
import { ShieldAlert, Check, X } from "lucide-react";
import { PendingApprovalUI } from "@/hooks/useAgent";

interface ApprovalPromptProps {
  approval: PendingApprovalUI | null;
  onRespond: (approved: boolean) => void;
}

export function ApprovalPrompt({ approval, onRespond }: ApprovalPromptProps) {
  if (!approval) return null;

  return (
    <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 rounded-t-2xl animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="mt-0.5 p-1 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-stone-900 dark:text-neutral-100">
                Action Approval Required
              </h4>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                {approval.risk_level} Risk
              </span>
            </div>
            <p className="text-xs text-stone-700 dark:text-neutral-300 mt-0.5 font-medium">
              {approval.tool_name}: {approval.action_summary}
            </p>
            {approval.reason && (
              <p className="text-[11px] text-stone-500 dark:text-neutral-400 mt-0.5">
                Reason: {approval.reason}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-center">
          <button
            type="button"
            onClick={() => onRespond(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Allow</span>
          </button>

          <button
            type="button"
            onClick={() => onRespond(false)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-stone-200 dark:bg-neutral-800 hover:bg-stone-300 dark:hover:bg-neutral-700 text-stone-700 dark:text-neutral-300 transition-colors shadow-2xs"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Deny</span>
          </button>
        </div>
      </div>
    </div>
  );
}
