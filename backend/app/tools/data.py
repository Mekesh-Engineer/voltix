import json
import math
import time
from typing import Dict, Any, List, Optional
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger


class DataInspectTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="data.inspect",
                description="Inspects schema, row count, column types, and sample rows of a tabular dataset.",
                category="data",
                input_schema={
                    "type": "object",
                    "properties": {
                        "records": {"type": "array", "description": "Array of row dictionaries or JSON tabular records"},
                        "max_rows": {"type": "integer", "description": "Number of preview rows", "default": 5},
                    },
                    "required": ["records"],
                },
                risk_level="low",
            )
        )

    async def execute(self, records: List[Dict[str, Any]], max_rows: int = 5, **kwargs) -> ToolResult:
        start = time.time()
        if not isinstance(records, list) or not records:
            return ToolResult(tool_name=self.name, success=False, error="Dataset must be a non-empty list of row objects.")

        columns = list(records[0].keys()) if isinstance(records[0], dict) else []
        col_types = {}
        for col in columns:
            sample_val = records[0].get(col)
            col_types[col] = type(sample_val).__name__

        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output={
                "total_rows": len(records),
                "columns": columns,
                "column_types": col_types,
                "preview": records[:max_rows],
            },
            duration_ms=duration,
        )


class DataStatisticsTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="data.statistics",
                description="Computes exact descriptive statistics (mean, median, stddev, min, max, sum) for numerical columns in a dataset.",
                category="data",
                input_schema={
                    "type": "object",
                    "properties": {
                        "records": {"type": "array", "description": "Array of row objects"},
                        "columns": {"type": "array", "items": {"type": "string"}, "description": "Numerical columns to compute stats for"},
                    },
                    "required": ["records"],
                },
                risk_level="low",
            )
        )

    async def execute(self, records: List[Dict[str, Any]], columns: List[str] = None, **kwargs) -> ToolResult:
        start = time.time()
        if not records or not isinstance(records, list):
            return ToolResult(tool_name=self.name, success=False, error="Input records must be a non-empty list.")

        all_keys = list(records[0].keys()) if isinstance(records[0], dict) else []
        target_cols = columns or all_keys

        stats = {}
        for col in target_cols:
            vals = []
            for r in records:
                if isinstance(r, dict) and col in r:
                    val = r[col]
                    if isinstance(val, (int, float)) and not math.isnan(val):
                        vals.append(float(val))

            if vals:
                n = len(vals)
                mean = sum(vals) / n
                sorted_v = sorted(vals)
                median = sorted_v[n // 2] if n % 2 != 0 else (sorted_v[n // 2 - 1] + sorted_v[n // 2]) / 2.0
                variance = sum((x - mean) ** 2 for x in vals) / (n if n > 1 else 1)
                std_dev = math.sqrt(variance)

                stats[col] = {
                    "count": n,
                    "mean": round(mean, 4),
                    "median": round(median, 4),
                    "std_dev": round(std_dev, 4),
                    "min": min(vals),
                    "max": max(vals),
                    "sum": round(sum(vals), 4),
                }

        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output=stats if stats else "No numerical columns found to analyze.",
            duration_ms=duration,
        )


class DataFilterTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="data.filter",
                description="Creates a derived filtered dataset without mutating the original source.",
                category="data",
                input_schema={
                    "type": "object",
                    "properties": {
                        "records": {"type": "array", "description": "Original rows"},
                        "column": {"type": "string", "description": "Column name to filter on"},
                        "operator": {"type": "string", "enum": ["eq", "gt", "lt", "gte", "lte", "contains"], "description": "Comparison operator"},
                        "value": {"type": "string", "description": "Target value to compare against"},
                    },
                    "required": ["records", "column", "operator", "value"],
                },
                risk_level="low",
            )
        )

    async def execute(self, records: List[Dict[str, Any]], column: str, operator: str, value: Any, **kwargs) -> ToolResult:
        start = time.time()
        filtered = []
        for r in records:
            if not isinstance(r, dict) or column not in r:
                continue
            item_val = r[column]

            try:
                # Type coercion
                if isinstance(item_val, (int, float)):
                    cmp_val = float(value)
                else:
                    cmp_val = str(value)
                    item_val = str(item_val)

                if operator == "eq" and item_val == cmp_val:
                    filtered.append(r)
                elif operator == "gt" and item_val > cmp_val:
                    filtered.append(r)
                elif operator == "lt" and item_val < cmp_val:
                    filtered.append(r)
                elif operator == "gte" and item_val >= cmp_val:
                    filtered.append(r)
                elif operator == "lte" and item_val <= cmp_val:
                    filtered.append(r)
                elif operator == "contains" and str(value).lower() in str(item_val).lower():
                    filtered.append(r)
            except Exception:
                continue

        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output={
                "original_count": len(records),
                "filtered_count": len(filtered),
                "data": filtered,
            },
            duration_ms=duration,
        )
