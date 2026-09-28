import time
import httpx
from fastapi import APIRouter
from backend.app.config import settings
from backend.app.llm.router import llm_router
from backend.app.schemas.model import ModelListResponse, ModelTestRequest, ModelTestResponse

router = APIRouter()


@router.get("/models", response_model=ModelListResponse)
async def list_available_models():
    """Returns all available models exclusively from the Ollama AI service."""
    return await llm_router.list_all_models()


@router.get("/models/health")
async def get_models_health():
    """Returns real-time health, error rates, and telemetry across registered models."""
    from backend.app.agent.model_registry import model_registry
    profiles = model_registry.list_all()
    health_data = {}
    for p in profiles:
        h = model_registry.get_health(p.id)
        health_data[p.id] = {
            "name": p.name,
            "category": p.category,
            "status": h.status,
            "latency_ms": h.latency_ms,
            "total_calls": h.total_calls,
            "error_rate": h.error_rate,
            "capabilities": [c.value for c in p.capabilities],
        }
    return {"health": health_data, "total_registered": len(profiles)}



@router.post("/models/test", response_model=ModelTestResponse)
async def test_model_connectivity(payload: ModelTestRequest):
    """Diagnoses connectivity for the Ollama AI service."""
    start_time = time.time()
    raw_url = (payload.base_url or settings.OLLAMA_BASE_URL).rstrip("/")
    candidates = [raw_url]
    if "localhost:11434" in raw_url:
        candidates.insert(0, raw_url.replace("localhost:11434", "127.0.0.1:11434"))
    elif "127.0.0.1:11434" in raw_url:
        candidates.append(raw_url.replace("127.0.0.1:11434", "localhost:11434"))

    last_error = None
    for url in candidates:
        try:
            candidate_start = time.time()
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{url}/api/tags")
                duration = round((time.time() - candidate_start) * 1000, 2)
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name") for m in data.get("models", [])]
                    return ModelTestResponse(
                        status="online",
                        provider="ollama",
                        latency_ms=duration,
                        available_models=models,
                        details=f"Connected to Ollama on {url}.",
                    )
        except Exception as e:
            last_error = e
            continue

    total_duration = round((time.time() - start_time) * 1000, 2)
    return ModelTestResponse(
        status="offline",
        provider="ollama",
        latency_ms=total_duration,
        available_models=[],
        details=f"Connection failed: {str(last_error or 'Daemon unreachable')}",
    )
