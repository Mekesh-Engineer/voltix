import time
from typing import Dict, Any, List
from sqlalchemy import select, delete
from backend.app.database.database import async_session_factory
from backend.app.database.models import MemoryEntry
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger


class MemoryStoreTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="memory.store",
                description="Stores an important fact, preference, or concept in user long-term/semantic memory.",
                category="memory",
                input_schema={
                    "type": "object",
                    "properties": {
                        "key": {"type": "string", "description": "Subject or memory key identifier"},
                        "content": {"type": "string", "description": "Information to remember"},
                        "category": {"type": "string", "enum": ["semantic", "working", "episodic", "long_term"], "default": "semantic"},
                    },
                    "required": ["key", "content"],
                },
                risk_level="low",
            )
        )

    async def execute(self, key: str, content: str, category: str = "semantic", **kwargs) -> ToolResult:
        start = time.time()
        try:
            async with async_session_factory() as session:
                entry = MemoryEntry(key=key, content=content, category=category)
                session.add(entry)
                await session.commit()

            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(tool_name=self.name, success=True, output=f"Stored memory for '{key}' in category '{category}'.", duration_ms=duration)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


class MemorySearchTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="memory.search",
                description="Searches stored memories, user preferences, and historical facts by keyword.",
                category="memory",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Keyword to look up in memories"},
                    },
                    "required": ["query"],
                },
                risk_level="low",
            )
        )

    async def execute(self, query: str, **kwargs) -> ToolResult:
        start = time.time()
        try:
            async with async_session_factory() as session:
                stmt = select(MemoryEntry).where(
                    (MemoryEntry.key.ilike(f"%{query}%")) | (MemoryEntry.content.ilike(f"%{query}%"))
                ).limit(10)
                res = await session.execute(stmt)
                entries = res.scalars().all()

                memories = [{"key": m.key, "content": m.content, "category": m.category} for m in entries]

            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(tool_name=self.name, success=True, output=memories if memories else f"No memories found matching '{query}'.", duration_ms=duration)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)
