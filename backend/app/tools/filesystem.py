import os
import shutil
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.config import settings
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger

BANNED_PATTERNS = [
    ".env", "id_rsa", "id_ed25519", ".ssh", "authorized_keys",
    "password", "secret", "credentials", "app.db", ".git",
    "windows", "system32", "etc/passwd", "etc/shadow"
]


def resolve_safe_path(rel_path: str) -> Path:
    """
    Resolves relative path inside WORKSPACE_ROOT and verifies it does not escape.
    Blocks forbidden/sensitive files.
    """
    workspace = Path(settings.WORKSPACE_ROOT).resolve()
    target = (workspace / rel_path).resolve()

    # Prevent directory traversal escaping workspace
    if not str(target).startswith(str(workspace)):
        raise PermissionError(f"Access denied: Path '{rel_path}' escapes WORKSPACE_ROOT.")

    # Check banned patterns in path parts
    path_str = str(target).lower()
    for b in BANNED_PATTERNS:
        if b in path_str:
            raise PermissionError(f"Security restriction: Access to sensitive resource '{b}' is blocked.")

    return target


class FilesystemListTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="filesystem.list",
                description="Lists files and subdirectories inside a workspace folder.",
                category="filesystem",
                input_schema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Relative path in workspace (empty for root)", "default": ""},
                    },
                },
                risk_level="low",
            )
        )

    async def execute(self, path: str = "", **kwargs) -> ToolResult:
        start = time.time()
        try:
            target = resolve_safe_path(path)
            if not target.exists():
                return ToolResult(tool_name=self.name, success=False, error=f"Directory '{path}' does not exist.")
            if not target.is_dir():
                return ToolResult(tool_name=self.name, success=False, error=f"Path '{path}' is not a directory.")

            items = []
            for entry in target.iterdir():
                items.append({
                    "name": entry.name,
                    "is_dir": entry.is_dir(),
                    "size_bytes": entry.stat().st_size if entry.is_file() else 0,
                    "modified": entry.stat().st_mtime,
                })
            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(tool_name=self.name, success=True, output=items, duration_ms=duration)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


class FilesystemReadTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="filesystem.read",
                description="Reads the text content of a file within the sandboxed workspace.",
                category="filesystem",
                input_schema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Relative file path to read"},
                        "max_bytes": {"type": "integer", "description": "Maximum bytes to read", "default": 32000},
                    },
                    "required": ["path"],
                },
                risk_level="low",
            )
        )

    async def execute(self, path: str, max_bytes: int = 32000, **kwargs) -> ToolResult:
        start = time.time()
        try:
            target = resolve_safe_path(path)
            if not target.exists() or not target.is_file():
                return ToolResult(tool_name=self.name, success=False, error=f"File '{path}' does not exist.")

            content = target.read_text(encoding="utf-8", errors="replace")[:max_bytes]
            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(tool_name=self.name, success=True, output=content, duration_ms=duration)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


class FilesystemWriteTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="filesystem.write",
                description="Writes text content to a file inside the sandboxed workspace.",
                category="filesystem",
                input_schema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Relative file path to write to"},
                        "content": {"type": "string", "description": "Text content to write"},
                    },
                    "required": ["path", "content"],
                },
                risk_level="medium",
                requires_confirmation=False,
            )
        )

    async def execute(self, path: str, content: str, **kwargs) -> ToolResult:
        start = time.time()
        try:
            target = resolve_safe_path(path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(
                tool_name=self.name,
                success=True,
                output=f"Successfully written {len(content)} bytes to '{path}'.",
                duration_ms=duration,
                metadata={"path": str(target), "bytes": len(content)},
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


class FilesystemDeleteTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="filesystem.delete",
                description="Deletes a file or empty directory inside the sandboxed workspace. Requires human confirmation.",
                category="filesystem",
                input_schema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Relative path to delete"},
                    },
                    "required": ["path"],
                },
                risk_level="high",
                requires_confirmation=True,
            )
        )

    async def execute(self, path: str, **kwargs) -> ToolResult:
        start = time.time()
        try:
            target = resolve_safe_path(path)
            if not target.exists():
                return ToolResult(tool_name=self.name, success=False, error=f"Target '{path}' does not exist.")

            if target.is_file():
                target.unlink()
            elif target.is_dir():
                target.rmdir()

            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(tool_name=self.name, success=True, output=f"Deleted '{path}'.", duration_ms=duration)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)
