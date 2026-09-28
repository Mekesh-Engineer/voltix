import asyncio
import time
from typing import Dict, Any, Callable, List, Optional, Union
from pydantic import BaseModel, Field
from backend.app.core.exceptions import ToolExecutionError
from backend.app.core.logging import logger
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult


class ToolMetric(BaseModel):
    tool_name: str
    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    total_latency_ms: float = 0.0

    @property
    def success_rate(self) -> float:
        if self.total_calls == 0:
            return 1.0
        return round(self.successful_calls / self.total_calls, 3)

    @property
    def avg_latency_ms(self) -> float:
        if self.total_calls == 0:
            return 0.0
        return round(self.total_latency_ms / self.total_calls, 2)


class ToolResultCache:
    """Intelligent memory cache for safe deterministic tool calls (Section 36)."""
    def __init__(self, ttl_seconds: float = 300.0):
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, float] = {}
        self.ttl = ttl_seconds

    def _make_key(self, tool_name: str, kwargs: Dict[str, Any]) -> str:
        sorted_items = sorted(kwargs.items(), key=lambda x: x[0])
        return f"{tool_name}:{str(sorted_items)}"

    def get(self, tool_name: str, kwargs: Dict[str, Any]) -> Optional[Any]:
        key = self._make_key(tool_name, kwargs)
        if key in self._cache:
            if time.time() - self._timestamps[key] < self.ttl:
                return self._cache[key]
            else:
                del self._cache[key]
                del self._timestamps[key]
        return None

    def set(self, tool_name: str, kwargs: Dict[str, Any], result: Any):
        key = self._make_key(tool_name, kwargs)
        self._cache[key] = result
        self._timestamps[key] = time.time()


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._handlers: Dict[str, Callable] = {}
        self._tool_instances: Dict[str, BaseTool] = {}
        self._metrics: Dict[str, ToolMetric] = {}
        self.cache = ToolResultCache()
        self._initialized = False

    def _ensure_initialized(self):
        if not self._initialized:
            self._initialized = True
            self._initialize_core_tools()


    def register(self, definition: Union[ToolDefinition, Any], handler: Optional[Callable] = None):
        """Registers a tool via definition and handler or BaseTool."""
        if isinstance(definition, BaseTool):
            tool_inst = definition
            name = tool_inst.name
            self._tool_instances[name] = tool_inst
            self._tools[name] = tool_inst.definition
            self._handlers[name] = tool_inst.execute
        else:
            name = definition.name
            if not isinstance(definition, ToolDefinition):
                # Legacy conversion
                definition = ToolDefinition(
                    name=name,
                    description=getattr(definition, "description", ""),
                    input_schema=getattr(definition, "parameters", {}),
                    timeout_seconds=getattr(definition, "timeout", 15),
                )
            self._tools[name] = definition
            if handler:
                self._handlers[name] = handler

        if name not in self._metrics:
            self._metrics[name] = ToolMetric(tool_name=name)

        logger.info(f"Registered tool: {name}")

    def get(self, name: str) -> Optional[ToolDefinition]:
        self._ensure_initialized()
        return self._tools.get(name)

    def list_tools(self, category: Optional[str] = None) -> List[ToolDefinition]:
        self._ensure_initialized()
        tools = list(self._tools.values())
        if category:
            tools = [t for t in tools if t.category == category]
        return tools

    def get_metrics(self) -> Dict[str, Dict[str, Any]]:
        self._ensure_initialized()
        return {
            k: {
                "total_calls": m.total_calls,
                "successful_calls": m.successful_calls,
                "success_rate": m.success_rate,
                "avg_latency_ms": m.avg_latency_ms,
            }
            for k, m in self._metrics.items()
        }

    async def execute(self, name: str, **kwargs) -> Any:
        self._ensure_initialized()
        if name not in self._handlers:
            raise ToolExecutionError(f"Tool '{name}' is not registered.")


        tool_def = self._tools[name]
        start_time = time.time()
        metric = self._metrics.get(name, ToolMetric(tool_name=name))
        metric.total_calls += 1

        # Check Cache for deterministic tools
        if tool_def.category in ("math", "knowledge"):
            cached = self.cache.get(name, kwargs)
            if cached is not None:
                logger.info(f"Tool Cache Hit for '{name}'")
                return cached

        handler = self._handlers[name]
        timeout_sec = getattr(tool_def, "timeout_seconds", 30)

        try:
            logger.info(f"Executing tool '{name}' with args {kwargs}")
            if asyncio.iscoroutinefunction(handler):
                result = await asyncio.wait_for(handler(**kwargs), timeout=timeout_sec)
            else:
                result = handler(**kwargs)

            duration_ms = round((time.time() - start_time) * 1000, 2)
            metric.total_latency_ms += duration_ms

            if isinstance(result, ToolResult) and not result.success:
                metric.failed_calls += 1
                raise ToolExecutionError(result.error or f"Tool '{name}' execution failed.")

            metric.successful_calls += 1

            # Convert ToolResult to standard output if necessary
            output_val = result.output if isinstance(result, ToolResult) else result

            # Cache safe math/knowledge queries
            if tool_def.category in ("math", "knowledge"):
                self.cache.set(name, kwargs, output_val)

            return output_val


        except ToolExecutionError:
            metric.failed_calls += 1
            raise
        except asyncio.TimeoutError:
            metric.failed_calls += 1
            raise ToolExecutionError(f"Tool '{name}' timed out after {timeout_sec}s.")
        except Exception as e:
            metric.failed_calls += 1
            raise ToolExecutionError(f"Tool '{name}' execution failed: {str(e)}")

    def _initialize_core_tools(self):
        """Loads and auto-registers the extended tool ecosystem."""
        from backend.app.tools.knowledge import KnowledgeSearchTool, KnowledgeListDocumentsTool, KnowledgeGraphQueryTool
        from backend.app.tools.web import WebSearchTool, WebOpenTool, WebResearchTool
        from backend.app.tools.filesystem import FilesystemListTool, FilesystemReadTool, FilesystemWriteTool, FilesystemDeleteTool
        from backend.app.tools.artifacts import get_artifact_tools
        from backend.app.tools.data import DataInspectTool, DataStatisticsTool, DataFilterTool
        from backend.app.tools.code import CodeSearchTool, CodeReadTool, CodeDiffTool, CodeTestTool
        from backend.app.tools.database_tools import DbSchemaTool, DbQueryReadonlyTool
        from backend.app.tools.terminal import TerminalRunSafeTool, TerminalWhichTool
        from backend.app.tools.math_tools import MathCalculateTool, MathStatisticsTool
        from backend.app.tools.memory_tools import MemoryStoreTool, MemorySearchTool
        from backend.app.tools.tasks_tools import TaskCreateTool, TaskListTool
        from backend.app.tools.vision import VisionInspectTool
        from backend.app.tools.python import PythonTool

        core_tool_instances = [
            KnowledgeSearchTool(),
            KnowledgeListDocumentsTool(),
            KnowledgeGraphQueryTool(),
            WebSearchTool(),
            WebOpenTool(),
            WebResearchTool(),
            FilesystemListTool(),
            FilesystemReadTool(),
            FilesystemWriteTool(),
            FilesystemDeleteTool(),
            DataInspectTool(),
            DataStatisticsTool(),
            DataFilterTool(),
            CodeSearchTool(),
            CodeReadTool(),
            CodeDiffTool(),
            CodeTestTool(),
            DbSchemaTool(),
            DbQueryReadonlyTool(),
            TerminalRunSafeTool(),
            TerminalWhichTool(),
            MathCalculateTool(),
            MathStatisticsTool(),
            MemoryStoreTool(),
            MemorySearchTool(),
            TaskCreateTool(),
            TaskListTool(),
            VisionInspectTool(),
            PythonTool("python"),
            PythonTool("python.execute"),
        ]

        # Artifact generators
        core_tool_instances.extend(get_artifact_tools())

        for t in core_tool_instances:
            self.register(t)




tool_registry = ToolRegistry()
