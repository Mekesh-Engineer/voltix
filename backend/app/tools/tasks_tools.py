import time
from typing import Dict, Any, List
from sqlalchemy import select
from backend.app.database.database import async_session_factory
from backend.app.database.models import TaskModel
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger


class TaskCreateTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="task.create",
                description="Creates a persistent background task or scheduled workflow.",
                category="task",
                input_schema={
                    "type": "object",
                    "properties": {
                        "title": {"type": "string", "description": "Title or objective of the task"},
                        "description": {"type": "string", "description": "Detailed task instructions or payload", "default": ""},
                        "priority": {"type": "string", "enum": ["low", "normal", "high", "critical"], "default": "normal"},
                    },
                    "required": ["title"],
                },
                risk_level="low",
            )
        )

    async def execute(self, title: str, description: str = "", priority: str = "normal", **kwargs) -> ToolResult:
        start = time.time()
        try:
            async with async_session_factory() as session:
                task = TaskModel(title=title, description=description, priority=priority, status="PENDING")
                session.add(task)
                await session.commit()
                await session.refresh(task)
                task_id = task.id

            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(
                tool_name=self.name,
                success=True,
                output={"task_id": task_id, "title": title, "status": "PENDING", "priority": priority},
                duration_ms=duration,
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


class TaskListTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="task.list",
                description="Lists active, pending, or completed tasks.",
                category="task",
                input_schema={
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "description": "Filter by status: PENDING, RUNNING, COMPLETED, FAILED", "default": ""},
                    },
                },
                risk_level="low",
            )
        )

    async def execute(self, status: str = "", **kwargs) -> ToolResult:
        start = time.time()
        try:
            async with async_session_factory() as session:
                stmt = select(TaskModel).order_by(TaskModel.created_at.desc()).limit(20)
                if status:
                    stmt = stmt.where(TaskModel.status == status.upper())
                res = await session.execute(stmt)
                tasks = res.scalars().all()

                data = [{"id": t.id, "title": t.title, "status": t.status, "priority": t.priority} for t in tasks]

            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(tool_name=self.name, success=True, output=data, duration_ms=duration)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)
