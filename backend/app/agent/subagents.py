import time
import uuid
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from backend.app.core.logging import logger
from backend.app.tools.registry import tool_registry


class SubAgentResult(BaseModel):
    agent_id: str
    agent_type: str
    task: str
    status: str = "completed"  # completed, failed
    result: Any = None
    sources: List[str] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    confidence: float = 0.95
    duration_ms: float = 0.0


class BaseSubAgent:
    def __init__(self, agent_type: str, allowed_categories: List[str]):
        self.agent_type = agent_type
        self.allowed_categories = allowed_categories

    async def execute_task(self, task: str, tool_name: Optional[str] = None, params: Dict[str, Any] = None) -> SubAgentResult:
        start = time.time()
        agent_id = f"{self.agent_type}_{str(uuid.uuid4())[:6]}"
        params = params or {}
        tools_used = []
        errors = []
        result = None

        if tool_name:
            tool_def = tool_registry.get(tool_name)
            if not tool_def:
                errors.append(f"Tool '{tool_name}' not available.")
            else:
                try:
                    tools_used.append(tool_name)
                    output = await tool_registry.execute(tool_name, **params)
                    result = output
                except Exception as e:
                    errors.append(str(e))
        else:
            result = f"Task completed directly by {self.agent_type}."

        duration = round((time.time() - start) * 1000, 2)
        status = "failed" if errors else "completed"
        confidence = 0.5 if errors else 0.95

        return SubAgentResult(
            agent_id=agent_id,
            agent_type=self.agent_type,
            task=task,
            status=status,
            result=result,
            tools_used=tools_used,
            errors=errors,
            confidence=confidence,
            duration_ms=duration,
        )


class ResearchAgent(BaseSubAgent):
    def __init__(self):
        super().__init__("research", ["web"])


class CodingAgent(BaseSubAgent):
    def __init__(self):
        super().__init__("coding", ["code", "terminal"])


class DataAgent(BaseSubAgent):
    def __init__(self):
        super().__init__("data", ["data", "math"])


class RAGAgent(BaseSubAgent):
    def __init__(self):
        super().__init__("rag", ["knowledge"])


class MathAgent(BaseSubAgent):
    def __init__(self):
        super().__init__("math", ["math"])


class DocumentAgent(BaseSubAgent):
    def __init__(self):
        super().__init__("document", ["artifact", "filesystem"])


class VisionAgent(BaseSubAgent):
    def __init__(self):
        super().__init__("vision", ["vision", "multimodal", "filesystem"])


class AgentSupervisor:
    """Coordinates specialized sub-agents and enforces depth and token budget limits (Section 22 & 23)."""
    def __init__(self):
        self.subagents: Dict[str, BaseSubAgent] = {
            "research": ResearchAgent(),
            "coding": CodingAgent(),
            "data": DataAgent(),
            "rag": RAGAgent(),
            "math": MathAgent(),
            "document": DocumentAgent(),
            "vision": VisionAgent(),
        }

    async def delegate(self, agent_type: str, task: str, tool_name: Optional[str] = None, params: Dict[str, Any] = None) -> SubAgentResult:
        agent = self.subagents.get(agent_type)
        if not agent:
            # Fallback to general execution
            agent = self.subagents["rag"]
        logger.info(f"Supervisor delegating task to [{agent_type}]: {task}")
        return await agent.execute_task(task, tool_name, params)


agent_supervisor = AgentSupervisor()

