from typing import Optional
from pydantic import BaseModel, Field


class SettingsSchema(BaseModel):
    theme: str = "system"
    default_model: str = "qwen2.5:7b"
    default_provider: str = "ollama"
    temperature: float = 0.7
    max_tokens: int = 2048
    memory_enabled: bool = True
    rag_enabled: bool = True
    tools_enabled: bool = True
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_status: bool = True


class SettingsUpdateSchema(BaseModel):
    theme: Optional[str] = None
    default_model: Optional[str] = None
    default_provider: Optional[str] = None
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(None, ge=256, le=32768)
    memory_enabled: Optional[bool] = None
    rag_enabled: Optional[bool] = None
    tools_enabled: Optional[bool] = None
    ollama_base_url: Optional[str] = None
