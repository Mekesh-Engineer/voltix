import time
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from backend.app.core.logging import logger


class ModelCapability(str, Enum):
    REASONING = "reasoning"
    CODING = "coding"
    TOOL_USE = "tool_use"
    RESEARCH = "research"
    DATA_ANALYSIS = "data_analysis"
    MATH = "math"
    VISION = "vision"
    FAST_RESPONSE = "fast_response"
    LARGE_CONTEXT = "large_context"
    STRUCTURED_OUTPUT = "structured_output"


class ModelHealth(BaseModel):
    model_id: str
    status: str = "online"  # online, degraded, offline
    latency_ms: float = 0.0
    last_checked: float = Field(default_factory=time.time)
    consecutive_failures: int = 0
    total_calls: int = 0
    successful_calls: int = 0

    @property
    def error_rate(self) -> float:
        if self.total_calls == 0:
            return 0.0
        return round((self.total_calls - self.successful_calls) / self.total_calls, 3)


class ModelFallbackPolicy(BaseModel):
    primary_model: str
    fallbacks: List[str]
    trigger_on_timeout: bool = True
    trigger_on_error: bool = True
    timeout_threshold_seconds: float = 45.0


class ModelProfile(BaseModel):
    id: str
    name: str
    provider: str = "ollama"
    category: str = "Cloud"  # "Local" or "Cloud"
    context_window: int = 32768
    capabilities: List[ModelCapability] = []
    reasoning_score: float = 0.8  # 0.0 to 1.0
    coding_score: float = 0.8
    tool_use_score: float = 0.8
    speed_score: float = 0.8  # higher = faster
    description: str = ""
    fallback_model: Optional[str] = None


class ModelRegistry:
    def __init__(self):
        self._profiles: Dict[str, ModelProfile] = {}
        self._health: Dict[str, ModelHealth] = {}
        self._fallback_policies: Dict[str, ModelFallbackPolicy] = {}
        self._initialize_curated_models()

    def _initialize_curated_models(self):
        curated = [
            ModelProfile(
                id="nemotron-3-ultra:cloud",
                name="Nemotron 3 Ultra (Cloud)",
                category="Cloud",
                context_window=131072,
                capabilities=[
                    ModelCapability.REASONING,
                    ModelCapability.CODING,
                    ModelCapability.TOOL_USE,
                    ModelCapability.RESEARCH,
                    ModelCapability.DATA_ANALYSIS,
                    ModelCapability.LARGE_CONTEXT,
                    ModelCapability.STRUCTURED_OUTPUT,
                ],
                reasoning_score=0.98,
                coding_score=0.95,
                tool_use_score=0.96,
                speed_score=0.75,
                description="Ultra-high-parameter reasoning and autonomous orchestration cloud model.",
                fallback_model="nemotron-3-super:cloud",
            ),
            ModelProfile(
                id="nemotron-3-super:cloud",
                name="Nemotron 3 Super (Cloud)",
                category="Cloud",
                context_window=131072,
                capabilities=[
                    ModelCapability.REASONING,
                    ModelCapability.CODING,
                    ModelCapability.TOOL_USE,
                    ModelCapability.RESEARCH,
                    ModelCapability.LARGE_CONTEXT,
                ],
                reasoning_score=0.93,
                coding_score=0.90,
                tool_use_score=0.92,
                speed_score=0.82,
                description="High-capacity cloud model optimized for multi-step workflows and synthesis.",
                fallback_model="nemotron-3-nano:30b-cloud",
            ),
            ModelProfile(
                id="nemotron-3-nano:30b-cloud",
                name="Nemotron 3 Nano 30B (Cloud)",
                category="Cloud",
                context_window=65536,
                capabilities=[
                    ModelCapability.FAST_RESPONSE,
                    ModelCapability.TOOL_USE,
                    ModelCapability.REASONING,
                    ModelCapability.CODING,
                ],
                reasoning_score=0.86,
                coding_score=0.85,
                tool_use_score=0.88,
                speed_score=0.92,
                description="Fast and efficient cloud model for low-latency reasoning and tool dispatch.",
                fallback_model="qwen2.5:7b",
            ),
            ModelProfile(
                id="gpt-oss:120b-cloud",
                name="GPT-OSS 120B (Cloud)",
                category="Cloud",
                context_window=131072,
                capabilities=[
                    ModelCapability.REASONING,
                    ModelCapability.CODING,
                    ModelCapability.RESEARCH,
                    ModelCapability.DATA_ANALYSIS,
                    ModelCapability.LARGE_CONTEXT,
                ],
                reasoning_score=0.96,
                coding_score=0.94,
                tool_use_score=0.93,
                speed_score=0.78,
                description="Heavyweight open-source 120B model for deep technical analysis and code generation.",
                fallback_model="nemotron-3-super:cloud",
            ),
            ModelProfile(
                id="gemma4:31b-cloud",
                name="Gemma 4 31B (Cloud)",
                category="Cloud",
                context_window=65536,
                capabilities=[
                    ModelCapability.REASONING,
                    ModelCapability.RESEARCH,
                    ModelCapability.TOOL_USE,
                    ModelCapability.VISION,
                ],
                reasoning_score=0.89,
                coding_score=0.82,
                tool_use_score=0.87,
                speed_score=0.88,
                description="Versatile multi-task cloud model with multimodal and research aptitude.",
                fallback_model="qwen2.5:7b",
            ),
            ModelProfile(
                id="qwen2.5:7b",
                name="Qwen 2.5 7B (Local)",
                category="Local",
                context_window=32768,
                capabilities=[
                    ModelCapability.CODING,
                    ModelCapability.MATH,
                    ModelCapability.TOOL_USE,
                    ModelCapability.REASONING,
                    ModelCapability.FAST_RESPONSE,
                ],
                reasoning_score=0.88,
                coding_score=0.90,
                tool_use_score=0.89,
                speed_score=0.90,
                description="High-performance local model with excellent coding, mathematical, and tool compliance.",
                fallback_model="qwen2.5:3b",
            ),
            ModelProfile(
                id="qwen2.5:3b",
                name="Qwen 2.5 3B (Local)",
                category="Local",
                context_window=32768,
                capabilities=[
                    ModelCapability.FAST_RESPONSE,
                    ModelCapability.MATH,
                    ModelCapability.TOOL_USE,
                ],
                reasoning_score=0.78,
                coding_score=0.79,
                tool_use_score=0.82,
                speed_score=0.98,
                description="Ultra-lightweight, blazing fast local model for rapid queries and basic assistance.",
                fallback_model=None,
            ),
        ]

        for p in curated:
            self._profiles[p.id] = p
            self._health[p.id] = ModelHealth(model_id=p.id)
            self._fallback_policies[p.id] = ModelFallbackPolicy(
                primary_model=p.id,
                fallbacks=[p.fallback_model] if p.fallback_model else ["qwen2.5:7b"],
            )

    def get_profile(self, model_id: str) -> Optional[ModelProfile]:
        return self._profiles.get(model_id)

    def list_all(self) -> List[ModelProfile]:
        return list(self._profiles.values())

    def register_or_update(self, profile: ModelProfile):
        self._profiles[profile.id] = profile
        if profile.id not in self._health:
            self._health[profile.id] = ModelHealth(model_id=profile.id)

    def get_health(self, model_id: str) -> ModelHealth:
        if model_id not in self._health:
            self._health[model_id] = ModelHealth(model_id=model_id)
        return self._health[model_id]

    def record_call_success(self, model_id: str, latency_ms: float):
        h = self.get_health(model_id)
        h.total_calls += 1
        h.successful_calls += 1
        h.consecutive_failures = 0
        h.latency_ms = latency_ms
        h.status = "online"
        h.last_checked = time.time()

    def record_call_failure(self, model_id: str, error_msg: str):
        h = self.get_health(model_id)
        h.total_calls += 1
        h.consecutive_failures += 1
        h.last_checked = time.time()
        if h.consecutive_failures >= 3:
            h.status = "offline"
        elif h.consecutive_failures >= 1:
            h.status = "degraded"
        logger.warning(f"Model {model_id} failure recorded: {error_msg} (status={h.status})")

    def get_fallback_model(self, model_id: str) -> str:
        policy = self._fallback_policies.get(model_id)
        if policy and policy.fallbacks:
            for fb in policy.fallbacks:
                if fb in self._profiles and self.get_health(fb).status != "offline":
                    return fb
        return "qwen2.5:7b"


class ModelRouter:
    """
    Intelligent Model Router that dynamically matches user goals and requirements
    to the optimal local or cloud model based on complexity, capabilities, and telemetry.
    """

    def __init__(self, registry: ModelRegistry):
        self.registry = registry

    def select_model(
        self,
        task_intent: str = "general",
        user_override: Optional[str] = None,
        requires_coding: bool = False,
        requires_reasoning: bool = False,
        requires_research: bool = False,
        requires_data_analysis: bool = False,
        requires_vision: bool = False,
        prefer_local: bool = False,
    ) -> str:
        # 1. User manual override takes immediate priority if model exists and is not offline
        if user_override:
            profile = self.registry.get_profile(user_override)
            if profile:
                health = self.registry.get_health(user_override)
                if health.status != "offline":
                    return user_override
                logger.warning(f"Requested model '{user_override}' is offline. Routing to fallback.")
                return self.registry.get_fallback_model(user_override)

        # 2. Prefer local if explicitly set or if user is in offline mode
        if prefer_local:
            if requires_coding or requires_reasoning or requires_data_analysis:
                return "qwen2.5:7b"
            return "qwen2.5:3b"

        # 3. Vision requirement
        if requires_vision:
            gemma = self.registry.get_profile("gemma4:31b-cloud")
            if gemma and self.registry.get_health("gemma4:31b-cloud").status != "offline":
                return "gemma4:31b-cloud"

        # 4. Heavy research or complex data analysis
        if requires_research or requires_data_analysis:
            for cand in ["nemotron-3-ultra:cloud", "gpt-oss:120b-cloud", "nemotron-3-super:cloud"]:
                if self.registry.get_health(cand).status != "offline":
                    return cand

        # 5. Deep coding / refactoring / architectural debugging
        if requires_coding and requires_reasoning:
            for cand in ["gpt-oss:120b-cloud", "nemotron-3-ultra:cloud", "qwen2.5:7b"]:
                if self.registry.get_health(cand).status != "offline":
                    return cand

        # 6. Standard coding
        if requires_coding:
            if self.registry.get_health("qwen2.5:7b").status != "offline":
                return "qwen2.5:7b"
            return "nemotron-3-nano:30b-cloud"

        # 7. Fast responsive conversational tasks
        if task_intent in ("quick_chat", "calculator", "lookup"):
            if self.registry.get_health("qwen2.5:3b").status != "offline":
                return "qwen2.5:3b"
            return "qwen2.5:7b"

        # 8. General multi-step default
        for cand in ["nemotron-3-super:cloud", "nemotron-3-nano:30b-cloud", "qwen2.5:7b"]:
            if self.registry.get_health(cand).status != "offline":
                return cand

        return "qwen2.5:7b"


model_registry = ModelRegistry()
model_router = ModelRouter(model_registry)
