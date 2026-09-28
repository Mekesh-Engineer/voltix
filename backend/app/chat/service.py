import base64
import json
import re
import time
import uuid
from pathlib import Path
from typing import AsyncGenerator, Optional, List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.agent.events import AgentEventType
from backend.app.agent.runtime import agent_runtime
from backend.app.chat.prompt import build_system_message
from backend.app.core.logging import logger
from backend.app.database.models import Conversation, Message, MemoryEntry
from backend.app.files.service import file_service
from backend.app.llm.router import llm_router
from backend.app.memory.conversation import conversation_memory
from backend.app.rag.retriever import rag_retriever
from backend.app.schemas.chat import ChatRequest
from backend.app.tools.agent import agent_orchestrator


def generate_title_from_prompt(prompt: str) -> str:
    """Generates a concise 3-6 word title from the user prompt."""
    cleaned = re.sub(r"[^\w\s]", "", prompt).strip()
    words = cleaned.split()
    if not words:
        return "New Chat"
    title_words = words[:5]
    title = " ".join(title_words).capitalize()
    return title[:40]


class ChatService:
    async def stream_chat(
        self,
        request: ChatRequest,
        db: AsyncSession,
    ) -> AsyncGenerator[str, None]:
        conversation_id = request.conversation_id
        is_new_conversation = False
        conversation = None

        if conversation_id:
            conversation = await db.get(Conversation, conversation_id)

        if not conversation:
            is_new_conversation = True
            conversation = Conversation(
                id=conversation_id or str(uuid.uuid4()),
                title="New Chat",
                model=request.model or "llama3.2",
                provider=request.provider or "ollama",
            )
            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)
            conversation_id = conversation.id

        # Resolve prompt and multimodal attachments
        raw_message = (request.message or "").strip()
        effective_message = raw_message

        # Process image attachments and base64 strings
        image_b64_list: List[str] = list(request.images) if request.images else []
        attachment_meta_list: List[Dict[str, Any]] = []

        if request.attachments:
            for file_id in request.attachments:
                db_file = await file_service.get_file(file_id, db)
                if db_file:
                    ext = db_file.original_name.rsplit(".", 1)[-1].lower() if "." in db_file.original_name else ""
                    is_img = ext in {"png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "ico", "avif"} or db_file.mime_type.startswith("image/")
                    meta_item = {
                        "id": db_file.id,
                        "filename": db_file.filename,
                        "originalName": db_file.original_name,
                        "mimeType": db_file.mime_type,
                        "size": db_file.size,
                        "isImage": is_img,
                    }
                    attachment_meta_list.append(meta_item)
                    if is_img:
                        try:
                            f_path = Path(db_file.path)
                            if f_path.exists() and f_path.stat().st_size <= 25 * 1024 * 1024:
                                b64 = base64.b64encode(f_path.read_bytes()).decode("utf-8")
                                image_b64_list.append(b64)
                        except Exception as e:
                            logger.warning(f"Failed to encode image attachment {db_file.original_name}: {e}")

        if not effective_message and (image_b64_list or attachment_meta_list):
            effective_message = "Analyze and describe the attached image in detail."

        # Auto-update title if default on first message
        if is_new_conversation or conversation.title in ("New Chat", "Untitled Chat"):
            conversation.title = generate_title_from_prompt(effective_message)
            if request.model:
                conversation.model = request.model
            if request.provider:
                conversation.provider = request.provider
            await db.commit()

        # Find last message for parent pointer
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
        )
        prev_res = await db.execute(stmt)
        prev_messages = prev_res.scalars().all()
        last_prev_msg = prev_messages[0] if prev_messages else None

        # Save user message to database with attachment metadata
        user_meta = {}
        if attachment_meta_list:
            user_meta["attachments"] = attachment_meta_list
        if image_b64_list:
            user_meta["has_images"] = True

        user_msg = Message(
            conversation_id=conversation_id,
            role="user",
            content=raw_message or effective_message,
            metadata_json=json.dumps(user_meta) if user_meta else None,
            parent_id=last_prev_msg.id if last_prev_msg else None,
        )
        db.add(user_msg)
        await db.commit()
        await db.refresh(user_msg)

        history = [
            {"role": m.role, "content": m.content}
            for m in reversed(prev_messages)
        ]

        # ----------------------------------------------------
        # Intent & Mode Classification
        # ----------------------------------------------------
        clean_msg = effective_message.strip()
        lower_msg = clean_msg.lower()

        is_explicit_agent = (
            request.mode in ("agent", "research", "code", "data")
            or request.execution_profile == "max"
            or lower_msg.startswith("/agent ")
            or lower_msg.startswith("/research ")
            or lower_msg.startswith("/code ")
            or lower_msg.startswith("/data ")
        )

        intent_keywords = [
            "research and report", "analyze and generate", "compare the", "plan and orchestrate",
            "deconstruct", "write and test", "multi-step", "autonomous", "produce a report",
            "create a technical report", "deep research", "investigate and verify",
        ]
        has_intent_keyword = any(k in lower_msg for k in intent_keywords)
        is_autonomous_task = is_explicit_agent or has_intent_keyword


        # ----------------------------------------------------
        # PATH A: Autonomous Agent Multi-Step Execution
        # ----------------------------------------------------
        if is_autonomous_task:
            goal = clean_msg
            if goal.startswith("/agent "):
                goal = goal[7:].strip()
            elif goal.startswith("/research "):
                goal = f"Research: {goal[10:].strip()}"
            elif goal.startswith("/code "):
                goal = f"Develop and test code: {goal[6:].strip()}"
            elif goal.startswith("/data "):
                goal = f"Analyze data: {goal[6:].strip()}"

            yield f"data: {json.dumps({'type': 'status', 'status': 'Initializing Autonomous Mission & Planning...', 'stage': 'reasoning'})}\n\n"

            agent_steps_meta = []
            plan_meta = None
            artifacts_meta = []
            routed_model = request.model or "llama3.2"
            agent_run_id = None
            synthesis_tokens = []
            gen_start_time = time.time()
            time_to_first_token_ms = None
            last_verification = None

            try:
                async for ev in agent_runtime.run(
                    goal=goal,
                    conversation_id=conversation_id,
                    model_override=request.model if request.model != "auto" else None,
                    file_ids=request.attachments if request.attachments else None,
                ):
                    if not agent_run_id and ev.run_id:
                        agent_run_id = ev.run_id

                    if ev.event_type == AgentEventType.AGENT_STARTED:
                        yield f"data: {json.dumps({'type': 'agent_started', 'run_id': ev.run_id, 'goal': goal})}\n\n"

                    elif ev.event_type == AgentEventType.PLAN_CREATED:
                        plan_meta = ev.payload.get("plan")
                        if plan_meta and "steps" in plan_meta:
                            agent_steps_meta = plan_meta["steps"]
                        yield f"data: {json.dumps({'type': 'plan_created', 'run_id': ev.run_id, 'plan': plan_meta})}\n\n"
                        yield f"data: {json.dumps({'type': 'status', 'status': f'Plan created with {len(agent_steps_meta)} sub-tasks', 'stage': 'reasoning'})}\n\n"

                    elif ev.event_type == AgentEventType.MODEL_SELECTED:
                        routed_model = ev.payload.get("model", routed_model)
                        yield f"data: {json.dumps({'type': 'model_selected', 'model': routed_model})}\n\n"

                    elif ev.event_type == AgentEventType.STEP_STARTED:
                        step_obj = ev.payload.get("step")
                        if step_obj:
                            agent_steps_meta = [
                                (step_obj if s.get("id") == step_obj.get("id") else s)
                                for s in agent_steps_meta
                            ]
                        step_title = step_obj.get("title", "") if step_obj else ev.message
                        yield f"data: {json.dumps({'type': 'step_started', 'step_id': ev.step_id, 'step': step_obj})}\n\n"
                        yield f"data: {json.dumps({'type': 'status', 'status': f'Executing: {step_title}', 'stage': 'tool'})}\n\n"

                    elif ev.event_type == AgentEventType.VERIFICATION_COMPLETED:
                        verif_data = ev.payload.get("verification")
                        last_verification = verif_data
                        if ev.step_id:
                            for s in agent_steps_meta:
                                if s.get("id") == ev.step_id:
                                    s["status"] = "COMPLETED"
                                    s["verification"] = verif_data
                        yield f"data: {json.dumps({'type': 'verification_completed', 'step_id': ev.step_id, 'verification': verif_data})}\n\n"

                    elif ev.event_type == AgentEventType.TOOL_FAILED:
                        if ev.step_id:
                            for s in agent_steps_meta:
                                if s.get("id") == ev.step_id:
                                    s["status"] = "FAILED"
                        yield f"data: {json.dumps({'type': 'tool_failed', 'step_id': ev.step_id, 'message': ev.message})}\n\n"

                    elif ev.event_type == AgentEventType.APPROVAL_REQUESTED:
                        yield f"data: {json.dumps({'type': 'approval_requested', 'step_id': ev.step_id, 'approval_id': ev.payload.get('approval_id'), 'risk_level': ev.payload.get('risk_level'), 'tool_name': ev.payload.get('tool_name'), 'action_summary': ev.payload.get('action_summary'), 'reason': ev.payload.get('reason'), 'parameters': ev.payload.get('parameters')})}\n\n"

                    elif ev.event_type == AgentEventType.ARTIFACT_CREATED:
                        art = ev.payload.get("artifact")
                        if art:
                            artifacts_meta.append(art)
                            yield f"data: {json.dumps({'type': 'artifact_created', 'artifact': art})}\n\n"

                    elif ev.event_type == AgentEventType.TOKEN_STREAM:
                        tok = ev.payload.get("token", "")
                        if tok:
                            if time_to_first_token_ms is None:
                                time_to_first_token_ms = round((time.time() - gen_start_time) * 1000, 2)
                            synthesis_tokens.append(tok)
                            yield f"data: {json.dumps({'type': 'token', 'content': tok})}\n\n"

                    elif ev.event_type == AgentEventType.AGENT_COMPLETED:
                        final_output = ev.payload.get("final_output", "")
                        if not synthesis_tokens and final_output:
                            synthesis_tokens.append(final_output)
                            yield f"data: {json.dumps({'type': 'token', 'content': final_output})}\n\n"
                        if ev.payload.get("artifacts"):
                            artifacts_meta = ev.payload.get("artifacts")

                total_gen_time = max(time.time() - gen_start_time, 0.001)
                total_tokens = len(synthesis_tokens)
                tokens_per_sec = round(total_tokens / total_gen_time, 1)

                metrics_payload = {
                    "type": "metrics",
                    "time_to_first_token_ms": time_to_first_token_ms or 0.0,
                    "total_tokens": total_tokens,
                    "tokens_per_sec": tokens_per_sec,
                }
                yield f"data: {json.dumps(metrics_payload)}\n\n"

                # Persist assistant message with full agent metadata
                full_response = "".join(synthesis_tokens)
                meta_dict = {
                    "agent_run_id": agent_run_id,
                    "plan": plan_meta,
                    "agent_steps": agent_steps_meta,
                    "artifacts": artifacts_meta,
                    "verification": last_verification,
                    "model": routed_model,
                    "ttft_ms": time_to_first_token_ms,
                    "tokens_per_sec": tokens_per_sec,
                }

                assistant_msg_id = str(uuid.uuid4())
                assistant_msg = Message(
                    id=assistant_msg_id,
                    conversation_id=conversation_id,
                    role="assistant",
                    content=full_response,
                    metadata_json=json.dumps(meta_dict),
                    parent_id=user_msg.id,
                )
                db.add(assistant_msg)
                await db.commit()

                done_payload = {
                    "type": "done",
                    "message_id": assistant_msg_id,
                    "conversation_id": conversation_id,
                    "title": conversation.title,
                }
                yield f"data: {json.dumps(done_payload)}\n\n"
                return

            except Exception as e:
                logger.error(f"Error during agent execution: {e}")
                err_payload = {"type": "error", "message": str(e)}
                yield f"data: {json.dumps(err_payload)}\n\n"
                return

        # ----------------------------------------------------
        # PATH B: Standard / Direct / RAG / Tool-Assisted Chat
        # ----------------------------------------------------
        # 1. Semantic Long-Term Memory Retrieval
        retrieved_context = ""
        try:
            words = [w for w in re.findall(r"\w+", effective_message) if len(w) > 3][:3]
            if words:
                mem_clauses = [MemoryEntry.key.ilike(f"%{w}%") | MemoryEntry.content.ilike(f"%{w}%") for w in words]
                from sqlalchemy import or_
                stmt_mem = select(MemoryEntry).where(or_(*mem_clauses)).limit(3)
                mem_res = await db.execute(stmt_mem)
                mem_records = mem_res.scalars().all()
                if mem_records:
                    mem_text = "\n".join([f"- [{m.key}]: {m.content}" for m in mem_records])
                    retrieved_context = f"Relevant Long-Term Memories:\n{mem_text}\n\n"
        except Exception as e:
            logger.debug(f"Memory lookup skipped: {e}")

        # 2. RAG context retrieval
        citations = []
        if request.attachments:
            yield f"data: {json.dumps({'type': 'status', 'status': 'Searching attached documents...', 'stage': 'rag'})}\n\n"
            rag_text, citations = rag_retriever.retrieve(
                query=effective_message,
                file_ids=request.attachments,
                top_k=4,
            )
            if rag_text:
                retrieved_context = f"{retrieved_context}Reference Document Context:\n{rag_text}\n\n"

        if citations:
            citation_payload = {
                "type": "citations",
                "citations": [c.model_dump() for c in citations],
            }
            yield f"data: {json.dumps(citation_payload)}\n\n"

        # 3. Tool Execution
        tool_results_str = ""
        tool_calls_meta = []
        if request.tools_enabled:
            tool_event = await agent_orchestrator.run_tool_loop(
                messages=history + [{"role": "user", "content": effective_message}],
                tools_enabled=True,
            )
            if tool_event:
                tool_name = tool_event.get("tool", "tool")
                yield f"data: {json.dumps({'type': 'status', 'status': f'Executing {tool_name}...', 'stage': 'tool'})}\n\n"
                yield f"data: {json.dumps(tool_event)}\n\n"
                tool_results_str = f"Tool Execution [{tool_name}]: Input={tool_event.get('input')} Output={tool_event.get('output')}"
                tool_calls_meta.append(tool_event)

        if tool_results_str:
            retrieved_context = f"{retrieved_context}\n\n{tool_results_str}".strip()

        # 4. LLM Generation
        yield f"data: {json.dumps({'type': 'status', 'status': 'Generating response...', 'stage': 'llm'})}\n\n"

        sys_msg = build_system_message()
        prompt_messages = conversation_memory.prepare_messages(
            system_prompt=sys_msg,
            history=history,
            current_message=effective_message,
            retrieved_context=retrieved_context,
        )

        assistant_tokens = []
        assistant_msg_id = str(uuid.uuid4())
        gen_start_time = time.time()
        time_to_first_token_ms = None

        try:
            async for token in llm_router.route_stream(
                messages=prompt_messages,
                model=request.model,
                provider_name=request.provider,
                execution_profile=request.execution_profile,
                privacy_mode=request.privacy_mode,
                images=image_b64_list if image_b64_list else None,
            ):
                if time_to_first_token_ms is None:
                    time_to_first_token_ms = round((time.time() - gen_start_time) * 1000, 2)

                assistant_tokens.append(token)
                token_payload = {"type": "token", "content": token}
                yield f"data: {json.dumps(token_payload)}\n\n"

            total_gen_time = max(time.time() - gen_start_time, 0.001)
            total_tokens = len(assistant_tokens)
            tokens_per_sec = round(total_tokens / total_gen_time, 1)

            # Metrics event
            metrics_payload = {
                "type": "metrics",
                "time_to_first_token_ms": time_to_first_token_ms or 0.0,
                "total_tokens": total_tokens,
                "tokens_per_sec": tokens_per_sec,
            }
            yield f"data: {json.dumps(metrics_payload)}\n\n"

            # Save assistant response to DB
            full_response = "".join(assistant_tokens)
            meta_dict = {}
            if citations:
                meta_dict["citations"] = [c.model_dump() for c in citations]
            if tool_calls_meta:
                meta_dict["tool_calls"] = tool_calls_meta
            if image_b64_list:
                meta_dict["has_images"] = True
            if time_to_first_token_ms:
                meta_dict["ttft_ms"] = time_to_first_token_ms
                meta_dict["tokens_per_sec"] = tokens_per_sec

            assistant_msg = Message(
                id=assistant_msg_id,
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                metadata_json=json.dumps(meta_dict) if meta_dict else None,
                parent_id=user_msg.id,
            )
            db.add(assistant_msg)
            await db.commit()


            # Done event
            done_payload = {
                "type": "done",
                "message_id": assistant_msg_id,
                "conversation_id": conversation_id,
                "title": conversation.title,
            }
            yield f"data: {json.dumps(done_payload)}\n\n"

        except Exception as e:
            logger.error(f"Error during chat streaming: {e}")
            err_payload = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(err_payload)}\n\n"


chat_service = ChatService()
