import time
import uuid
from enum import Enum
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class AgentStatus(str, Enum):
    CREATED = "CREATED"
    ANALYZING = "ANALYZING"
    PLANNING = "PLANNING"
    WAITING_FOR_TOOL = "WAITING_FOR_TOOL"
    EXECUTING = "EXECUTING"
    WAITING_FOR_APPROVAL = "WAITING_FOR_APPROVAL"
    VERIFYING = "VERIFYING"
    REPLANNING = "REPLANNING"
    SYNTHESIZING = "SYNTHESIZING"
    PAUSED = "PAUSED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    TIMEOUT = "TIMEOUT"


class Evidence(BaseModel):
    claim: str
    source: str
    source_type: str = "document"  # document, web, tool, database, calculation
    excerpt: str = ""
    confidence: float = 1.0


class VerificationResult(BaseModel):
    passed: bool = True
    checks_run: List[str] = Field(default_factory=list)
    failures: List[str] = Field(default_factory=list)
    diagnostics: Dict[str, Any] = Field(default_factory=dict)
    confidence_score: float = 1.0


class PlanStep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    step_number: int
    agent_type: str = "supervisor"  # supervisor, research, coding, data, rag, math, document, verifier
    title: str
    description: str = ""
    tool_name: Optional[str] = None
    input_params: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list)  # step IDs that must complete first
    status: str = "PENDING"  # PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    output: Any = None
    duration_ms: float = 0.0
    error: Optional[str] = None


class AgentPlan(BaseModel):
    goal: str
    steps: List[PlanStep] = Field(default_factory=list)
    estimated_time_s: int = 10
    requires_human_approval: bool = False
    created_at: float = Field(default_factory=time.time)


class AgentState(BaseModel):
    run_id: str
    parent_run_id: Optional[str] = None
    conversation_id: Optional[str] = None
    user_id: str = "default_user"
    goal: str
    status: AgentStatus = AgentStatus.CREATED
    model: str = "qwen2.5:7b"
    plan: Optional[AgentPlan] = None
    current_step_index: int = 0
    iteration_count: int = 0
    tool_count: int = 0
    token_budget: int = 64000
    tokens_used: int = 0
    time_budget_seconds: int = 300
    started_at: float = Field(default_factory=time.time)
    finished_at: Optional[float] = None
    step_results: Dict[str, Any] = Field(default_factory=dict)
    evidences: List[Evidence] = Field(default_factory=list)
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    final_output: str = ""
    error: Optional[str] = None
