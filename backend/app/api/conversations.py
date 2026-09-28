import json
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.database.database import get_db
from backend.app.database.models import Conversation, Message
from backend.app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    ConversationSummary,
    ConversationDetail,
    MessageResponse,
    ConversationBranchRequest,
    ConversationPinRequest,
)

router = APIRouter()


@router.get("/conversations", response_model=List[ConversationSummary])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    stmt = select(Conversation).order_by(Conversation.is_pinned.desc(), Conversation.updated_at.desc())
    result = await db.execute(stmt)
    conversations = result.scalars().all()

    summaries = []
    for conv in conversations:
        # Count messages and get last message preview
        msg_stmt = (
            select(Message)
            .where(Message.conversation_id == conv.id)
            .order_by(Message.created_at.desc())
        )
        msg_res = await db.execute(msg_stmt)
        messages = msg_res.scalars().all()
        preview = messages[0].content[:80] + "..." if messages else None

        summaries.append(
            ConversationSummary(
                id=conv.id,
                title=conv.title,
                model=conv.model,
                provider=conv.provider,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                is_pinned=bool(getattr(conv, "is_pinned", False)),
                message_count=len(messages),
                last_message_preview=preview,
            )
        )
    return summaries


@router.post("/conversations", response_model=ConversationDetail)
async def create_conversation(
    payload: ConversationCreate,
    db: AsyncSession = Depends(get_db),
):
    new_conv = Conversation(
        id=str(uuid.uuid4()),
        title=payload.title or "New Chat",
        model=payload.model,
        provider=payload.provider,
    )
    db.add(new_conv)
    await db.commit()
    await db.refresh(new_conv)

    return ConversationDetail(
        id=new_conv.id,
        title=new_conv.title,
        model=new_conv.model,
        provider=new_conv.provider,
        created_at=new_conv.created_at,
        updated_at=new_conv.updated_at,
        messages=[],
    )


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    msg_res = await db.execute(stmt)
    messages = msg_res.scalars().all()

    formatted_msgs = []
    for m in messages:
        meta = None
        if m.metadata_json:
            try:
                meta = json.loads(m.metadata_json)
            except Exception:
                meta = None
        formatted_msgs.append(
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                metadata=meta,
                parent_id=getattr(m, "parent_id", None),
                branch_index=getattr(m, "branch_index", 0),
                created_at=m.created_at,
            )
        )

    return ConversationDetail(
        id=conv.id,
        title=conv.title,
        model=conv.model,
        provider=conv.provider,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        is_pinned=bool(getattr(conv, "is_pinned", False)),
        messages=formatted_msgs,
    )


@router.patch("/conversations/{conversation_id}", response_model=ConversationSummary)
async def update_conversation(
    conversation_id: str,
    payload: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if payload.title is not None:
        conv.title = payload.title.strip() or "Untitled Chat"
    if payload.model is not None:
        conv.model = payload.model
    if payload.provider is not None:
        conv.provider = payload.provider

    await db.commit()
    await db.refresh(conv)

    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        model=conv.model,
        provider=conv.provider,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        is_pinned=bool(getattr(conv, "is_pinned", False)),
    )


@router.patch("/conversations/{conversation_id}/pin", response_model=ConversationSummary)
async def toggle_pin_conversation(
    conversation_id: str,
    payload: ConversationPinRequest,
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.is_pinned = payload.is_pinned
    await db.commit()
    await db.refresh(conv)

    return ConversationSummary(
        id=conv.id,
        title=conv.title,
        model=conv.model,
        provider=conv.provider,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        is_pinned=conv.is_pinned,
    )


@router.post("/conversations/{conversation_id}/branch", response_model=ConversationDetail)
async def branch_conversation(
    conversation_id: str,
    payload: ConversationBranchRequest,
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Fetch messages in order
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    msg_res = await db.execute(stmt)
    all_msgs = msg_res.scalars().all()

    # Find fork point
    fork_idx = -1
    for idx, m in enumerate(all_msgs):
        if m.id == payload.fork_from_message_id:
            fork_idx = idx
            break

    if fork_idx == -1:
        # Default to entire history if fork id not found
        forked_msgs = all_msgs
    else:
        forked_msgs = all_msgs[: fork_idx + 1]

    new_conv_id = str(uuid.uuid4())
    new_conv = Conversation(
        id=new_conv_id,
        title=f"{conv.title} (Branch)",
        model=conv.model,
        provider=conv.provider,
        is_pinned=False,
    )
    db.add(new_conv)
    await db.commit()
    await db.refresh(new_conv)

    copied_responses: List[MessageResponse] = []
    for m in forked_msgs:
        new_msg_id = str(uuid.uuid4())
        copied = Message(
            id=new_msg_id,
            conversation_id=new_conv_id,
            role=m.role,
            content=m.content,
            metadata_json=m.metadata_json,
            parent_id=m.id,
            branch_index=getattr(m, "branch_index", 0) + 1,
        )
        db.add(copied)
        meta = None
        if m.metadata_json:
            try:
                meta = json.loads(m.metadata_json)
            except Exception:
                pass
        copied_responses.append(
            MessageResponse(
                id=new_msg_id,
                conversation_id=new_conv_id,
                role=m.role,
                content=m.content,
                metadata=meta,
                parent_id=m.id,
                branch_index=getattr(m, "branch_index", 0) + 1,
                created_at=m.created_at,
            )
        )

    await db.commit()

    return ConversationDetail(
        id=new_conv.id,
        title=new_conv.title,
        model=new_conv.model,
        provider=new_conv.provider,
        created_at=new_conv.created_at,
        updated_at=new_conv.updated_at,
        is_pinned=False,
        parent_conversation_id=conversation_id,
        messages=copied_responses,
    )


@router.get("/conversations/{conversation_id}/export")
async def export_conversation(
    conversation_id: str,
    format: str = "markdown",
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    msg_res = await db.execute(stmt)
    messages = msg_res.scalars().all()

    if format.lower() == "json":
        return {
            "id": conv.id,
            "title": conv.title,
            "model": conv.model,
            "provider": conv.provider,
            "created_at": conv.created_at.isoformat() if conv.created_at else None,
            "messages": [
                {
                    "role": m.role,
                    "content": m.content,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
        }

    # Markdown export default
    lines = [f"# {conv.title}\n", f"*Exported from Voltix AI Chat on {conv.updated_at}*\n", "---\n"]
    for m in messages:
        sender = "**User**" if m.role == "user" else "**Assistant**"
        lines.append(f"### {sender}\n\n{m.content}\n\n")

    md_content = "".join(lines)
    from fastapi.responses import Response
    return Response(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{conv.title.replace(" ", "_")}.md"'},
    )


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()
    return {"message": "Conversation deleted successfully", "id": conversation_id}
