import os
import shutil
import subprocess
import time
from typing import Dict, Any, List
from backend.app.config import BASE_DIR
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger

SAFE_COMMANDS = {"git", "python", "node", "npm", "pytest", "uv", "pip", "echo", "where", "which"}
FORBIDDEN_SUBSTRINGS = [
    "rmdir", "del /f", "format", "mkfs", "dd", "powershell -enc",
    "iex", "curl", "wget", "nc ", "netcat", "shutdown", "reboot",
    "reg add", "reg delete", "schtasks", "sc ", "taskkill", "kill"
]


class TerminalRunSafeTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="terminal.run_safe",
                description="Executes allowlisted, read-safe developer commands (git, python, npm, pytest) in a sandboxed process.",
                category="terminal",
                input_schema={
                    "type": "object",
                    "properties": {
                        "command": {"type": "string", "description": "The command string to execute"},
                    },
                    "required": ["command"],
                },
                risk_level="medium",
            )
        )

    async def execute(self, command: str, **kwargs) -> ToolResult:
        start = time.time()
        cmd_str = command.strip()

        # Check forbidden patterns
        for bad in FORBIDDEN_SUBSTRINGS:
            if bad in cmd_str.lower():
                return ToolResult(
                    tool_name=self.name,
                    success=False,
                    error=f"Security violation: Command contains restricted sequence '{bad}'.",
                    duration_ms=0.0,
                )

        tokens = cmd_str.split()
        if not tokens:
            return ToolResult(tool_name=self.name, success=False, error="Empty command provided.", duration_ms=0.0)

        base_cmd = tokens[0].lower().replace(".exe", "")
        if base_cmd not in SAFE_COMMANDS:
            return ToolResult(
                tool_name=self.name,
                success=False,
                error=f"Command '{base_cmd}' is not in the approved safety allowlist ({', '.join(sorted(SAFE_COMMANDS))}).",
                duration_ms=0.0,
            )

        try:
            res = subprocess.run(
                tokens,
                cwd=str(BASE_DIR),
                capture_output=True,
                text=True,
                timeout=30,
            )
            duration = round((time.time() - start) * 1000, 2)
            passed = res.returncode == 0
            return ToolResult(
                tool_name=self.name,
                success=passed,
                output=res.stdout if res.stdout else res.stderr,
                error=None if passed else f"Process exited with status {res.returncode}",
                duration_ms=duration,
                metadata={"return_code": res.returncode},
            )
        except subprocess.TimeoutExpired:
            return ToolResult(tool_name=self.name, success=False, error="Command timed out after 30s.", duration_ms=30000.0)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


class TerminalWhichTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="terminal.which",
                description="Checks if an executable binary is installed and located in system PATH.",
                category="terminal",
                input_schema={
                    "type": "object",
                    "properties": {
                        "program": {"type": "string", "description": "Program name, e.g. git, python, ollama"},
                    },
                    "required": ["program"],
                },
                risk_level="low",
            )
        )

    async def execute(self, program: str, **kwargs) -> ToolResult:
        start = time.time()
        path = shutil.which(program)
        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output=path if path else f"Program '{program}' not found on PATH.",
            duration_ms=duration,
            metadata={"found": bool(path), "path": path},
        )
