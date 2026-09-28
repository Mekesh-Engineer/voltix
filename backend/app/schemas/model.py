from typing import List, Optional
from pydantic import BaseModel


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str = "ollama"  # Ollama permanent provider
    category: str  # "Local" or "Cloud"
    description: Optional[str] = None
    context_window: Optional[int] = 8192
    available: bool = True
    icon_type: Optional[str] = "ollama"


class ModelListResponse(BaseModel):
    models: List[ModelInfo]
    default_model: str
    default_provider: str
    ollama_status: bool


class ModelTestRequest(BaseModel):
    provider: str
    base_url: Optional[str] = None
    api_key: Optional[str] = None


class ModelTestResponse(BaseModel):
    status: str
    provider: str
    latency_ms: float
    available_models: List[str] = []
    details: str
