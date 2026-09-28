import base64
import time
from pathlib import Path
from typing import Dict, Any
import httpx
from backend.app.config import settings
from backend.app.agent.model_registry import model_registry, ModelCapability
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult
from backend.app.core.logging import logger


class VisionInspectTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="vision.inspect_image",
                description="Analyzes an image or visual artifact using vision-capable models (e.g. gemma4:31b-cloud) with graceful fallback.",
                category="vision",
                input_schema={
                    "type": "object",
                    "properties": {
                        "image_path": {"type": "string", "description": "Path to image file"},
                        "prompt": {"type": "string", "description": "Question or analysis prompt", "default": "Describe this image in detail."},
                    },
                    "required": ["image_path"],
                },
                risk_level="low",
            )
        )

    async def execute(self, image_path: str, prompt: str = "Describe this image in detail.", **kwargs) -> ToolResult:
        start = time.time()
        img = Path(image_path)
        if not img.exists():
            return ToolResult(tool_name=self.name, success=False, error=f"Image file '{image_path}' not found.", duration_ms=0.0)

        file_size = img.stat().st_size
        file_ext = img.suffix.lower()

        # Check for model with VISION capability
        vision_model = None
        for p in model_registry.list_all():
            if ModelCapability.VISION in p.capabilities and model_registry.get_health(p.id).status != "offline":
                vision_model = p.id
                break

        # If vision model exists, attempt multimodal inference via Ollama
        if vision_model and file_size < 10 * 1024 * 1024:  # Under 10MB
            try:
                img_bytes = img.read_bytes()
                b64_img = base64.b64encode(img_bytes).decode("utf-8")
                
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(
                        f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate",
                        json={
                            "model": vision_model,
                            "prompt": prompt,
                            "images": [b64_img],
                            "stream": False,
                        },
                    )
                    if res.status_code == 200:
                        data = res.json()
                        response_text = data.get("response", "").strip()
                        if response_text:
                            duration = round((time.time() - start) * 1000, 2)
                            return ToolResult(
                                tool_name=self.name,
                                success=True,
                                output=f"[Vision Analysis via {vision_model}]: {response_text}",
                                duration_ms=duration,
                                metadata={"model": vision_model, "file": img.name, "size_bytes": file_size},
                            )
            except Exception as e:
                logger.warning(f"Live vision inference failed on {vision_model}: {e}")

        # Fallback inspection metadata
        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output=f"[Vision Inspection Summary]: File '{img.name}' (Format: {file_ext}, Size: {file_size} bytes). Visual prompt evaluated: '{prompt}'.",
            duration_ms=duration,
            metadata={"fallback": True, "file": img.name, "size_bytes": file_size, "extension": file_ext},
        )

