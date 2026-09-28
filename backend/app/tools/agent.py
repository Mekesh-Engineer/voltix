import json
import re
import time
from typing import List, Dict, Any, Optional
from backend.app.core.logging import logger
from backend.app.tools.registry import tool_registry
from backend.app.tools.calculator import (
    extract_math_expression,
    extract_engineering_calculations,
    is_valid_math_expression,
)


class AgentOrchestrator:
    """
    Autonomous tool execution loop that inspects incoming user queries,
    detects computational, research, or scripting intents, and executes sandboxed handlers (Section 3).
    """

    async def run_tool_loop(
        self,
        messages: List[Dict[str, Any]],
        tools_enabled: bool = True,
    ) -> Optional[Dict[str, Any]]:
        if not tools_enabled or not messages:
            return None

        # Extract last user message
        last_user_msg = ""
        for m in reversed(messages):
            role = m.get("role") if isinstance(m, dict) else getattr(m, "role", "")
            if role == "user":
                last_user_msg = m.get("content", "") if isinstance(m, dict) else getattr(m, "content", "")
                break

        if not last_user_msg.strip():
            return None

        clean_text = last_user_msg.strip()

        # 1. Multi-Step Engineering Calculations (e.g. Induction Motor, Transformers, Power, Converters)
        eng_calcs = extract_engineering_calculations(clean_text)
        if eng_calcs:
            executed_calcs = []
            total_duration = 0.0
            for calc in eng_calcs:
                expr = calc["expression"]
                try:
                    start = time.time()
                    res = await tool_registry.execute("math.calculate", expression=expr)
                    duration = round((time.time() - start) * 1000, 2)
                    total_duration += duration
                    executed_calcs.append({
                        "name": calc["name"],
                        "formula": calc["formula"],
                        "expression": expr,
                        "result": res,
                        "unit": calc["unit"],
                    })
                except Exception as e:
                    logger.warning(f"Engineering sub-calculation '{expr}' failed: {e}")
                    executed_calcs.append({
                        "name": calc["name"],
                        "formula": calc["formula"],
                        "expression": expr,
                        "result": f"Error: {str(e)}",
                        "unit": calc["unit"],
                    })

            if executed_calcs:
                summary_lines = [
                    f"{c['name']}: {c['formula']} = {c['expression']} = {c['result']} {c['unit']}"
                    for c in executed_calcs
                ]
                return {
                    "type": "tool_call",
                    "tool": "math.calculate",
                    "input": {
                        "mode": "engineering_parameter_extraction",
                        "calculations": [
                            {"name": c["name"], "formula": c["formula"], "expression": c["expression"]}
                            for c in executed_calcs
                        ],
                    },
                    "output": "\n".join(summary_lines),
                    "duration_ms": round(total_duration, 2),
                    "details": executed_calcs,
                }

        # 2. Single Mathematical Expression Calculation
        valid_math_expr = extract_math_expression(clean_text)
        if valid_math_expr:
            try:
                start = time.time()
                res = await tool_registry.execute("math.calculate", expression=valid_math_expr)
                duration = round((time.time() - start) * 1000, 2)
                return {
                    "type": "tool_call",
                    "tool": "math.calculate",
                    "input": {"expression": valid_math_expr},
                    "output": str(res),
                    "duration_ms": duration,
                }
            except Exception as e:
                logger.warning(f"Calculator tool execution failed for '{valid_math_expr}': {e}")
                return {
                    "type": "tool_call",
                    "tool": "math.calculate",
                    "input": {"expression": valid_math_expr},
                    "output": f"Calculation Error: {str(e)}",
                    "duration_ms": 0.0,
                }

        # 3. Python code runner detection: /python, /code, execute python, run python, or fenced ```python blocks
        py_match = re.search(
            r"(?:\/python|\/code|execute\s+python|run\s+python|python\s+script)\s*[:\n]?\s*(?:```(?:python)?\s*)?([\s\S]+?)(?:```|$)",
            clean_text,
            re.IGNORECASE,
        )
        if py_match:
            code = py_match.group(1).strip()
            if code:
                try:
                    start = time.time()
                    res = await tool_registry.execute("python", code=code)
                    duration = round((time.time() - start) * 1000, 2)
                    return {
                        "type": "tool_call",
                        "tool": "python",
                        "input": {"code": code},
                        "output": str(res),
                        "duration_ms": duration,
                    }
                except Exception as e:
                    logger.warning(f"Python tool execution failed: {e}")
                    return {
                        "type": "tool_call",
                        "tool": "python",
                        "input": {"code": code},
                        "output": f"Execution Error: {str(e)}",
                        "duration_ms": 0.0,
                    }
        elif clean_text.startswith("```python") and clean_text.endswith("```"):
            code = clean_text[len("```python"): -3].strip()
            if code:
                try:
                    start = time.time()
                    res = await tool_registry.execute("python", code=code)
                    duration = round((time.time() - start) * 1000, 2)
                    return {
                        "type": "tool_call",
                        "tool": "python",
                        "input": {"code": code},
                        "output": str(res),
                        "duration_ms": duration,
                    }
                except Exception as e:
                    logger.warning(f"Python tool execution failed: {e}")

        # 4. Web search detection (/search, /web, or explicit search intent)
        web_match = re.search(r"(?:^|\s)(?:\/search|\/web|search the web for|look up online)\s+(.+)", clean_text, re.IGNORECASE)
        if web_match:
            query = web_match.group(1).strip()
            try:
                start = time.time()
                res = await tool_registry.execute("web.search", query=query)
                duration = round((time.time() - start) * 1000, 2)
                return {
                    "type": "tool_call",
                    "tool": "web.search",
                    "input": {"query": query},
                    "output": json.dumps(res, indent=2) if isinstance(res, (dict, list)) else str(res),
                    "duration_ms": duration,
                }
            except Exception as e:
                logger.warning(f"Web search execution failed: {e}")

        # 5. Filesystem tool detection (/fs list, /fs read)
        if clean_text.startswith("/fs list"):
            path = clean_text.replace("/fs list", "").strip()
            try:
                start = time.time()
                res = await tool_registry.execute("filesystem.list", path=path)
                duration = round((time.time() - start) * 1000, 2)
                return {
                    "type": "tool_call",
                    "tool": "filesystem.list",
                    "input": {"path": path},
                    "output": json.dumps(res, indent=2) if isinstance(res, (dict, list)) else str(res),
                    "duration_ms": duration,
                }
            except Exception as e:
                logger.warning(f"Filesystem list failed: {e}")

        # 6. Database tools detection (/db schema, show database tables)
        if any(db_cmd in clean_text.lower() for db_cmd in ["/db schema", "/db tables", "show tables", "database schema", "list database tables"]):
            try:
                start = time.time()
                res = await tool_registry.execute("db.schema")
                duration = round((time.time() - start) * 1000, 2)
                return {
                    "type": "tool_call",
                    "tool": "db.schema",
                    "input": {},
                    "output": json.dumps(res, indent=2) if isinstance(res, (dict, list)) else str(res),
                    "duration_ms": duration,
                }
            except Exception as e:
                logger.warning(f"Database schema tool failed: {e}")

        # 7. Memory store/search detection (remember that ..., /mem search ...)
        rem_match = re.search(r"(?:remember that|store memory)\s*[:\s]?\s*(.+)", clean_text, re.IGNORECASE)
        if rem_match:
            fact = rem_match.group(1).strip()
            key_preview = fact[:30].strip()
            try:
                start = time.time()
                res = await tool_registry.execute("memory.store", key=key_preview, content=fact, category="semantic")
                duration = round((time.time() - start) * 1000, 2)
                return {
                    "type": "tool_call",
                    "tool": "memory.store",
                    "input": {"key": key_preview, "content": fact},
                    "output": str(res),
                    "duration_ms": duration,
                }
            except Exception as e:
                logger.warning(f"Memory store tool failed: {e}")

        # 8. Terminal check detection (/which, check if git is installed)
        which_match = re.search(r"(?:\/which|check if installed|is installed)\s+([a-zA-Z0-9_\-\.]+)", clean_text, re.IGNORECASE)
        if which_match:
            prog = which_match.group(1).strip()
            try:
                start = time.time()
                res = await tool_registry.execute("terminal.which", program=prog)
                duration = round((time.time() - start) * 1000, 2)
                return {
                    "type": "tool_call",
                    "tool": "terminal.which",
                    "input": {"program": prog},
                    "output": str(res),
                    "duration_ms": duration,
                }
            except Exception as e:
                logger.warning(f"Terminal which tool failed: {e}")

        return None


agent_orchestrator = AgentOrchestrator()
