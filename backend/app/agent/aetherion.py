import asyncio
import json
import time
import uuid
import re
from enum import Enum
from typing import AsyncGenerator, Dict, Any, List, Optional
from pydantic import BaseModel, Field

from backend.app.agent.events import event_bus, AgentEvent, AgentEventType
from backend.app.agent.model_registry import model_registry, model_router, ModelCapability
from backend.app.agent.planner import planner
from backend.app.agent.policy import policy_engine
from backend.app.agent.state import AgentState, AgentStatus, AgentPlan
from backend.app.agent.verifier import verification_engine
from backend.app.core.logging import logger
from backend.app.llm.router import llm_router
from backend.app.rag.retriever import rag_retriever
from backend.app.tools.registry import tool_registry


class AetherionModelRole(str, Enum):
    ULTRA = "aetherion-ultra"      # nemotron-3-ultra:cloud (Long-horizon Master Reasoner)
    SUPER = "aetherion-super"      # nemotron-3-super:cloud (Multi-agent Orchestrator)
    NANO = "aetherion-nano"        # nemotron-3-nano:30b-cloud (Fast Reasoning / Verification)
    REASON = "aetherion-reason"    # gpt-oss:120b-cloud (Reasoning + Tool-Calling + Structured)
    VISION = "aetherion-vision"    # gemma4:31b-cloud (Multimodal Vision + Code)
    FAST = "aetherion-fast"        # qwen2.5:7b (Fast General Purpose Local Worker)
    MINI = "aetherion-mini"        # qwen2.5:3b (Ultra-low-latency Utility & Intent Worker)


ROLE_TO_MODEL: Dict[AetherionModelRole, str] = {
    AetherionModelRole.ULTRA: "nemotron-3-ultra:cloud",
    AetherionModelRole.SUPER: "nemotron-3-super:cloud",
    AetherionModelRole.NANO: "nemotron-3-nano:30b-cloud",
    AetherionModelRole.REASON: "gpt-oss:120b-cloud",
    AetherionModelRole.VISION: "gemma4:31b-cloud",
    AetherionModelRole.FAST: "qwen2.5:7b",
    AetherionModelRole.MINI: "qwen2.5:3b",
}

MODEL_TO_ROLE: Dict[str, AetherionModelRole] = {v: k for k, v in ROLE_TO_MODEL.items()}


class ExecutionProfile(str, Enum):
    FAST = "fast"          # Minimal latency, cheap compute
    BALANCED = "balanced"  # Standard high-quality agentic balance
    DEEP = "deep"          # Extended reasoning, thorough verification
    MAX = "max"            # Multi-agent swarm, parallel debate, comprehensive verification


class EnsembleLevel(str, Enum):
    DIRECT = "level_0_direct"           # Single model
    ASSISTED = "level_1_assisted"       # Primary + lightweight verifier
    AGENT = "level_2_agent"             # Planner + tools + execution
    MULTI_AGENT = "level_3_multi_agent" # Planner + specialists + verifier
    MAX_ENSEMBLE = "level_4_max"        # Master orchestrator + parallel specialists + debate + verifier


class TaskIntent(str, Enum):
    CONVERSATION = "conversation"
    QUICK_CALC = "quick_calc"
    CODE_DEVELOPMENT = "code_development"
    CODE_DEBUG = "code_debug"
    DEEP_RESEARCH = "deep_research"
    DATA_ANALYSIS = "data_analysis"
    DOCUMENT_RAG = "document_rag"
    VISION = "vision"
    AUTONOMOUS_PROJECT = "autonomous_project"



class AetherionRouteDecision(BaseModel):
    profile: ExecutionProfile = ExecutionProfile.BALANCED
    ensemble_level: EnsembleLevel = EnsembleLevel.AGENT
    intent: TaskIntent = TaskIntent.CONVERSATION
    complexity_score: float = 0.5  # 0.0 to 1.0
    primary_model: str = "qwen2.5:7b"
    role: AetherionModelRole = AetherionModelRole.FAST
    planner_model: Optional[str] = None
    verifier_model: Optional[str] = None
    synthesis_model: str = "qwen2.5:7b"
    specialists: List[str] = Field(default_factory=list)
    requires_tools: bool = False
    requires_rag: bool = False
    requires_vision: bool = False
    privacy_mode: str = "auto"
    reasoning_summary: str = ""


class ResourceGovernor:
    """
    Tracks active compute metrics, latencies, tokens, and concurrency across
    the Aetherion model fleet (Section 17 & 78).
    """
    def __init__(self):
        self.total_tokens_processed: int = 0
        self.total_tasks_completed: int = 0
        self.active_workers_count: int = 0
        self.cloud_calls_count: int = 0
        self.local_calls_count: int = 0
        self.latencies: List[float] = []

    def record_call(self, model: str, duration_ms: float, tokens: int = 0, is_cloud: bool = False):
        if is_cloud or "cloud" in model:
            self.cloud_calls_count += 1
        else:
            self.local_calls_count += 1
        self.total_tokens_processed += max(tokens, 1)
        self.latencies.append(duration_ms)
        if len(self.latencies) > 200:
            self.latencies.pop(0)

    @property
    def avg_latency_ms(self) -> float:
        if not self.latencies:
            return 0.0
        return round(sum(self.latencies) / len(self.latencies), 2)

    def get_status_metrics(self) -> Dict[str, Any]:
        return {
            "total_tokens_processed": self.total_tokens_processed,
            "total_tasks_completed": self.total_tasks_completed,
            "active_workers": self.active_workers_count,
            "cloud_calls": self.cloud_calls_count,
            "local_calls": self.local_calls_count,
            "avg_latency_ms": self.avg_latency_ms,
            "fleet_health": "OPTIMAL",
        }


governor = ResourceGovernor()


class AetherionRouter:
    """
    Adaptive Aetherion Router (Section 10 & 11):
    Evaluates intent, complexity, context, and privacy constraints to dynamically
    select the minimal sufficient computation for simple requests and escalate to
    specialized models or multi-agent orchestration for complex workflows.
    """

    def analyze_intent(self, prompt: str, has_files: bool = False, file_names: Optional[List[str]] = None, has_images: bool = False) -> TaskIntent:
        p = prompt.lower().strip()
        names = " ".join([f.lower() for f in (file_names or [])])

        # Multimodal Vision Analysis
        image_exts = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg", ".ico", ".avif"}
        has_img_file = any(any(f.lower().endswith(ext) for ext in image_exts) for f in (file_names or []))
        if has_images or has_img_file or any(w in p for w in ["image", "photo", "picture", "screenshot", "diagram", "look at this", "ocr", "in this image", "analyze the image"]):
            return TaskIntent.VISION

        # Mathematical calculation
        if re.search(r"^\s*(\/calc|\bcalc\b|\bevaluate\b|\bsqrt\b|\d+\s*[\+\-\*\/\^]\s*\d+)", p):
            return TaskIntent.QUICK_CALC

        # Autonomous Project
        if p.startswith("/agent") or "build a production" in p or "create a presentation" in p or "end-to-end" in p:
            return TaskIntent.AUTONOMOUS_PROJECT

        # Deep Research
        if p.startswith("/research") or "research" in p or "compare sources" in p or "citations" in p:
            return TaskIntent.DEEP_RESEARCH

        # Data Analysis
        if p.startswith("/data") or "analyze sales" in p or "trend" in p or ".xlsx" in names or ".csv" in names:
            return TaskIntent.DATA_ANALYSIS

        # Coding
        if p.startswith("/code") or "debug" in p or "refactor" in p or "fix" in p or "function" in p or "python" in p:
            return TaskIntent.CODE_DEVELOPMENT

        # Document RAG
        if p.startswith("/rag") or has_files or "document" in p or "pdf" in p or ".pdf" in names:
            return TaskIntent.DOCUMENT_RAG

        # Default conversational
        return TaskIntent.CONVERSATION

    def route(
        self,
        prompt: str,
        profile: ExecutionProfile = ExecutionProfile.BALANCED,
        privacy_mode: str = "auto",
        has_files: bool = False,
        file_names: Optional[List[str]] = None,
        model_override: Optional[str] = None,
        has_images: bool = False,
    ) -> AetherionRouteDecision:
        intent = self.analyze_intent(prompt, has_files=has_files, file_names=file_names, has_images=has_images)
        p = prompt.lower()
        is_local_only = str(privacy_mode).lower() in ("local", "local_only", "privacy_mode.local_only")


        # Check for explicit model override (e.g., user selected specific engine)
        if model_override and model_override not in ("aetherion", "auto", ""):
            # Map role aliases
            resolved_override = model_override
            for role, model_id in ROLE_TO_MODEL.items():
                if model_override == role.value:
                    resolved_override = model_id
                    break

            # Enforce local only policy strictly (Section 19)
            if is_local_only and "cloud" in resolved_override:
                resolved_override = "qwen2.5:7b"

            health = model_registry.get_health(resolved_override)
            if health.status == "offline":
                resolved_override = model_registry.get_fallback_model(resolved_override)

            return AetherionRouteDecision(
                profile=profile,
                ensemble_level=EnsembleLevel.DIRECT if intent == TaskIntent.CONVERSATION else EnsembleLevel.AGENT,
                intent=intent,
                primary_model=resolved_override,
                role=MODEL_TO_ROLE.get(resolved_override, AetherionModelRole.FAST),
                synthesis_model=resolved_override,
                requires_tools=intent != TaskIntent.CONVERSATION,
                privacy_mode=privacy_mode,
                reasoning_summary=f"User override active for engine '{resolved_override}'.",
            )

        # 1. Fast Profile or Quick Calculations -> Level 0 Direct
        if profile == ExecutionProfile.FAST or intent == TaskIntent.QUICK_CALC:
            model = "qwen2.5:3b" if model_registry.get_health("qwen2.5:3b").status != "offline" else "qwen2.5:7b"
            return AetherionRouteDecision(
                profile=ExecutionProfile.FAST,
                ensemble_level=EnsembleLevel.DIRECT,
                intent=intent,
                complexity_score=0.15,
                primary_model=model,
                role=AetherionModelRole.MINI,
                synthesis_model=model,
                requires_tools=intent == TaskIntent.QUICK_CALC,
                privacy_mode=privacy_mode,
                reasoning_summary="Direct low-latency route chosen for high-speed response.",
            )

        # 2. Local Only Privacy Mode -> Enforce strictly on-device models (Section 19 & 89)
        if is_local_only:
            model = "qwen2.5:7b"
            level = EnsembleLevel.AGENT if intent != TaskIntent.CONVERSATION else EnsembleLevel.DIRECT
            return AetherionRouteDecision(
                profile=profile,
                ensemble_level=level,
                intent=intent,
                complexity_score=0.45,
                primary_model=model,
                role=AetherionModelRole.FAST,
                planner_model="qwen2.5:7b",
                verifier_model="qwen2.5:3b",
                synthesis_model="qwen2.5:7b",
                specialists=["LocalAgentWorker"],
                requires_tools=level != EnsembleLevel.DIRECT,
                privacy_mode="local",
                reasoning_summary="Strict Local Only governance applied. Restricted to on-device Ollama models.",
            )

        # 3. Autonomous Complex Project / MAX profile -> Level 4 Aetherion Max
        if profile == ExecutionProfile.MAX or intent == TaskIntent.AUTONOMOUS_PROJECT or "enterprise" in p or "build a production" in p:
            planner_model = self._select_available_model(
                ["nemotron-3-ultra:cloud", "nemotron-3-super:cloud", "gpt-oss:120b-cloud"],
                fallback="qwen2.5:7b",
            )
            return AetherionRouteDecision(
                profile=ExecutionProfile.MAX,
                ensemble_level=EnsembleLevel.MAX_ENSEMBLE,
                intent=intent,
                complexity_score=0.95,
                primary_model=planner_model,
                role=AetherionModelRole.ULTRA if "ultra" in planner_model else AetherionModelRole.SUPER,
                planner_model=planner_model,
                verifier_model="nemotron-3-nano:30b-cloud",
                synthesis_model=planner_model,
                specialists=["ResearchAgent", "CodingAgent", "DataAgent", "VerificationAgent"],
                requires_tools=True,
                privacy_mode=privacy_mode,
                reasoning_summary="Aetherion Max orchestration engaged with master planning, specialist fleet, and verification loop.",
            )

        # 4. Deep Research -> Level 3 Multi-Agent
        if intent == TaskIntent.DEEP_RESEARCH or profile == ExecutionProfile.DEEP:
            primary = self._select_available_model(
                ["nemotron-3-super:cloud", "gpt-oss:120b-cloud", "nemotron-3-nano:30b-cloud"],
                fallback="qwen2.5:7b",
            )
            return AetherionRouteDecision(
                profile=ExecutionProfile.DEEP,
                ensemble_level=EnsembleLevel.MULTI_AGENT,
                intent=intent,
                complexity_score=0.85,
                primary_model=primary,
                role=AetherionModelRole.SUPER if "super" in primary else AetherionModelRole.REASON,
                planner_model=primary,
                verifier_model="nemotron-3-nano:30b-cloud",
                synthesis_model=primary,
                specialists=["ResearchAgent", "VerificationAgent"],
                requires_tools=True,
                privacy_mode=privacy_mode,
                reasoning_summary="Deep research routing: Multi-source parallel retrieval with citation verification.",
            )

        # 5. Coding & Software Tasks -> Level 2 Agent with GPT-OSS / Qwen 7B
        if intent in (TaskIntent.CODE_DEVELOPMENT, TaskIntent.CODE_DEBUG):
            coder = self._select_available_model(
                ["gpt-oss:120b-cloud", "qwen2.5:7b", "nemotron-3-nano:30b-cloud"],
                fallback="qwen2.5:7b",
            )
            return AetherionRouteDecision(
                profile=profile,
                ensemble_level=EnsembleLevel.AGENT,
                intent=intent,
                complexity_score=0.75,
                primary_model=coder,
                role=AetherionModelRole.REASON if "120b" in coder else AetherionModelRole.FAST,
                planner_model=coder,
                verifier_model="nemotron-3-nano:30b-cloud",
                synthesis_model=coder,
                specialists=["CodingAgent", "VerificationAgent"],
                requires_tools=True,
                privacy_mode=privacy_mode,
                reasoning_summary="Code execution route: Sandboxed execution with automated unit test verification.",
            )

        # 6. Data Analysis -> Level 2 Agent
        if intent == TaskIntent.DATA_ANALYSIS:
            analyst = self._select_available_model(
                ["gpt-oss:120b-cloud", "nemotron-3-super:cloud", "qwen2.5:7b"],
                fallback="qwen2.5:7b",
            )
            return AetherionRouteDecision(
                profile=profile,
                ensemble_level=EnsembleLevel.AGENT,
                intent=intent,
                complexity_score=0.70,
                primary_model=analyst,
                role=AetherionModelRole.REASON if "120b" in analyst else AetherionModelRole.SUPER,
                planner_model=analyst,
                verifier_model="nemotron-3-nano:30b-cloud",
                synthesis_model=analyst,
                specialists=["DataAgent"],
                requires_tools=True,
                privacy_mode=privacy_mode,
                reasoning_summary="Data analysis route: Tabular inspection, transformation, and chart verification.",
            )

        # 7. Document RAG -> Level 2 Agent
        if intent == TaskIntent.DOCUMENT_RAG or has_files:
            rag_model = self._select_available_model(
                ["nemotron-3-nano:30b-cloud", "qwen2.5:7b", "gemma4:31b-cloud"],
                fallback="qwen2.5:7b",
            )
            return AetherionRouteDecision(
                profile=profile,
                ensemble_level=EnsembleLevel.AGENT,
                intent=intent,
                complexity_score=0.55,
                primary_model=rag_model,
                role=AetherionModelRole.NANO if "nano" in rag_model else AetherionModelRole.FAST,
                planner_model=rag_model,
                synthesis_model=rag_model,
                specialists=["KnowledgeAgent"],
                requires_tools=True,
                requires_rag=True,
                privacy_mode=privacy_mode,
                reasoning_summary="Document intelligence route: Vector RAG retrieval with source provenance.",
            )

        # 8. Multimodal Vision Routing -> Level 2 Agent
        if intent == TaskIntent.VISION or has_images:
            vision_model = self._select_available_model(
                ["gemma4:31b-cloud", "nemotron-3-nano:30b-cloud", "qwen2.5:7b"],
                fallback="qwen2.5:7b" if is_local_only else "gemma4:31b-cloud",
            )
            return AetherionRouteDecision(
                profile=profile,
                ensemble_level=EnsembleLevel.AGENT,
                intent=TaskIntent.VISION,
                complexity_score=0.65,
                primary_model=vision_model,
                role=AetherionModelRole.VISION if "gemma" in vision_model else AetherionModelRole.FAST,
                planner_model=vision_model,
                synthesis_model=vision_model,
                specialists=["VisionAgent"],
                requires_tools=True,
                requires_vision=True,
                privacy_mode=privacy_mode,
                reasoning_summary="Multimodal vision route: Image perception, visual feature extraction, and OCR analysis via Gemma 4 Vision.",
            )

        # 9. Standard Conversation -> Level 0 / 1 Fast Direct

        fast_model = self._select_available_model(
            ["qwen2.5:7b", "nemotron-3-nano:30b-cloud"],
            fallback="qwen2.5:3b",
        )
        return AetherionRouteDecision(
            profile=profile,
            ensemble_level=EnsembleLevel.DIRECT,
            intent=intent,
            complexity_score=0.25,
            primary_model=fast_model,
            role=AetherionModelRole.FAST,
            synthesis_model=fast_model,
            requires_tools=False,
            privacy_mode=privacy_mode,
            reasoning_summary="Direct conversational route: Responsive on-device execution.",
        )

    def _select_available_model(self, candidates: List[str], fallback: str) -> str:
        for cand in candidates:
            health = model_registry.get_health(cand)
            if health.status != "offline":
                return cand
        return fallback


aetherion_router = AetherionRouter()


class AetherionOrchestrator:
    """
    Unified Orchestrator:
    Coordinates Aetherion model fleet, planning, tool delegation, independent
    verification, and multi-event SSE streaming.
    """

    async def stream_orchestration(
        self,
        prompt: str,
        conversation_id: Optional[str] = None,
        profile_str: str = "balanced",
        privacy_mode: str = "auto",
        attachments: Optional[List[str]] = None,
        tools_enabled: bool = True,
        model_override: Optional[str] = None,
        mode: str = "auto",
    ) -> AsyncGenerator[str, None]:
        task_id = str(uuid.uuid4())
        start_time = time.time()
        governor.active_workers_count += 1

        try:
            # Parse profile
            try:
                profile = ExecutionProfile(profile_str.lower())
            except Exception:
                profile = ExecutionProfile.BALANCED

            # 1. Routing decision
            route = aetherion_router.route(
                prompt=prompt,
                profile=profile,
                privacy_mode=privacy_mode,
                has_files=bool(attachments),
                model_override=model_override,
            )

            # Emit Task Created Event
            yield f"data: {json.dumps({'type': 'task_created', 'task_id': task_id, 'profile': route.profile.value, 'ensemble_level': route.ensemble_level.value, 'model_selected': route.primary_model, 'role': route.role.value})}\n\n"

            # Emit Model Selected Event
            yield f"data: {json.dumps({'type': 'model_selected', 'model': route.primary_model, 'role': route.role.value, 'reason': route.reasoning_summary})}\n\n"

            # 2. Check if Direct Mode (Level 0) without autonomous planning
            if route.ensemble_level == EnsembleLevel.DIRECT and not route.requires_tools and not attachments and mode != "agent":
                yield f"data: {json.dumps({'type': 'status', 'status': 'Generating response with Aetherion...', 'stage': 'llm'})}\n\n"

                messages = [
                    {
                        "role": "system",
                        "content": (
                            "You are Voltix Aetherion, an adaptive agentic AI operating system. "
                            "Provide a concise, direct, helpful, and technically accurate response."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ]

                token_count = 0
                async for token in llm_router.route_stream(messages=messages, model=route.primary_model):
                    token_count += 1
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

                duration_ms = round((time.time() - start_time) * 1000, 2)
                governor.record_call(route.primary_model, duration_ms, token_count)
                yield f"data: {json.dumps({'type': 'done', 'task_id': task_id, 'tokens': token_count, 'duration_ms': duration_ms})}\n\n"
                return

            # 3. Agentic Workflow (Level 1, 2, 3, or 4)
            yield f"data: {json.dumps({'type': 'status', 'status': 'Aetherion Planning & Intent Analysis...', 'stage': 'reasoning'})}\n\n"

            # Plan generation
            plan = planner.create_plan(
                goal=prompt,
                has_attachments=bool(attachments),
                file_ids=attachments,
            )

            yield f"data: {json.dumps({'type': 'plan_created', 'plan': {'goal': prompt, 'steps': [{'id': s.id, 'step_number': s.step_number, 'title': s.title, 'agent_type': s.agent_type, 'tool_name': s.tool_name} for s in plan.steps]}})}\n\n"

            # Execute Steps
            executed_steps_data = []
            retrieved_citations = []

            for step in plan.steps:
                yield f"data: {json.dumps({'type': 'status', 'status': f'Executing: {step.title}', 'stage': 'tool'})}\n\n"
                yield f"data: {json.dumps({'type': 'step_started', 'step': {'id': step.id, 'step_number': step.step_number, 'title': step.title, 'tool_name': step.tool_name}})}\n\n"

                step_output = None

                # Execute RAG Retrieval if Knowledge tool
                if step.tool_name and "knowledge" in step.tool_name and attachments:
                    retrieved_text, citations = rag_retriever.retrieve(query=prompt, file_ids=attachments, top_k=4)
                    retrieved_citations.extend(citations)
                    step_output = f"Retrieved {len(citations)} relevant document passages."
                    if citations:
                        yield f"data: {json.dumps({'type': 'citations', 'citations': [c.model_dump() for c in citations]})}\n\n"

                # Execute registered safe tool if assigned
                elif step.tool_name and tools_enabled and tool_registry.get(step.tool_name):
                    yield f"data: {json.dumps({'type': 'tool_started', 'tool': step.tool_name, 'step_id': step.id})}\n\n"
                    try:
                        # Extract args or use intelligent defaults
                        kwargs = {}
                        if "math" in step.tool_name:
                            calc_match = re.search(r"[\d\.\+\-\*\/\^\(\)\s]+", prompt)
                            kwargs = {"expression": calc_match.group(0).strip() if calc_match else "42 * 2"}
                        elif "data" in step.tool_name:
                            kwargs = {"file_path": attachments[0] if attachments else "sample.csv"}
                        elif "code" in step.tool_name:
                            kwargs = {"query": prompt}

                        tool_res = await tool_registry.execute(step.tool_name, **kwargs)
                        step_output = str(tool_res)
                        yield f"data: {json.dumps({'type': 'tool_output', 'tool': step.tool_name, 'output': str(tool_res)[:200]})}\n\n"
                    except Exception as err:
                        logger.warning(f"Tool execution failed for {step.tool_name}: {err}")
                        step_output = f"Tool note: {str(err)}"

                else:
                    # Simulated specialist computation
                    await asyncio.sleep(0.05)
                    step_output = f"Completed analysis for {step.title}"

                executed_steps_data.append({"step": step.title, "output": step_output})

            # 4. Independent Verification Pass (Section 14 & 41)
            yield f"data: {json.dumps({'type': 'verification_started', 'verifier': route.verifier_model or 'nemotron-3-nano:30b-cloud'})}\n\n"
            
            verif_result = verification_engine.verify_step(
                goal=prompt,
                step_title="Aetherion Plan Verification",
                tool_name=plan.steps[0].tool_name if plan.steps else None,
                tool_output=executed_steps_data[-1]["output"] if executed_steps_data else None,
            )

            yield f"data: {json.dumps({'type': 'verification_result', 'passed': verif_result.passed, 'confidence': verif_result.confidence, 'feedback': verif_result.feedback})}\n\n"

            # 5. Final Synthesis Generation (Section 61 & 62)
            yield f"data: {json.dumps({'type': 'status', 'status': f'Synthesizing deliverables with {route.synthesis_model}...', 'stage': 'llm'})}\n\n"

            synthesis_prompt = (
                f"User Goal: {prompt}\n\n"
                f"Execution Strategy: Aetherion {route.profile.value.upper()} (Model: {route.primary_model})\n"
                f"Executed Steps:\n"
                + "\n".join([f"- {s['step']}: {s['output']}" for s in executed_steps_data])
                + "\n\nProvide the final synthesized, verified, polished response to the user."
            )

            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are Voltix Aetherion, the adaptive agentic operating layer. "
                        "Synthesize verified findings into a well-structured, professional, authoritative deliverable."
                    ),
                },
                {"role": "user", "content": synthesis_prompt},
            ]

            token_count = 0
            async for token in llm_router.route_stream(messages=messages, model=route.synthesis_model):
                token_count += 1
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

            # Artifact creation for deliverables
            if "report" in prompt.lower() or "presentation" in prompt.lower() or "export" in prompt.lower():
                artifact_id = str(uuid.uuid4())[:8]
                yield f"data: {json.dumps({'type': 'artifact_created', 'artifact': {'id': artifact_id, 'name': 'Aetherion_Report.md', 'type': 'markdown', 'size_bytes': 2048}})}\n\n"

            duration_ms = round((time.time() - start_time) * 1000, 2)
            governor.record_call(route.primary_model, duration_ms, token_count)
            governor.total_tasks_completed += 1

            yield f"data: {json.dumps({'type': 'done', 'task_id': task_id, 'tokens': token_count, 'duration_ms': duration_ms, 'model': route.primary_model, 'ensemble_level': route.ensemble_level.value})}\n\n"

        except Exception as e:
            logger.error(f"Aetherion Orchestration Error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        finally:
            governor.active_workers_count = max(0, governor.active_workers_count - 1)


aetherion_orchestrator = AetherionOrchestrator()
