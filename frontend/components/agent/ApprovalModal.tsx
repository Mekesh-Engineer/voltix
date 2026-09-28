"use client";

import React from "react";
import { AlertTriangle, ShieldAlert, Check, X } from "lucide-react";
import { PendingApprovalUI } from "@/hooks/useAgent";

interface ApprovalModalProps {
  approval: PendingApprovalUI | null;
  onRespond: (approved: boolean) => void;
}

export function ApprovalModal({ approval, onRespond }: ApprovalModalProps) {
  if (!approval) return null;

  const isHighRisk = approval.risk_level === "high" || approval.risk_level === "irreversible";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-lg p-6 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${isHighRisk ? "bg-rose-500/20 border-rose-500/30 text-rose-400" : "bg-amber-500/20 border-amber-500/30 text-amber-400"}`}>
            {isHighRisk ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Human-in-the-Loop Confirmation</h3>
            <span className="text-xs text-neutral-400">The agent requested approval for a protected operation.</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
          <div>
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">Target Action</span>
            <span className="text-sm font-semibold text-white">{approval.action_summary}</span>
          </div>

          <div>
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">Tool & Operational Risk</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-xs text-neutral-200">{approval.tool_name}</span>
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                isHighRisk ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}>
                {approval.risk_level} RISK
              </span>
            </div>
          </div>

          {approval.reason && (
            <div>
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block">Reason</span>
              <p className="text-xs text-neutral-300">{approval.reason}</p>
            </div>
          )}

          {approval.parameters && Object.keys(approval.parameters).length > 0 && (
            <div>
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider block mb-1">Parameters</span>
              <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-32">
                {JSON.stringify(approval.parameters, null, 2)}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => onRespond(false)}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4 text-rose-400" /> Deny Action
          </button>
          <button
            onClick={() => onRespond(true)}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Approve & Execute
          </button>
        </div>

      </div>
    </div>
  );
}
