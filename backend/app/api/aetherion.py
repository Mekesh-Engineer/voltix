from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.app.agent.aetherion import (
    aetherion_orchestrator,
    aetherion_router,
    governor,
    ExecutionProfile,
    ROLE_TO_MODEL,
    AetherionModelRole,
)
from backend.app.agent.model_registry import model_registry

router = APIRouter(prefix="/aetherion", tags=["Aetherion"])


class AetherionChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    conversation_id: Optional[str] = None
    model: Optional[str] = "aetherion"
    profile: Optional[str] = "balanced"  # fast, balanced, deep, max
    mode: Optional[str] = "auto"
    privacy_mode: Optional[str] = "auto"  # auto, local, cloud
    attachments: List[str] = Field(default_factory=list)
    tools: List[str] = Field(default_factory=list)
    tools_enabled: bool = True


class AetherionRoutePreviewRequest(BaseModel):
    message: str
    profile: Optional[str] = "balanced"
    privacy_mode: Optional[str] = "auto"
    has_files: bool = False
    model_override: Optional[str] = None


@router.post("/chat")
async def aetherion_chat_stream(request: AetherionChatRequest):
    """
    Unified Aetherion Chat & Agent Orchestration Streaming Endpoint (Section 20).
    Processes user goals through adaptive model routing, task graph planning,
    tool delegation, independent verification, and deliverables synthesis.
    """
    generator = aetherion_orchestrator.stream_orchestration(
        prompt=request.message,
        conversation_id=request.conversation_id,
        profile_str=request.profile or "balanced",
        privacy_mode=request.privacy_mode or "auto",
        attachments=request.attachments,
        tools_enabled=request.tools_enabled,
        model_override=request.model,
        mode=request.mode or "auto",
    )

    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/route/preview")
async def preview_route(request: AetherionRoutePreviewRequest):
    """Inspects the router's adaptive decision without executing."""
    try:
        prof = ExecutionProfile(request.profile.lower()) if request.profile else ExecutionProfile.BALANCED
    except Exception:
        prof = ExecutionProfile.BALANCED

    decision = aetherion_router.route(
        prompt=request.message,
        profile=prof,
        privacy_mode=request.privacy_mode or "auto",
        has_files=request.has_files,
        model_override=request.model_override,
    )
    return decision.model_dump()


@router.get("/models")
async def list_aetherion_fleet():
    """Returns the unified Aetherion logical model and fleet capabilities."""
    profiles = model_registry.list_all()

    fleet_roles = [
        {
            "role": role.value,
            "model_id": model_id,
            "title": role.name.capitalize(),
            "description": model_registry.get_profile(model_id).description if model_registry.get_profile(model_id) else "",
            "health": model_registry.get_health(model_id).status,
        }
        for role, model_id in ROLE_TO_MODEL.items()
    ]

    return {
        "unified_model": {
            "id": "aetherion",
            "name": "Voltix Aetherion",
            "provider": "aetherion",
            "category": "Unified Fleet",
            "description": "Unified adaptive AI command center orchestrating specialized reasoning engines.",
            "fleet_size": len(ROLE_TO_MODEL),
        },
        "fleet": fleet_roles,
        "underlying_engines": [p.model_dump() for p in profiles],
    }


@router.get("/profiles")
async def list_execution_profiles():
    """Lists available Aetherion execution profiles (Section 21)."""
    return {
        "profiles": [
            {
                "id": "fast",
                "label": "⚡ Fast",
                "description": "Prioritizes minimal latency and responsive direct execution.",
                "latency_tier": "ultra_low",
                "cost_tier": "minimal",
            },
            {
                "id": "balanced",
                "label": "⚖️ Balanced",
                "description": "Default profile balancing high-quality reasoning, speed, and tool usage.",
                "latency_tier": "standard",
                "cost_tier": "moderate",
            },
            {
                "id": "deep",
                "label": "🧠 Deep Reasoning",
                "description": "Multi-step reasoning, comprehensive research, and thorough citation checks.",
                "latency_tier": "extended",
                "cost_tier": "high",
            },
            {
                "id": "max",
                "label": "🚀 Aetherion Max",
                "description": "Full multi-agent swarm orchestration, debate, and verified deliverables.",
                "latency_tier": "autonomous",
                "cost_tier": "maximum",
            },
        ]
    }


@router.get("/status")
async def get_aetherion_status():
    """Returns real-time fleet health, active workers, and resource governor metrics (Section 17)."""
    metrics = governor.get_status_metrics()
    fleet_health = {
        model_id: model_registry.get_health(model_id).status
        for model_id in ROLE_TO_MODEL.values()
    }
    return {
        "status": "online",
        "system": "Voltix Aetherion OS",
        "metrics": metrics,
        "fleet_health": fleet_health,
    }
