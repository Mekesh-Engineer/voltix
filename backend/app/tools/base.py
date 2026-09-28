from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ToolDefinition(BaseModel):
    name: str
    description: str
    category: str = "general"  # knowledge, web, filesystem, artifact, data, code, database, git, terminal, math, vision, memory, task
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)
    permissions: List[str] = Field(default_factory=list)
    risk_level: str = "low"  # low, medium, high, irreversible
    requires_confirmation: bool = False
    timeout_seconds: float = 30.0
    supports_streaming: bool = False
    supports_cancellation: bool = True


class ToolResult(BaseModel):
    tool_name: str
    success: bool = True
    output: Any = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseTool(ABC):
    def __init__(self, definition: ToolDefinition):
        self.definition = definition

    @property
    def name(self) -> str:
        return self.definition.name

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Executes the tool with the given arguments."""
        pass

    def validate_input(self, kwargs: Dict[str, Any]) -> bool:
        """Basic validation against required fields in input_schema."""
        required = self.definition.input_schema.get("required", [])
        for req in required:
            if req not in kwargs:
                raise ValueError(f"Missing required parameter '{req}' for tool '{self.name}'")
        return True
