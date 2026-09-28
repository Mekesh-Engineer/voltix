import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.database.database import init_db


@pytest.mark.asyncio
async def test_conversation_lifecycle():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Create conversation
        create_res = await client.post("/api/conversations", json={"title": "Test Chat", "model": "llama3.2"})
        assert create_res.status_code == 200
        conv = create_res.json()
        conv_id = conv["id"]
        assert conv["title"] == "Test Chat"

        # 2. Get conversation
        get_res = await client.get(f"/api/conversations/{conv_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == conv_id

        # 3. Update conversation
        patch_res = await client.patch(f"/api/conversations/{conv_id}", json={"title": "Renamed Chat"})
        assert patch_res.status_code == 200
        assert patch_res.json()["title"] == "Renamed Chat"

        # 4. Pin conversation
        pin_res = await client.patch(f"/api/v1/conversations/{conv_id}/pin", json={"is_pinned": True})
        assert pin_res.status_code == 200
        assert pin_res.json()["is_pinned"] is True

        # 5. Branch conversation
        branch_res = await client.post(
            f"/api/v1/conversations/{conv_id}/branch",
            json={"fork_from_message_id": "non_existent_msg_id"}
        )
        assert branch_res.status_code == 200
        branch_data = branch_res.json()
        assert "(Branch)" in branch_data["title"]
        assert branch_data["parent_conversation_id"] == conv_id

        # 6. Export conversation
        export_res = await client.get(f"/api/v1/conversations/{conv_id}/export?format=markdown")
        assert export_res.status_code == 200
        assert "# Renamed Chat" in export_res.text

        # 7. List conversations (checks v1 and sorting)
        list_res = await client.get("/api/v1/conversations")
        assert list_res.status_code == 200
        conv_ids = [c["id"] for c in list_res.json()]
        assert conv_id in conv_ids

        # 8. Delete conversation
        del_res = await client.delete(f"/api/v1/conversations/{conv_id}")
        assert del_res.status_code == 200
        await client.delete(f"/api/v1/conversations/{branch_data['id']}")
