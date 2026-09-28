import pytest
import asyncio
from backend.app.agent.model_registry import model_registry, model_router, ModelCapability
from backend.app.agent.planner import planner, intent_analyzer
from backend.app.agent.policy import policy_engine, approval_manager, prompt_defense, RiskLevel
from backend.app.agent.verifier import verification_engine
from backend.app.agent.subagents import agent_supervisor
from backend.app.agent.runtime import agent_runtime
from backend.app.tools.registry import tool_registry


@pytest.mark.asyncio
async def test_model_registry_and_router():
    profiles = model_registry.list_all()
    assert len(profiles) >= 7
    ids = [p.id for p in profiles]
    assert "nemotron-3-ultra:cloud" in ids
    assert "qwen2.5:7b" in ids
    assert "qwen2.5:3b" in ids

    # Check routing for reasoning vs coding vs quick chat
    coding_model = model_router.select_model(task_intent="coding", requires_coding=True)
    assert coding_model in ("qwen2.5:7b", "gpt-oss:120b-cloud", "nemotron-3-nano:30b-cloud")

    quick_model = model_router.select_model(task_intent="quick_chat")
    assert quick_model in ("qwen2.5:3b", "qwen2.5:7b")

    # Manual user override
    forced = model_router.select_model(user_override="qwen2.5:3b")
    assert forced == "qwen2.5:3b"


@pytest.mark.asyncio
async def test_intent_analyzer_and_planner():
    # 1. Deterministic math
    math_plan = planner.create_plan("calculate sqrt(144) + 10")
    assert len(math_plan.steps) == 1
    assert math_plan.steps[0].tool_name == "math.calculate"

    # 2. Multi-step research and report
    multi_plan = planner.create_plan("Research quantum computing trends, analyze data, and generate report")
    assert len(multi_plan.steps) >= 3
    tools = [s.tool_name for s in multi_plan.steps]
    assert "web.research" in tools
    assert "artifact.create_markdown" in tools


@pytest.mark.asyncio
async def test_tools_execution_and_caching():
    # Math tool
    res = await tool_registry.execute("math.calculate", expression="2^10 + 24")
    assert res == 1048.0

    # Cache hit on repeated execution
    cached_res = await tool_registry.execute("math.calculate", expression="2^10 + 24")
    assert cached_res == 1048.0

    # Data stats tool
    stats = await tool_registry.execute("data.statistics", records=[{"val": 10}, {"val": 20}, {"val": 30}], columns=["val"])
    assert stats["val"]["mean"] == 20.0
    assert stats["val"]["min"] == 10.0
    assert stats["val"]["max"] == 30.0


@pytest.mark.asyncio
async def test_artifact_generation():
    res = await tool_registry.execute(
        "artifact.create_markdown",
        filename="test_report.md",
        content="# Test Report\nAutomated agent output.",
        title="Test Report",
    )
    assert "Artifact created" in res


@pytest.mark.asyncio
async def test_verification_engine():
    # Math verification
    valid_verif = verification_engine.verify_step_execution(
        tool_name="math.calculate",
        tool_input={"expression": "100 / 4"},
        tool_output=25.0,
    )
    assert valid_verif.passed is True
    assert valid_verif.confidence_score == 1.0

    # Mismatched math
    invalid_verif = verification_engine.verify_step_execution(
        tool_name="math.calculate",
        tool_input={"expression": "100 / 4"},
        tool_output=999.0,
    )
    assert invalid_verif.passed is False
    assert len(invalid_verif.failures) > 0


@pytest.mark.asyncio
async def test_multiagent_supervisor_delegation():
    # Delegate to math subagent
    sub_res = await agent_supervisor.delegate(
        agent_type="math",
        task="Compute factorial / power",
        tool_name="math.calculate",
        params={"expression": "2^8"},
    )
    assert sub_res.status == "completed"
    assert sub_res.result == 256.0
    assert "math.calculate" in sub_res.tools_used


@pytest.mark.asyncio
async def test_human_in_the_loop_approval():
    req = approval_manager.create_request(
        run_id="run_test_123",
        tool_name="filesystem.delete",
        action_summary="Delete workspace scratch file",
        parameters={"path": "temp.txt"},
        reason="Testing approval workflow",
        risk_level=RiskLevel.HIGH,
    )
    assert req.id in [p.id for p in approval_manager.get_all_pending()]

    # Simulate approval
    approval_manager.respond(req.id, approved=True)
    decision = await approval_manager.wait_for_decision(req.id, timeout_seconds=1.0)
    assert decision is True
