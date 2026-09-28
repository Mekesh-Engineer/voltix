import io
import json
import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.database.database import init_db
from backend.app.rag.parser import parse_document
from pathlib import Path


@pytest.mark.asyncio
async def test_image_upload_and_content_serving():
    """Validates uploading an image and serving its raw content via GET /api/files/{id}/content."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create a small valid 1x1 PNG dummy image
        png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        files = {"file": ("architecture_diagram.png", png_header, "image/png")}

        upload_res = await client.post("/api/files/upload", files=files)
        assert upload_res.status_code == 200
        data = upload_res.json()
        assert "file" in data
        file_id = data["file"]["id"]
        assert data["file"]["original_name"] == "architecture_diagram.png"

        # Verify content endpoint
        content_res = await client.get(f"/api/files/{file_id}/content")
        assert content_res.status_code == 200
        assert content_res.headers["content-type"] == "image/png"
        assert content_res.content == png_header

        # Verify raw endpoint alias
        raw_res = await client.get(f"/api/files/{file_id}/raw")
        assert raw_res.status_code == 200
        assert raw_res.content == png_header


@pytest.mark.asyncio
async def test_image_parser_handling(tmp_path):
    """Verifies that the document parser handles image extensions without binary corruption."""
    dummy_img = tmp_path / "sample_chart.webp"
    dummy_img.write_bytes(b"RIFF\x00\x00\x00\x00WEBPVP8 \x00\x00\x00\x00")

    result = parse_document(dummy_img)
    assert "[Visual Image Attachment:" in result
    assert "SAMPLE_CHART.WEBP" in result.upper()
    assert "Format: WEBP" in result


@pytest.mark.asyncio
async def test_multimodal_chat_stream_with_image():
    """Validates that chat streaming accepts images, routes multimodal prompt, and returns streaming vision analysis."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # First upload an image
        png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        files = {"file": ("ui_screenshot.png", png_header, "image/png")}
        upload_res = await client.post("/api/files/upload", files=files)
        file_id = upload_res.json()["file"]["id"]

        # Send multimodal stream request with prompt + image attachment
        payload = {
            "message": "Analyze the UI layout in this diagram and describe key components.",
            "attachments": [file_id],
            "stream": True,
        }
        stream_res = await client.post("/api/chat/stream", json=payload)
        assert stream_res.status_code == 200
        assert "text/event-stream" in stream_res.headers["content-type"]

        lines = stream_res.text.split("\n")
        events = [json.loads(line[6:]) for line in lines if line.startswith("data: ")]
        types = [e["type"] for e in events]
        assert "token" in types
        assert "done" in types

        # Check that user message in conversation has image attachment metadata
        done_ev = next(e for e in events if e["type"] == "done")
        conv_id = done_ev["conversation_id"]

        conv_res = await client.get(f"/api/conversations/{conv_id}")
        assert conv_res.status_code == 200
        conv_data = conv_res.json()
        user_msg = conv_data["messages"][0]
        assert user_msg["role"] == "user"
        meta = json.loads(user_msg["metadata"]) if isinstance(user_msg.get("metadata"), str) else (user_msg.get("metadata") or {})
        assert meta.get("has_images") is True
        assert len(meta.get("attachments", [])) == 1
        assert meta["attachments"][0]["isImage"] is True


@pytest.mark.asyncio
async def test_multimodal_chat_stream_promptless_image():
    """Validates that chat streaming works when user uploads an image without any prompt text."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        files = {"file": ("pasted_clipboard.png", png_header, "image/png")}
        upload_res = await client.post("/api/files/upload", files=files)
        file_id = upload_res.json()["file"]["id"]

        # Empty text prompt with image
        payload = {
            "message": "",
            "attachments": [file_id],
            "stream": True,
        }
        stream_res = await client.post("/api/chat/stream", json=payload)
        assert stream_res.status_code == 200

        lines = stream_res.text.split("\n")
        events = [json.loads(line[6:]) for line in lines if line.startswith("data: ")]
        types = [e["type"] for e in events]
        assert "token" in types
        assert "done" in types


@pytest.mark.asyncio
async def test_oversized_image_rejection():
    """Validates that uploads exceeding 25MB are gracefully rejected with a 400 error."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Create a mock file larger than 25MB (26MB)
        oversized_data = b"0" * (26 * 1024 * 1024)
        files = {"file": ("giant_raw_photo.png", oversized_data, "image/png")}

        res = await client.post("/api/files/upload", files=files)
        assert res.status_code == 400
        data = res.json()
        assert "exceeds maximum allowed size" in data["detail"]


@pytest.mark.asyncio
async def test_unsupported_file_extension_rejection():
    """Validates that unsupported file types (e.g. .exe, .sh) are rejected."""
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        files = {"file": ("dangerous_script.exe", b"MZ\x90\x00", "application/octet-stream")}
        res = await client.post("/api/files/upload", files=files)
        assert res.status_code == 400
        assert "Unsupported file format" in res.json()["detail"]
