from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ConversationBase(BaseModel):
    title: str = "New Chat"
    model: Optional[str] = None
    provider: Optional[str] = None


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    metadata: Optional[Dict[str, Any]] = None
    parent_id: Optional[str] = None
    branch_index: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationSummary(BaseModel):
    id: str
    title: str
    model: Optional[str] = None
    provider: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_pinned: bool = False
    message_count: int = 0
    last_message_preview: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationDetail(BaseModel):
    id: str
    title: str
    model: Optional[str] = None
    provider: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_pinned: bool = False
    parent_conversation_id: Optional[str] = None
    messages: List[MessageResponse] = []

    model_config = ConfigDict(from_attributes=True)


class ConversationBranchRequest(BaseModel):
    fork_from_message_id: str


class ConversationPinRequest(BaseModel):
    is_pinned: bool
