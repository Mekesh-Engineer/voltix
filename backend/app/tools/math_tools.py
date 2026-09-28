import math
import time
from typing import Dict, Any, List
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.tools.calculator import evaluate_expression


class MathCalculateTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="math.calculate",
                description="Evaluates exact mathematical, trigonometric, and logarithmic expressions using an AST-safe deterministic engine.",
                category="math",
                input_schema={
                    "type": "object",
                    "properties": {
                        "expression": {"type": "string", "description": "Mathematical expression (e.g. 'sqrt(144) + 2^10 * sin(pi/2)')"},
                    },
                    "required": ["expression"],
                },
                risk_level="low",
            )
        )

    async def execute(self, expression: str, **kwargs) -> ToolResult:
        start = time.time()
        try:
            val = evaluate_expression(expression)
            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(tool_name=self.name, success=True, output=val, duration_ms=duration)
        except Exception as e:
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


class MathStatisticsTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="math.statistics",
                description="Calculates summary statistics (mean, variance, standard deviation, median, range) for an array of numbers.",
                category="math",
                input_schema={
                    "type": "object",
                    "properties": {
                        "numbers": {"type": "array", "items": {"type": "number"}, "description": "Array of numerical values"},
                    },
                    "required": ["numbers"],
                },
                risk_level="low",
            )
        )

    async def execute(self, numbers: List[float], **kwargs) -> ToolResult:
        start = time.time()
        if not numbers:
            return ToolResult(tool_name=self.name, success=False, error="Input array cannot be empty.")

        n = len(numbers)
        mean = sum(numbers) / n
        variance = sum((x - mean) ** 2 for x in numbers) / (n - 1 if n > 1 else 1)
        std_dev = math.sqrt(variance)
        sorted_nums = sorted(numbers)
        median = sorted_nums[n // 2] if n % 2 != 0 else (sorted_nums[n // 2 - 1] + sorted_nums[n // 2]) / 2.0

        res = {
            "count": n,
            "mean": round(mean, 4),
            "median": round(median, 4),
            "std_dev": round(std_dev, 4),
            "variance": round(variance, 4),
            "min": min(numbers),
            "max": max(numbers),
            "range": max(numbers) - min(numbers),
        }
        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(tool_name=self.name, success=True, output=res, duration_ms=duration)
