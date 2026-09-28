import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.events import event_bus
from backend.app.agent.policy import approval_manager
from backend.app.agent.runtime import agent_runtime
from backend.app.database.database import get_db
from backend.app.database.models import AgentRun, AgentStep, Artifact, TaskModel
from backend.app.tools.registry import tool_registry

router = APIRouter(prefix="/agent")


class AgentRunRequest(BaseModel):
    goal: str
    conversation_id: Optional[str] = None
    model: Optional[str] = None
    file_ids: Optional[List[str]] = None


class AgentApprovalResponse(BaseModel):
    approval_id: str
    approved: bool


class ControlActionRequest(BaseModel):
    run_id: str


@router.post("/run")
async def run_agent(req: AgentRunRequest):
    """Executes an agent run autonomously, streaming lifecycle events via Server-Sent Events (SSE)."""
    async def event_generator():
        try:
            async for ev in agent_runtime.run(
                goal=req.goal,
                conversation_id=req.conversation_id,
                model_override=req.model,
                file_ids=req.file_ids,
            ):
                payload = {
                    "event_type": ev.event_type.value,
                    "run_id": ev.run_id,
                    "step_id": ev.step_id,
                    "timestamp": ev.timestamp,
                    "message": ev.message,
                    "payload": ev.payload,
                }
                yield f"data: {json.dumps(payload)}\n\n"
        except Exception as e:
            err_payload = {"event_type": "AgentFailed", "message": str(e)}
            yield f"data: {json.dumps(err_payload)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )


@router.post("/pause")
async def pause_agent(payload: ControlActionRequest):
    success = agent_runtime.pause_run(payload.run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Active run not found.")
    return {"status": "paused", "run_id": payload.run_id}


@router.post("/resume")
async def resume_agent(payload: ControlActionRequest):
    success = agent_runtime.resume_run(payload.run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paused run not found.")
    return {"status": "resumed", "run_id": payload.run_id}


@router.post("/cancel")
async def cancel_agent(payload: ControlActionRequest):
    success = agent_runtime.cancel_run(payload.run_id)
    if not success:
        raise HTTPException(status_code=404, detail="Active run not found.")
    return {"status": "cancelled", "run_id": payload.run_id}


@router.post("/approvals/{approval_id}/respond")
@router.post("/approvals/{approval_id}")
async def respond_to_approval(approval_id: str, payload: AgentApprovalResponse):
    success = approval_manager.respond(approval_id, payload.approved)
    if not success:
        raise HTTPException(status_code=404, detail="Approval request not found or already closed.")
    return {"status": "success", "approval_id": approval_id, "approved": payload.approved}



@router.get("/approvals/pending")
async def get_pending_approvals():
    return [p.model_dump() for p in approval_manager.get_all_pending()]


@router.get("/runs/{run_id}")
async def get_agent_run(run_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(AgentRun).where(AgentRun.id == run_id)
    res = await db.execute(stmt)
    run = res.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Agent run not found.")

    step_stmt = select(AgentStep).where(AgentStep.run_id == run_id).order_by(AgentStep.step_number)
    step_res = await db.execute(step_stmt)
    steps = step_res.scalars().all()

    return {
        "id": run.id,
        "goal": run.goal,
        "status": run.status,
        "model": run.model,
        "current_step": run.current_step,
        "tool_count": run.tool_count,
        "output_summary": run.output_summary,
        "created_at": run.created_at,
        "steps": [
            {
                "id": s.id,
                "step_number": s.step_number,
                "agent_type": s.agent_type,
                "title": s.title,
                "status": s.status,
                "tool_name": s.tool_name,
                "duration_ms": s.duration_ms,
                "output": s.output_json,
            }
            for s in steps
        ],
    }


@router.get("/tools")
async def list_tools(category: Optional[str] = None):
    tools = tool_registry.list_tools(category)
    return {"tools": [t.model_dump() for t in tools], "total": len(tools)}


@router.get("/tools/metrics")
async def get_tool_metrics():
    return tool_registry.get_metrics()
