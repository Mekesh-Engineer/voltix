import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False, default="New Chat")
    model = Column(String(100), nullable=True)
    provider = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
    is_pinned = Column(Boolean, default=False, nullable=False)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    files = relationship("FileModel", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system, tool
    content = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON for citations, timing, tools, tokens
    parent_id = Column(String(36), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    branch_index = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    conversation = relationship("Conversation", back_populates="messages")


class FileModel(Base):
    __tablename__ = "files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    mime_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)
    path = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    conversation = relationship("Conversation", back_populates="files")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(String(50), primary_key=True, default="default")
    theme = Column(String(20), default="system")
    default_model = Column(String(100), default="qwen2.5:7b")
    default_provider = Column(String(50), default="ollama")
    temperature = Column(Float, default=0.7)
    max_tokens = Column(Integer, default=4096)
    memory_enabled = Column(Boolean, default=True)
    rag_enabled = Column(Boolean, default=True)
    tools_enabled = Column(Boolean, default=True)
    config_json = Column(Text, nullable=True)


class AgentRun(Base):
    __tablename__ = "agent_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    parent_run_id = Column(String(36), nullable=True, index=True)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    user_id = Column(String(100), default="default_user", nullable=False)
    goal = Column(Text, nullable=False)
    status = Column(String(50), default="CREATED", nullable=False, index=True)  # CREATED, ANALYZING, PLANNING, EXECUTING, WAITING_FOR_APPROVAL, VERIFYING, COMPLETED, FAILED, CANCELLED, PAUSED
    model = Column(String(100), nullable=True)
    plan_json = Column(Text, nullable=True)
    current_step = Column(Integer, default=0, nullable=False)
    iteration_count = Column(Integer, default=0, nullable=False)
    tool_count = Column(Integer, default=0, nullable=False)
    token_budget = Column(Integer, default=64000, nullable=False)
    tokens_used = Column(Integer, default=0, nullable=False)
    time_budget_seconds = Column(Integer, default=300, nullable=False)
    output_summary = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=utc_now)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    steps = relationship("AgentStep", back_populates="run", cascade="all, delete-orphan", order_by="AgentStep.step_number")
    checkpoints = relationship("AgentCheckpoint", back_populates="run", cascade="all, delete-orphan")
    approvals = relationship("ToolApproval", back_populates="run", cascade="all, delete-orphan")
    artifacts = relationship("Artifact", back_populates="run", cascade="all, delete-orphan")


class AgentStep(Base):
    __tablename__ = "agent_steps"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    step_number = Column(Integer, nullable=False)
    agent_type = Column(String(50), default="supervisor", nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, RUNNING, COMPLETED, FAILED, SKIPPED
    tool_name = Column(String(100), nullable=True)
    input_json = Column(Text, nullable=True)
    output_json = Column(Text, nullable=True)
    duration_ms = Column(Float, default=0.0)
    verification_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    run = relationship("AgentRun", back_populates="steps")


class AgentCheckpoint(Base):
    __tablename__ = "agent_checkpoints"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    step_id = Column(String(36), nullable=True)
    state_json = Column(Text, nullable=False)
    memory_json = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now)

    run = relationship("AgentRun", back_populates="checkpoints")


class ToolExecution(Base):
    __tablename__ = "tool_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True, index=True)
    tool_name = Column(String(100), nullable=False, index=True)
    category = Column(String(50), default="general", nullable=False)
    input_json = Column(Text, nullable=True)
    output_json = Column(Text, nullable=True)
    status = Column(String(20), default="success", nullable=False)  # success, error, rejected
    duration_ms = Column(Float, default=0.0)
    risk_level = Column(String(20), default="low", nullable=False)  # low, medium, high, irreversible
    requires_confirmation = Column(Boolean, default=False)
    confirmed_by_user = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)


class ToolApproval(Base):
    __tablename__ = "tool_approvals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name = Column(String(100), nullable=False)
    action_summary = Column(String(255), nullable=False)
    parameters_json = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    risk_level = Column(String(20), default="medium", nullable=False)
    status = Column(String(20), default="pending", nullable=False, index=True)  # pending, approved, denied
    created_at = Column(DateTime(timezone=True), default=utc_now)
    responded_at = Column(DateTime(timezone=True), nullable=True)

    run = relationship("AgentRun", back_populates="approvals")


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    run_id = Column(String(36), ForeignKey("agent_runs.id", ondelete="SET NULL"), nullable=True, index=True)
    conversation_id = Column(String(36), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)  # markdown, csv, json, text, docx, pdf, xlsx, code
    file_path = Column(String(500), nullable=False)
    size_bytes = Column(Integer, default=0, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    metadata_json = Column(Text, nullable=True)  # source documents, tools used, data provenance
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)

    run = relationship("AgentRun", back_populates="artifacts")


class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, RUNNING, WAITING, BLOCKED, COMPLETED, FAILED, CANCELLED
    priority = Column(String(20), default="normal", nullable=False)  # low, normal, high, critical
    run_id = Column(String(36), nullable=True, index=True)
    schedule_type = Column(String(50), nullable=True)  # once, recurring, cron
    schedule_cron = Column(String(100), nullable=True)
    result_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class MemoryEntry(Base):
    __tablename__ = "memory_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    category = Column(String(50), default="semantic", nullable=False, index=True)  # working, semantic, episodic, long_term
    key = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    source = Column(String(255), nullable=True)
    confidence = Column(Float, default=1.0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, index=True)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

