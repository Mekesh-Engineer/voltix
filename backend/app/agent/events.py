import asyncio
import time
from enum import Enum
from typing import Dict, Any, List, Optional, Callable
from pydantic import BaseModel, Field
from backend.app.core.logging import logger


class AgentEventType(str, Enum):
    AGENT_STARTED = "AgentStarted"
    INTENT_CLASSIFIED = "IntentClassified"
    PLAN_CREATED = "PlanCreated"
    MODEL_SELECTED = "ModelSelected"
    STEP_STARTED = "StepStarted"
    TOOL_STARTED = "ToolStarted"
    TOOL_COMPLETED = "ToolCompleted"
    TOOL_FAILED = "ToolFailed"
    RETRIEVAL_COMPLETED = "RetrievalCompleted"
    ARTIFACT_CREATED = "ArtifactCreated"
    VERIFICATION_STARTED = "VerificationStarted"
    VERIFICATION_COMPLETED = "VerificationCompleted"
    APPROVAL_REQUESTED = "ApprovalRequested"
    APPROVAL_RESPONDED = "ApprovalResponded"
    AGENT_PAUSED = "AgentPaused"
    AGENT_RESUMED = "AgentResumed"
    AGENT_CANCELLED = "AgentCancelled"
    AGENT_COMPLETED = "AgentCompleted"
    AGENT_FAILED = "AgentFailed"
    TOKEN_STREAM = "TokenStream"


class AgentEvent(BaseModel):
    run_id: str
    event_type: AgentEventType
    step_id: Optional[str] = None
    timestamp: float = Field(default_factory=time.time)
    message: str = ""
    payload: Dict[str, Any] = Field(default_factory=dict)


class EventBus:
    """Async pub/sub Event Bus for agent telemetry, SSE streams, and observability (Section 54)."""
    def __init__(self):
        self._subscribers: Dict[str, List[asyncio.Queue]] = {}
        self._global_subscribers: List[asyncio.Queue] = []

    def subscribe(self, run_id: Optional[str] = None) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue()
        if run_id:
            if run_id not in self._subscribers:
                self._subscribers[run_id] = []
            self._subscribers[run_id].append(q)
        else:
            self._global_subscribers.append(q)
        return q

    def unsubscribe(self, queue: asyncio.Queue, run_id: Optional[str] = None):
        if run_id and run_id in self._subscribers:
            if queue in self._subscribers[run_id]:
                self._subscribers[run_id].remove(queue)
        elif queue in self._global_subscribers:
            self._global_subscribers.remove(queue)

    async def emit(self, event: AgentEvent):
        logger.debug(f"EventBus emit: [{event.run_id}] {event.event_type} - {event.message}")
        targets = []
        if event.run_id in self._subscribers:
            targets.extend(self._subscribers[event.run_id])
        targets.extend(self._global_subscribers)

        for q in targets:
            try:
                await q.put(event)
            except Exception as e:
                logger.warning(f"Error publishing event to subscriber: {e}")


event_bus = EventBus()
