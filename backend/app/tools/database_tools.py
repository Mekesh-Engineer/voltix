import re
import time
from typing import Dict, Any, List
from sqlalchemy import text
from backend.app.database.database import async_session_factory
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger

DISALLOWED_SQL = ["drop", "truncate", "delete", "alter", "update", "insert", "create", "grant", "revoke"]


class DbSchemaTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="db.schema",
                description="Inspects all database table names and column definitions safely.",
                category="database",
                input_schema={"type": "object", "properties": {}},
                risk_level="low",
            )
        )

    async def execute(self, **kwargs) -> ToolResult:
        start = time.time()
        try:
            async with async_session_factory() as session:
                res = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"))
                tables = [r[0] for r in res.fetchall()]

                schema_info = {}
                for t in tables:
                    col_res = await session.execute(text(f"PRAGMA table_info({t});"))
                    cols = [{"cid": c[0], "name": c[1], "type": c[2], "notnull": bool(c[3])} for c in col_res.fetchall()]
                    schema_info[t] = cols

            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(tool_name=self.name, success=True, output=schema_info, duration_ms=duration)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


class DbQueryReadonlyTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="db.query_readonly",
                description="Executes a safe, read-only SELECT query against the database. Mutating statements are strictly blocked.",
                category="database",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "SELECT SQL query to execute"},
                        "limit": {"type": "integer", "description": "Max rows to return", "default": 20},
                    },
                    "required": ["query"],
                },
                risk_level="low",
            )
        )

    async def execute(self, query: str, limit: int = 20, **kwargs) -> ToolResult:
        start = time.time()
        cleaned = query.strip()

        # Enforce SELECT query only
        if not cleaned.lower().startswith("select"):
            return ToolResult(
                tool_name=self.name,
                success=False,
                error="Security violation: Only SELECT queries are permitted in read-only mode.",
                duration_ms=0.0,
            )

        # Scan for destructive SQL
        for word in DISALLOWED_SQL:
            if re.search(rf"\b{word}\b", cleaned, re.IGNORECASE):
                return ToolResult(
                    tool_name=self.name,
                    success=False,
                    error=f"Security violation: Keyword '{word}' is strictly forbidden in read-only mode.",
                    duration_ms=0.0,
                )

        try:
            async with async_session_factory() as session:
                res = await session.execute(text(cleaned))
                rows = [dict(r._mapping) for r in res.fetchmany(limit)]

            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(
                tool_name=self.name,
                success=True,
                output=rows,
                duration_ms=duration,
                metadata={"rows_returned": len(rows)},
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)
