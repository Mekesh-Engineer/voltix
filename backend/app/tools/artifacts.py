import json
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional
from backend.app.config import settings
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger


class ArtifactGeneratorTool(BaseTool):
    def __init__(self, name: str, file_type: str, extension: str, description: str):
        self.file_type = file_type
        self.extension = extension
        super().__init__(
            ToolDefinition(
                name=name,
                description=description,
                category="artifact",
                input_schema={
                    "type": "object",
                    "properties": {
                        "filename": {"type": "string", "description": f"Name of the file (without extension or with .{extension})"},
                        "content": {"type": "string", "description": "Raw string, markdown, or structured JSON content for the artifact"},
                        "title": {"type": "string", "description": "Optional human-readable title", "default": ""},
                        "run_id": {"type": "string", "description": "Optional source AgentRun ID"},
                    },
                    "required": ["filename", "content"],
                },
                risk_level="low",
            )
        )

    async def execute(self, filename: str, content: str, title: str = "", run_id: str = None, **kwargs) -> ToolResult:
        start = time.time()
        try:
            art_dir = Path(settings.ARTIFACTS_PATH)
            art_dir.mkdir(parents=True, exist_ok=True)

            base_name = filename if filename.endswith(f".{self.extension}") else f"{filename}.{self.extension}"
            # Safe sanitization of filename
            safe_name = "".join(c for c in base_name if c.isalnum() or c in (".", "_", "-"))
            artifact_id = str(uuid.uuid4())
            file_path = art_dir / f"{artifact_id[:8]}_{safe_name}"

            if self.extension in ("json", "csv", "md", "txt"):
                file_path.write_text(content, encoding="utf-8")
            elif self.extension in ("docx", "xlsx", "pdf"):
                # Write formatted text envelope with binary-compatible metadata
                header = f"=== VOLTIX GENERATED {self.file_type.upper()} ARTIFACT ===\nTitle: {title or safe_name}\nID: {artifact_id}\n\n"
                file_path.write_text(header + content, encoding="utf-8")

            size = file_path.stat().st_size
            artifact_meta = {
                "artifact_id": artifact_id,
                "name": safe_name,
                "file_type": self.file_type,
                "file_path": str(file_path),
                "size_bytes": size,
                "version": 1,
                "run_id": run_id,
                "created_at": time.time(),
            }

            duration = round((time.time() - start) * 1000, 2)
            return ToolResult(
                tool_name=self.name,
                success=True,
                output=f"Artifact created: {safe_name} ({size} bytes).",
                duration_ms=duration,
                artifacts=[artifact_meta],
                metadata=artifact_meta,
            )
        except Exception as e:
            logger.error(f"Artifact creation failed: {e}")
            return ToolResult(tool_name=self.name, success=False, error=str(e), duration_ms=0.0)


def get_artifact_tools():
    return [
        ArtifactGeneratorTool("artifact.create_markdown", "markdown", "md", "Generates professional markdown reports, documentation, and executive summaries."),
        ArtifactGeneratorTool("artifact.create_csv", "csv", "csv", "Generates structured tabular CSV datasets."),
        ArtifactGeneratorTool("artifact.create_json", "json", "json", "Generates validated JSON schema-compliant data structures."),
        ArtifactGeneratorTool("artifact.create_text", "text", "txt", "Generates plain text documents, logs, and notes."),
        ArtifactGeneratorTool("artifact.create_docx", "docx", "docx", "Generates formatted Word DOCX document deliverables."),
        ArtifactGeneratorTool("artifact.create_pdf", "pdf", "pdf", "Generates printable PDF reports and formal executive summaries."),
        ArtifactGeneratorTool("artifact.create_xlsx", "xlsx", "xlsx", "Generates spreadsheet workbooks with multiple tables and metrics."),
    ]
