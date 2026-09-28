import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.agent.aetherion import (
    aetherion_router,
    ExecutionProfile,
    EnsembleLevel,
    TaskIntent,
    AetherionModelRole,
    ROLE_TO_MODEL,
    governor,
)


@pytest.mark.asyncio
async def test_aetherion_routing_simple_chat():
    decision = aetherion_router.route(
        prompt="Explain recursion in simple terms",
        profile=ExecutionProfile.FAST,
    )
    assert decision.ensemble_level == EnsembleLevel.DIRECT
    assert decision.primary_model in ("qwen2.5:3b", "qwen2.5:7b")
    assert decision.requires_tools is False


@pytest.mark.asyncio
async def test_aetherion_routing_math_calculator():
    decision = aetherion_router.route(
        prompt="/calc sqrt(256) * 12",
        profile=ExecutionProfile.BALANCED,
    )
    assert decision.intent == TaskIntent.QUICK_CALC
    assert decision.requires_tools is True


@pytest.mark.asyncio
async def test_aetherion_routing_deep_research():
    decision = aetherion_router.route(
        prompt="Research the latest advancements in quantum computing and produce a cited report",
        profile=ExecutionProfile.DEEP,
    )
    assert decision.ensemble_level in (EnsembleLevel.MULTI_AGENT, EnsembleLevel.AGENT)
    assert "ResearchAgent" in decision.specialists
    assert decision.requires_tools is True
    assert decision.verifier_model is not None


@pytest.mark.asyncio
async def test_aetherion_routing_code_engineering():
    decision = aetherion_router.route(
        prompt="Debug this python function and run unit tests to verify",
        profile=ExecutionProfile.BALANCED,
    )
    assert decision.intent in (TaskIntent.CODE_DEVELOPMENT, TaskIntent.CODE_DEBUG)
    assert decision.primary_model in ("gpt-oss:120b-cloud", "qwen2.5:7b")
    assert "CodingAgent" in decision.specialists


@pytest.mark.asyncio
async def test_aetherion_routing_max_profile():
    decision = aetherion_router.route(
        prompt="Build a production-ready enterprise microservices architecture with full verification",
        profile=ExecutionProfile.MAX,
    )
    assert decision.ensemble_level == EnsembleLevel.MAX_ENSEMBLE
    assert decision.role in (AetherionModelRole.ULTRA, AetherionModelRole.SUPER)
    assert len(decision.specialists) >= 3


@pytest.mark.asyncio
async def test_aetherion_privacy_local_only():
    decision = aetherion_router.route(
        prompt="Analyze this proprietary code securely without cloud leaks",
        profile=ExecutionProfile.DEEP,
        privacy_mode="local",
    )
    assert "cloud" not in decision.primary_model
    assert decision.primary_model in ("qwen2.5:7b", "qwen2.5:3b")
    assert decision.privacy_mode == "local"


@pytest.mark.asyncio
async def test_aetherion_api_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Models endpoint
        res = await client.get("/api/aetherion/models")
        assert res.status_code == 200
        data = res.json()
        assert data["unified_model"]["id"] == "aetherion"
        assert len(data["fleet"]) == len(ROLE_TO_MODEL)

        # 2. Profiles endpoint
        res = await client.get("/api/aetherion/profiles")
        assert res.status_code == 200
        profiles_data = res.json()
        assert len(profiles_data["profiles"]) == 4

        # 3. Status endpoint
        res = await client.get("/api/aetherion/status")
        assert res.status_code == 200
        status_data = res.json()
        assert status_data["status"] == "online"
        assert "metrics" in status_data

        # 4. Preview Route endpoint
        preview_res = await client.post(
            "/api/aetherion/route/preview",
            json={"message": "Analyze sales trends for Q3", "profile": "balanced"},
        )
        assert preview_res.status_code == 200
        route_data = preview_res.json()
        assert "primary_model" in route_data
        assert "ensemble_level" in route_data
