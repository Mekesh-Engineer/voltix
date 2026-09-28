from abc import ABC, abstractmethod
from typing import List, Dict, Any, AsyncGenerator, Optional
from backend.app.schemas.model import ModelInfo


class LLMProvider(ABC):
    name: str = "base"

    @abstractmethod
    async def generate(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        images: Optional[List[str]] = None,
    ) -> str:
        """Generates a complete response synchronously/awaitable."""
        pass

    @abstractmethod
    async def stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        images: Optional[List[str]] = None,
    ) -> AsyncGenerator[str, None]:
        """Yields streaming string tokens as they are produced by the LLM."""
        pass


    @abstractmethod
    async def list_models(self) -> List[ModelInfo]:
        """Returns the list of available models for this provider."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Returns True if the provider service/API is reachable."""
        pass
