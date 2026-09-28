import json
import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.database.database import init_db


@pytest.mark.asyncio
async def test_chat_stream_flow():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "message": "Hello, how does a neural network learn?",
            "stream": True,
            "provider": "assistant",
            "model": "general-assistant",
        }
        response = await client.post("/api/chat/stream", json=payload)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        lines = response.text.split("\n")
        events = [line[6:] for line in lines if line.startswith("data: ")]
        assert len(events) > 0

        parsed_events = [json.loads(e) for e in events]
        types = [e["type"] for e in parsed_events]
        assert "token" in types
        assert "done" in types

        # Find the done event
        done_event = next(e for e in parsed_events if e["type"] == "done")
        assert "conversation_id" in done_event
        assert "message_id" in done_event
        assert "title" in done_event
        conv_id = done_event["conversation_id"]

        # Verify conversation and messages were persisted in database
        conv_res = await client.get(f"/api/conversations/{conv_id}")
        assert conv_res.status_code == 200
        conv_data = conv_res.json()
        assert len(conv_data["messages"]) >= 2  # 1 user + 1 assistant
        assert conv_data["messages"][0]["role"] == "user"
        assert conv_data["messages"][1]["role"] == "assistant"


@pytest.mark.asyncio
async def test_unified_chat_autonomous_agent_flow():
    """Validates that autonomous agent execution happens directly through the unified chat stream."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "message": "Research quantum error correction, analyze the results, and produce a technical report",
            "mode": "agent",
            "stream": True,
        }
        response = await client.post("/api/chat/stream", json=payload)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]

        lines = response.text.split("\n")
        events = [line[6:] for line in lines if line.startswith("data: ")]
        assert len(events) > 0

        parsed_events = [json.loads(e) for e in events]
        types = [e["type"] for e in parsed_events]

        assert "agent_started" in types
        assert "plan_created" in types
        assert "step_started" in types
        assert "done" in types

        done_event = next(e for e in parsed_events if e["type"] == "done")
        conv_id = done_event["conversation_id"]

        # Verify message metadata contains plan and agent_steps
        conv_res = await client.get(f"/api/conversations/{conv_id}")
        assert conv_res.status_code == 200
        conv_data = conv_res.json()
        asst_msg = next(m for m in conv_data["messages"] if m["role"] == "assistant")
        assert asst_msg["metadata"] is not None
        assert "agent_steps" in asst_msg["metadata"]
        assert len(asst_msg["metadata"]["agent_steps"]) > 0
        assert "plan" in asst_msg["metadata"]


@pytest.mark.asyncio
async def test_unified_chat_tool_calculation_flow():
    """Validates tool execution integration inside the chat stream."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        payload = {
            "message": "Calculate 45 * 12 + 88",
            "tools_enabled": True,
            "stream": True,
        }
        response = await client.post("/api/chat/stream", json=payload)
        assert response.status_code == 200

        lines = response.text.split("\n")
        events = [line[6:] for line in lines if line.startswith("data: ")]
        parsed_events = [json.loads(e) for e in events]
        types = [e["type"] for e in parsed_events]

        assert "token" in types
        assert "done" in types
