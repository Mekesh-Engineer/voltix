import difflib
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.config import settings, BASE_DIR
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger


class CodeSearchTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="code.search",
                description="Searches for exact text patterns, functions, or classes across codebase files.",
                category="code",
                input_schema={
                    "type": "object",
                    "properties": {
                        "pattern": {"type": "string", "description": "String or regex pattern to search for"},
                        "subpath": {"type": "string", "description": "Subdirectory to restrict search (e.g. backend/app)", "default": ""},
                        "extension": {"type": "string", "description": "File extension filter, e.g. .py or .tsx", "default": ""},
                    },
                    "required": ["pattern"],
                },
                risk_level="low",
            )
        )

    async def execute(self, pattern: str, subpath: str = "", extension: str = "", **kwargs) -> ToolResult:
        start = time.time()
        base = BASE_DIR / subpath if subpath else BASE_DIR
        matches = []

        for root, dirs, files in os.walk(base):
            # Skip noise dirs
            dirs[:] = [d for d in dirs if d not in (".git", "node_modules", ".venv", "__pycache__", ".next")]
            for f in files:
                if extension and not f.endswith(extension):
                    continue
                file_path = Path(root) / f
                try:
                    text = file_path.read_text(encoding="utf-8", errors="ignore")
                    if pattern in text:
                        rel = file_path.relative_to(BASE_DIR).as_posix()
                        matches.append(rel)
                        if len(matches) >= 25:
                            break
                except Exception:
                    continue
            if len(matches) >= 25:
                break

        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output=matches if matches else "No matches found.",
            duration_ms=duration,
            metadata={"pattern": pattern, "match_count": len(matches)},
        )


class CodeReadTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="code.read",
                description="Reads the content of a source code file with line numbers for inspection.",
                category="code",
                input_schema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "Relative file path from project root"},
                        "start_line": {"type": "integer", "description": "Starting line number (1-indexed)", "default": 1},
                        "end_line": {"type": "integer", "description": "Ending line number (inclusive)", "default": 200},
                    },
                    "required": ["path"],
                },
                risk_level="low",
            )
        )

    async def execute(self, path: str, start_line: int = 1, end_line: int = 200, **kwargs) -> ToolResult:
        start = time.time()
        target = (BASE_DIR / path).resolve()
        if not str(target).startswith(str(BASE_DIR.resolve())):
            return ToolResult(tool_name=self.name, success=False, error="Access outside project root is forbidden.")

        if not target.exists() or not target.is_file():
            return ToolResult(tool_name=self.name, success=False, error=f"File '{path}' does not exist.")

        lines = target.read_text(encoding="utf-8", errors="replace").splitlines()
        slice_lines = lines[max(start_line - 1, 0):end_line]
        numbered = [f"{i + start_line:4d} | {line}" for i, line in enumerate(slice_lines)]
        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output="\n".join(numbered),
            duration_ms=duration,
            metadata={"total_lines": len(lines), "path": path},
        )


class CodeDiffTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="code.diff",
                description="Generates a standard unified diff between original code and updated code proposal.",
                category="code",
                input_schema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string", "description": "File path being compared"},
                        "original_content": {"type": "string", "description": "Original file content"},
                        "new_content": {"type": "string", "description": "Proposed new file content"},
                    },
                    "required": ["path", "original_content", "new_content"],
                },
                risk_level="low",
            )
        )

    async def execute(self, path: str, original_content: str, new_content: str, **kwargs) -> ToolResult:
        start = time.time()
        orig_lines = original_content.splitlines(keepends=True)
        new_lines = new_content.splitlines(keepends=True)
        diff = difflib.unified_diff(orig_lines, new_lines, fromfile=f"a/{path}", tofile=f"b/{path}")
        diff_text = "".join(diff)
        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output=diff_text if diff_text else "[Files are identical, no diff]",
            duration_ms=duration,
        )


class CodeTestTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="code.test",
                description="Executes project test suites (e.g. pytest) and reports structured pass/fail results.",
                category="code",
                input_schema={
                    "type": "object",
                    "properties": {
                        "test_target": {"type": "string", "description": "Specific test file or empty for all tests", "default": ""},
                    },
                },
                risk_level="medium",
            )
        )

    async def execute(self, test_target: str = "", **kwargs) -> ToolResult:
        start = time.time()
        python_exe = sys.executable
        cmd = [python_exe, "-m", "pytest"]
        if test_target:
            cmd.append(test_target)

        try:
            res = subprocess.run(
                cmd,
                cwd=str(BASE_DIR),
                capture_output=True,
                text=True,
                timeout=45,
            )
            duration = round((time.time() - start) * 1000, 2)
            passed = res.returncode == 0
            return ToolResult(
                tool_name=self.name,
                success=passed,
                output=res.stdout if res.stdout else res.stderr,
                error=None if passed else f"Pytest exited with status {res.returncode}",
                duration_ms=duration,
                metadata={"return_code": res.returncode, "passed": passed},
            )
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=round((time.time() - start) * 1000, 2))
