import asyncio
import json
import time
import uuid
from typing import AsyncGenerator, Dict, Any, List, Optional
from sqlalchemy import select
from backend.app.agent.events import event_bus, AgentEvent, AgentEventType
from backend.app.agent.model_registry import model_router, model_registry
from backend.app.agent.planner import planner
from backend.app.agent.policy import policy_engine, approval_manager
from backend.app.agent.state import AgentState, AgentStatus, AgentPlan, Evidence
from backend.app.agent.subagents import agent_supervisor
from backend.app.agent.verifier import verification_engine
from backend.app.config import settings
from backend.app.core.logging import logger
from backend.app.database.database import async_session_factory
from backend.app.database.models import AgentRun, AgentStep, Artifact, ToolExecution, AgentCheckpoint
from backend.app.llm.router import llm_router
from backend.app.tools.registry import tool_registry


class AgentRuntime:
    """
    Agent Runtime 2.0: Unified, deterministic, observable, verifiable,
    and interruptible autonomous agent orchestration engine (Section 3).
    """

    def __init__(self):
        self._active_runs: Dict[str, AgentState] = {}
        self._paused_runs: set = set()
        self._cancelled_runs: set = set()

    def get_run_state(self, run_id: str) -> Optional[AgentState]:
        return self._active_runs.get(run_id)

    def pause_run(self, run_id: str) -> bool:
        if run_id in self._active_runs:
            self._paused_runs.add(run_id)
            self._active_runs[run_id].status = AgentStatus.PAUSED
            logger.info(f"Agent run {run_id} marked as PAUSED.")
            return True
        return False

    def resume_run(self, run_id: str) -> bool:
        if run_id in self._paused_runs:
            self._paused_runs.remove(run_id)
            self._active_runs[run_id].status = AgentStatus.EXECUTING
            logger.info(f"Agent run {run_id} resumed.")
            return True
        return False

    def cancel_run(self, run_id: str) -> bool:
        if run_id in self._active_runs:
            self._cancelled_runs.add(run_id)
            self._active_runs[run_id].status = AgentStatus.CANCELLED
            logger.info(f"Agent run {run_id} CANCELLED.")
            return True
        return False

    async def run(
        self,
        goal: str,
        conversation_id: Optional[str] = None,
        model_override: Optional[str] = None,
        file_ids: Optional[List[str]] = None,
        user_id: str = "default_user",
    ) -> AsyncGenerator[AgentEvent, None]:
        """
        Executes a goal autonomously through planning, routing, tool delegation,
        verification, and synthesis while streaming structured events.
        """
        run_id = str(uuid.uuid4())
        state = AgentState(
            run_id=run_id,
            conversation_id=conversation_id,
            user_id=user_id,
            goal=goal,
            status=AgentStatus.ANALYZING,
        )
        self._active_runs[run_id] = state

        # 1. Start Event
        ev = AgentEvent(
            run_id=run_id,
            event_type=AgentEventType.AGENT_STARTED,
            message=f"Agent started objective: {goal}",
            payload={"goal": goal, "run_id": run_id},
        )
        await event_bus.emit(ev)
        yield ev

        # 2. Plan Creation
        plan = planner.create_plan(goal, has_attachments=bool(file_ids), file_ids=file_ids)
        state.plan = plan
        state.status = AgentStatus.PLANNING

        ev_plan = AgentEvent(
            run_id=run_id,
            event_type=AgentEventType.PLAN_CREATED,
            message=f"Plan generated with {len(plan.steps)} steps.",
            payload={"plan": plan.model_dump()},
        )
        await event_bus.emit(ev_plan)
        yield ev_plan

        # 3. Model Selection
        selected_model = model_router.select_model(
            task_intent="multi_step" if len(plan.steps) > 1 else "general",
            user_override=model_override,
            requires_coding=any(s.agent_type == "coding" for s in plan.steps),
            requires_research=any(s.agent_type == "research" for s in plan.steps),
            requires_data_analysis=any(s.agent_type == "data" for s in plan.steps),
        )
        state.model = selected_model

        ev_model = AgentEvent(
            run_id=run_id,
            event_type=AgentEventType.MODEL_SELECTED,
            message=f"Routed to optimal model: {selected_model}",
            payload={"model": selected_model},
        )
        await event_bus.emit(ev_model)
        yield ev_model

        # Persist AgentRun to DB
        async with async_session_factory() as session:
            db_run = AgentRun(
                id=run_id,
                conversation_id=conversation_id,
                user_id=user_id,
                goal=goal,
                status="EXECUTING",
                model=selected_model,
                plan_json=json.dumps(plan.model_dump()),
            )
            session.add(db_run)
            await session.commit()

        # 4. Step Execution Loop
        state.status = AgentStatus.EXECUTING
        collected_context_pieces = []

        for idx, step in enumerate(plan.steps):
            # Check cancellation or pause
            if run_id in self._cancelled_runs:
                state.status = AgentStatus.CANCELLED
                ev_cancel = AgentEvent(run_id=run_id, event_type=AgentEventType.AGENT_CANCELLED, message="Agent was cancelled by user.")
                await event_bus.emit(ev_cancel)
                yield ev_cancel
                return

            while run_id in self._paused_runs:
                await asyncio.sleep(0.5)

            state.current_step_index = idx + 1
            step.status = "RUNNING"

            ev_step_start = AgentEvent(
                run_id=run_id,
                event_type=AgentEventType.STEP_STARTED,
                step_id=step.id,
                message=f"Step {step.step_number}: {step.title}",
                payload={"step": step.model_dump()},
            )
            await event_bus.emit(ev_step_start)
            yield ev_step_start

            # Policy & Human-in-the-loop authorization
            if step.tool_name:
                tool_def = tool_registry.get(step.tool_name)
                if tool_def:
                    auth = policy_engine.check_authorization(tool_def, step.input_params)
                    if auth.get("requires_approval"):
                        state.status = AgentStatus.WAITING_FOR_APPROVAL
                        appr_req = approval_manager.create_request(
                            run_id=run_id,
                            tool_name=step.tool_name,
                            action_summary=f"Execute {step.title}",
                            parameters=step.input_params,
                            reason=auth.get("reason", ""),
                            risk_level=auth.get("risk_level"),
                        )
                        ev_appr = AgentEvent(
                            run_id=run_id,
                            event_type=AgentEventType.APPROVAL_REQUESTED,
                            step_id=step.id,
                            message=f"Human approval required for {step.tool_name}: {auth.get('reason')}",
                            payload={
                                "approval_id": appr_req.id,
                                "run_id": run_id,
                                "tool_name": step.tool_name,
                                "action_summary": appr_req.action_summary,
                                "parameters": step.input_params,
                                "reason": auth.get("reason", ""),
                                "risk_level": appr_req.risk_level.value,
                            },
                        )
                        await event_bus.emit(ev_appr)
                        yield ev_appr

                        # Wait for user approval
                        approved = await approval_manager.wait_for_decision(appr_req.id, timeout_seconds=90.0)
                        if not approved:
                            step.status = "SKIPPED"
                            step.output = "Execution denied by user policy."
                            ev_denied = AgentEvent(
                                run_id=run_id,
                                event_type=AgentEventType.TOOL_FAILED,
                                step_id=step.id,
                                message="Tool execution rejected by user.",
                            )
                            await event_bus.emit(ev_denied)
                            yield ev_denied
                            continue
                        state.status = AgentStatus.EXECUTING

            # Delegate step to specialized sub-agent
            sub_res = await agent_supervisor.delegate(
                agent_type=step.agent_type,
                task=step.title,
                tool_name=step.tool_name,
                params=step.input_params,
            )

            step.output = sub_res.result
            step.duration_ms = sub_res.duration_ms
            state.tool_count += len(sub_res.tools_used)

            # Verification of step
            step_artifacts = []
            if isinstance(sub_res.result, dict) and "artifact_id" in sub_res.result:
                step_artifacts.append(sub_res.result)
                state.artifacts.append(sub_res.result)

            verif = verification_engine.verify_step_execution(
                tool_name=step.tool_name,
                tool_input=step.input_params,
                tool_output=sub_res.result,
                artifacts_generated=step_artifacts,
            )

            if verif.passed:
                step.status = "COMPLETED"
                ev_verif = AgentEvent(
                    run_id=run_id,
                    event_type=AgentEventType.VERIFICATION_COMPLETED,
                    step_id=step.id,
                    message=f"Step verified with {int(verif.confidence_score * 100)}% confidence.",
                    payload={"verification": verif.model_dump()},
                )
                await event_bus.emit(ev_verif)
                yield ev_verif
            else:
                step.status = "FAILED"
                ev_fail = AgentEvent(
                    run_id=run_id,
                    event_type=AgentEventType.TOOL_FAILED,
                    step_id=step.id,
                    message=f"Verification failed: {', '.join(verif.failures)}",
                    payload={"failures": verif.failures},
                )
                await event_bus.emit(ev_fail)
                yield ev_fail

                # Self-correction: replan
                plan = planner.replan_on_failure(plan, step.step_number, ", ".join(verif.failures))

            # Accumulate evidence
            out_str = json.dumps(sub_res.result) if isinstance(sub_res.result, (dict, list)) else str(sub_res.result)
            collected_context_pieces.append(f"[{step.title}]: {out_str[:1200]}")

            # Persist step, checkpoint, tool execution, and artifacts to DB
            async with async_session_factory() as session:
                db_step = AgentStep(
                    run_id=run_id,
                    step_number=step.step_number,
                    agent_type=step.agent_type,
                    title=step.title,
                    description=step.description,
                    status=step.status,
                    tool_name=step.tool_name,
                    input_json=json.dumps(step.input_params),
                    output_json=out_str[:4000],
                    duration_ms=step.duration_ms,
                    verification_json=json.dumps(verif.model_dump()),
                )
                session.add(db_step)

                # Persist step checkpoint
                db_checkpoint = AgentCheckpoint(
                    run_id=run_id,
                    step_id=step.id,
                    state_json=json.dumps({
                        "status": state.status.value,
                        "current_step": step.step_number,
                        "tool_count": state.tool_count,
                        "step_output": out_str[:1000],
                    }),
                    memory_json=json.dumps([c[:200] for c in collected_context_pieces]),
                )
                session.add(db_checkpoint)

                # Persist tool execution record if a tool was executed
                if step.tool_name:
                    db_tool = ToolExecution(
                        run_id=run_id,
                        tool_name=step.tool_name,
                        category=step.agent_type,
                        input_json=json.dumps(step.input_params),
                        output_json=out_str[:4000],
                        status="success" if verif.passed else "error",
                        duration_ms=step.duration_ms,
                        risk_level=str(auth.get("risk_level", "low")) if 'auth' in locals() and isinstance(auth, dict) else "low",
                    )
                    session.add(db_tool)

                # Persist generated artifacts
                for art in step_artifacts:
                    if isinstance(art, dict) and "name" in art and "file_path" in art:
                        db_art = Artifact(
                            run_id=run_id,
                            conversation_id=conversation_id,
                            name=art.get("name", "artifact"),
                            file_type=art.get("file_type", "text"),
                            file_path=art.get("file_path", ""),
                            size_bytes=art.get("size_bytes", 0),
                            metadata_json=json.dumps(art),
                        )
                        session.add(db_art)

                await session.commit()

        # 5. Final Synthesis
        state.status = AgentStatus.SYNTHESIZING
        synthesis_prompt = (
            f"Objective: {goal}\n\n"
            f"Executed Agent Evidences:\n" + "\n\n".join(collected_context_pieces) + "\n\n"
            f"Synthesize the findings into a definitive, structured, grounded technical report citing verified sources and deliverables."
        )

        synthesis_messages = [
            {
                "role": "system",
                "content": (
                    "You are Voltix Aetherion Final Synthesizer. "
                    "Based strictly on the provided evidence, formulate a comprehensive, clean, professional Markdown report. "
                    "All mathematical expressions and derivations MUST follow textbook LaTeX standards ($$ for display formulas, $ for inline math). "
                    "Format final results with \\boxed{...} and physical units. "
                    "Do NOT output internal tool call JSONs or thought loops. Output direct, well-structured Markdown."
                ),
            },
            {"role": "user", "content": synthesis_prompt},
        ]

        synthesis_tokens = []
        is_inside_think = False
        think_buffer = ""

        try:
            async for token in llm_router.route_stream(
                messages=synthesis_messages,
                model=state.model,
                provider_name="ollama",
            ):
                # Filter out internal <think>...</think> tags if model emits them
                if "<think>" in token:
                    is_inside_think = True
                    continue
                if "</think>" in token:
                    is_inside_think = False
                    continue
                if is_inside_think:
                    continue

                # Filter out accidental raw JSON query loop fragments
                if token.strip().startswith('{"query":') or token.strip().startswith('{ "query":'):
                    continue

                synthesis_tokens.append(token)
                ev_tok = AgentEvent(
                    run_id=run_id,
                    event_type=AgentEventType.TOKEN_STREAM,
                    message=token,
                    payload={"token": token},
                )
                await event_bus.emit(ev_tok)
                yield ev_tok
            state.final_output = "".join(synthesis_tokens).strip()
        except Exception as e:
            state.final_output = f"Completed agent steps successfully. Evidence gathered:\n\n" + "\n\n".join(collected_context_pieces)

        state.status = AgentStatus.COMPLETED
        state.finished_at = time.time()

        # Update DB Run
        async with async_session_factory() as session:
            stmt = select(AgentRun).where(AgentRun.id == run_id)
            res = await session.execute(stmt)
            db_run = res.scalar_one_or_none()
            if db_run:
                db_run.status = "COMPLETED"
                db_run.output_summary = state.final_output[:2000]
                db_run.tool_count = state.tool_count
                await session.commit()

        # Final Event
        ev_done = AgentEvent(
            run_id=run_id,
            event_type=AgentEventType.AGENT_COMPLETED,
            message="Objective completed successfully.",
            payload={
                "final_output": state.final_output,
                "artifacts": state.artifacts,
                "tool_count": state.tool_count,
                "runtime_s": round(state.finished_at - state.started_at, 2),
            },
        )
        await event_bus.emit(ev_done)
        yield ev_done


agent_runtime = AgentRuntime()
