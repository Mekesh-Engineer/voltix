import sys
import io
import contextlib
import multiprocessing
import traceback
from typing import Any
from backend.app.config import settings
from backend.app.core.exceptions import ToolExecutionError
from backend.app.tools.registry import ToolDefinition, tool_registry



def _sandboxed_worker(code: str, return_dict: dict):
    # Restricted safe builtins
    safe_builtins = {
        "abs": abs, "all": all, "any": any, "ascii": ascii, "bin": bin,
        "bool": bool, "bytearray": bytearray, "bytes": bytes, "chr": chr,
        "complex": complex, "dict": dict, "dir": dir, "divmod": divmod,
        "enumerate": enumerate, "filter": filter, "float": float, "format": format,
        "frozenset": frozenset, "hash": hash, "hex": hex, "int": int,
        "isinstance": isinstance, "issubclass": issubclass, "iter": iter,
        "len": len, "list": list, "map": map, "max": max, "min": min,
        "next": next, "oct": oct, "ord": ord, "pow": pow, "print": print,
        "range": range, "repr": repr, "reversed": reversed, "round": round,
        "set": set, "slice": slice, "sorted": sorted, "str": str, "sum": sum,
        "tuple": tuple, "type": type, "zip": zip,
    }

    safe_globals = {
        "__builtins__": {
            k: v for k, v in safe_builtins.items() if k not in ("__import__", "eval", "exec", "compile", "open")
        }
    }

    buffer = io.StringIO()
    try:
        with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer):
            exec(code, safe_globals)
        return_dict["output"] = buffer.getvalue()
        return_dict["success"] = True
    except Exception:
        return_dict["output"] = traceback.format_exc()
        return_dict["success"] = False


def execute_python_code(code: str) -> str:
    """Executes Python code in a child process with timeout and restricted environment."""
    if not settings.PYTHON_TOOL_ENABLED:
        return "Python tool execution is currently disabled in settings."

    # Prevent dangerous imports and filesystem operations
    banned = [
        "import os", "os.", "import sys", "sys.", "subprocess", "shutil", "socket",
        "open(", "__import__", "importlib", "eval(", "exec(", "compile(", "getattr(",
    ]
    for b in banned:
        if b in code:
            raise ToolExecutionError(f"Access to '{b}' is restricted for security.")

    manager = multiprocessing.Manager()
    return_dict = manager.dict()
    process = multiprocessing.Process(target=_sandboxed_worker, args=(code, return_dict))
    process.start()
    process.join(timeout=settings.PYTHON_TIMEOUT_SECONDS)

    if process.is_alive():
        process.terminate()
        process.join()
        raise ToolExecutionError(f"Python code timed out after {settings.PYTHON_TIMEOUT_SECONDS}s.")

    output = return_dict.get("output", "")
    if not return_dict.get("success", False):
        raise ToolExecutionError(f"Execution error:\n{output}")

    return output if output.strip() else "[Code executed successfully with no stdout output]"


from backend.app.tools.base import BaseTool, ToolResult


class PythonTool(BaseTool):
    def __init__(self, name: str = "python"):
        super().__init__(
            ToolDefinition(
                name=name,
                description="Execute isolated Python snippets for algorithmic problem solving, statistical computations, and data transformations.",
                category="code",
                input_schema={
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "Python source code to execute."},
                    },
                    "required": ["code"],
                },
                risk_level="medium",
                timeout_seconds=settings.PYTHON_TIMEOUT_SECONDS + 2,
            )
        )

    async def execute(self, code: str, **kwargs) -> Any:
        return execute_python_code(code)


python_tool = PythonTool("python")
python_execute_tool = PythonTool("python.execute")

tool_registry.register(python_tool)
tool_registry.register(python_execute_tool)


