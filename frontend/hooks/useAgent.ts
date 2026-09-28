"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface AgentStepUI {
  id: string;
  step_number: number;
  agent_type: string;
  title: string;
  description: string;
  tool_name?: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
  duration_ms: number;
  output?: unknown;
  verification?: unknown;
}

export interface AgentArtifactUI {
  artifact_id: string;
  name: string;
  file_type: string;
  file_path: string;
  size_bytes: number;
  version: number;
}

export interface PendingApprovalUI {
  approval_id: string;
  run_id?: string;
  tool_name: string;
  action_summary: string;
  reason: string;
  risk_level: string;
  parameters?: Record<string, unknown>;
}


export function useAgent() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [goal, setGoal] = useState<string>("");
  const [phase, setPhase] = useState<string>("IDLE");
  const [model, setModel] = useState<string>("");
  const [steps, setSteps] = useState<AgentStepUI[]>([]);
  const [artifacts, setArtifacts] = useState<AgentArtifactUI[]>([]);
  const [finalOutput, setFinalOutput] = useState<string>("");
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalUI | null>(null);
  const [runtimeSeconds, setRuntimeSeconds] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Runtime Timer
  useEffect(() => {
    if (isRunning && !isPaused) {
      timerRef.current = setInterval(() => {
        setRuntimeSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isPaused]);

  const startAgent = useCallback(async (taskGoal: string, modelOverride?: string, fileIds?: string[]) => {
    setIsRunning(true);
    setIsPaused(false);
    setGoal(taskGoal);
    setPhase("INITIALIZING");
    setSteps([]);
    setArtifacts([]);
    setFinalOutput("");
    setPendingApproval(null);
    setRuntimeSeconds(0);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: taskGoal,
          model: modelOverride,
          file_ids: fileIds,
        }),
        signal: abortController.signal,
      });

      if (!res.ok) {
        throw new Error(`Failed to start agent run: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;

          try {
            const ev = JSON.parse(trimmed.replace("data: ", ""));
            const { event_type, payload } = ev;

            if (ev.run_id && !runId) setRunId(ev.run_id);

            switch (event_type) {
              case "AgentStarted":
                setPhase("PLANNING");
                break;
              case "PlanCreated":
                if (payload?.plan?.steps) {
                  setSteps(payload.plan.steps);
                }
                break;
              case "ModelSelected":
                if (payload?.model) setModel(payload.model);
                setPhase("EXECUTING");
                break;
              case "StepStarted":
                setPhase(`STEP ${payload?.step?.step_number || ""}: ${payload?.step?.title || ""}`);
                if (payload?.step?.id) {
                  setSteps((prev) =>
                    prev.map((s) => (s.id === payload.step.id ? { ...s, status: "RUNNING" } : s))
                  );
                }
                break;
              case "VerificationCompleted":
                if (ev.step_id) {
                  setSteps((prev) =>
                    prev.map((s) =>
                      s.id === ev.step_id
                        ? { ...s, status: "COMPLETED", verification: payload?.verification }
                        : s
                    )
                  );
                }
                break;
              case "ToolFailed":
                if (ev.step_id) {
                  setSteps((prev) =>
                    prev.map((s) => (s.id === ev.step_id ? { ...s, status: "FAILED" } : s))
                  );
                }
                break;
              case "ApprovalRequested":
                setPhase("WAITING FOR APPROVAL");
                setPendingApproval({
                  approval_id: payload?.approval_id,
                  run_id: ev.run_id,
                  tool_name: payload?.tool_name || "Protected Tool",
                  action_summary: ev.message,
                  reason: ev.message,
                  risk_level: payload?.risk_level || "medium",
                });
                break;
              case "ArtifactCreated":
                if (payload?.artifact) {
                  setArtifacts((prev) => [...prev, payload.artifact]);
                }
                break;
              case "AgentCompleted":
                setPhase("COMPLETED");
                setIsRunning(false);
                if (payload?.final_output) setFinalOutput(payload.final_output);
                if (payload?.artifacts) setArtifacts(payload.artifacts);
                break;
              case "AgentFailed":
                setPhase("FAILED");
                setIsRunning(false);
                break;
              case "AgentCancelled":
                setPhase("CANCELLED");
                setIsRunning(false);
                break;
              default:
                break;
            }
          } catch {
            // parse error
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setPhase("FAILED");
      }
    } finally {
      setIsRunning(false);
    }

  }, [runId]);

  const pauseAgent = useCallback(async () => {
    if (!runId) return;
    try {
      await fetch("/api/agent/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });
      setIsPaused(true);
      setPhase("PAUSED");
    } catch {}
  }, [runId]);

  const resumeAgent = useCallback(async () => {
    if (!runId) return;
    try {
      await fetch("/api/agent/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });
      setIsPaused(false);
      setPhase("EXECUTING");
    } catch {}
  }, [runId]);

  const cancelAgent = useCallback(async () => {
    if (!runId) {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsRunning(false);
      return;
    }
    try {
      await fetch("/api/agent/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsRunning(false);
      setPhase("CANCELLED");
    } catch {}
  }, [runId]);

  const respondApproval = useCallback(async (approved: boolean) => {
    if (!pendingApproval) return;
    try {
      await fetch(`/api/agent/approvals/${pendingApproval.approval_id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_id: pendingApproval.approval_id,
          approved,
        }),
      });
      setPendingApproval(null);
    } catch {}
  }, [pendingApproval]);

  return {
    isRunning,
    isPaused,
    runId,
    goal,
    phase,
    model,
    steps,
    artifacts,
    finalOutput,
    pendingApproval,
    runtimeSeconds,
    startAgent,
    pauseAgent,
    resumeAgent,
    cancelAgent,
    respondApproval,
  };
}
