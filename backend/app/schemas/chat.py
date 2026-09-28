from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(default="")
    model: Optional[str] = None
    provider: Optional[str] = None
    stream: bool = True
    attachments: List[str] = Field(default_factory=list)  # List of file IDs
    images: List[str] = Field(default_factory=list)  # Optional list of base64 data strings or URLs
    tools_enabled: bool = True
    execution_profile: Optional[str] = "balanced"
    privacy_mode: Optional[str] = "auto"
    mode: Optional[str] = "auto"
    tools: Optional[List[str]] = Field(default_factory=list)




class ChatMessageSchema(BaseModel):
    id: str
    role: str
    content: str
    created_at: str
    metadata: Optional[Dict[str, Any]] = None


class CitationItem(BaseModel):
    id: int
    source: str
    filename: str
    snippet: str
    score: float


class StreamingTokenEvent(BaseModel):
    type: str = "token"
    content: str


class StreamingCitationEvent(BaseModel):
    type: str = "citations"
    citations: List[CitationItem]


class StreamingStatusEvent(BaseModel):
    type: str = "status"
    status: str  # e.g., "Thinking...", "Searching uploaded documents...", "Executing calculation..."


class StreamingDoneEvent(BaseModel):
    type: str = "done"
    message_id: str
    conversation_id: str
    title: Optional[str] = None


class StreamingErrorEvent(BaseModel):
    type: str = "error"
    message: str
