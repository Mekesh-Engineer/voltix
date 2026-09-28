from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.chat.service import chat_service
from backend.app.database.database import get_db
from backend.app.schemas.chat import ChatRequest

router = APIRouter()


@router.post("/chat/stream")
async def chat_stream_endpoint(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Streaming chat endpoint via Server-Sent Events (SSE).
    Streams tokens, status updates, citations, and completion event in real-time.
    """
    generator = chat_service.stream_chat(request=request, db=db)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "X-Accel-Buffering": "no",
        },
    )
