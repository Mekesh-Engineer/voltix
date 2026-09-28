import json
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from backend.app.config import settings
from backend.app.core.exceptions import OllamaUnavailableError, LLMProviderError
from backend.app.core.logging import logger
from backend.app.llm.base import LLMProvider
from backend.app.schemas.model import ModelInfo


KNOWN_OLLAMA_METADATA = {
    "qwen2.5:3b": ("Qwen 2.5 3B", "Local", "LOCAL · FAST", 32768),
    "qwen2.5:7b": ("Qwen 2.5 7B", "Local", "LOCAL · CODING", 32768),
    "gemma4:31b-cloud": ("Gemma 4 31B", "Cloud", "CLOUD · VISION · REASONING", 262144),
    "gpt-oss:120b-cloud": ("GPT-OSS 120B", "Cloud", "CLOUD · REASONING · CODING", 131072),
    "nemotron-3-nano:30b-cloud": ("Nemotron 3 Nano", "Cloud", "CLOUD · LONG CONTEXT", 262144),
    "nemotron-3-super:cloud": ("Nemotron 3 Super", "Cloud", "CLOUD · REASONING · AGENTS", 262144),
    "nemotron-3-ultra:cloud": ("Nemotron 3 Ultra", "Cloud", "CLOUD · ADVANCED AGENTS", 262144),
}


def _clean_base64(img_str: str) -> str:
    if "," in img_str and "base64" in img_str:
        return img_str.split(",", 1)[-1].strip()
    return img_str.strip()


def _prepare_payload_messages(messages: List[Dict[str, Any]], images: Optional[List[str]] = None) -> List[Dict[str, Any]]:
    payload_messages = []
    cleaned_images = [_clean_base64(img) for img in (images or []) if img]
    for i, m in enumerate(messages):
        msg_dict = dict(m)
        if "images" in msg_dict and msg_dict["images"]:
            msg_dict["images"] = [_clean_base64(img) for img in msg_dict["images"] if img]
        if i == len(messages) - 1 and msg_dict.get("role") == "user" and cleaned_images:
            if "images" in msg_dict and isinstance(msg_dict["images"], list):
                msg_dict["images"] = list(msg_dict["images"]) + cleaned_images
            else:
                msg_dict["images"] = cleaned_images
        payload_messages.append(msg_dict)
    return payload_messages


class OllamaProvider(LLMProvider):
    name: str = "ollama"

    def __init__(self, base_url: Optional[str] = None):
        raw_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        # Prioritize 127.0.0.1 over localhost to eliminate Windows IPv6 (::1) DNS resolution delays
        if "localhost:11434" in raw_url:
            self.base_url = raw_url.replace("localhost:11434", "127.0.0.1:11434")
        else:
            self.base_url = raw_url
        self.default_model = settings.OLLAMA_DEFAULT_MODEL

    def _get_candidate_urls(self) -> List[str]:
        return [self.base_url]


    async def is_available(self) -> bool:
        for url in self._get_candidate_urls():
            try:
                async with httpx.AsyncClient(timeout=1.5) as client:
                    res = await client.get(f"{url}/api/tags")
                    if res.status_code == 200:
                        self.base_url = url
                        return True
            except Exception:
                continue
        return False

    async def list_models(self) -> List[ModelInfo]:
        for url in self._get_candidate_urls():
            try:
                async with httpx.AsyncClient(timeout=2.0) as client:
                    res = await client.get(f"{url}/api/tags")
                    if res.status_code == 200:
                        self.base_url = url
                        data = res.json()
                        models = []
                        for item in data.get("models", []):
                            raw_name = item.get("name", "")
                            if raw_name in KNOWN_OLLAMA_METADATA:
                                name, category, desc, ctx = KNOWN_OLLAMA_METADATA[raw_name]
                            else:
                                clean_name = raw_name.split(":")[0] if ":" in raw_name else raw_name
                                is_cloud = "cloud" in raw_name.lower()
                                name = f"Ollama {clean_name.capitalize()}"
                                category = "Cloud" if is_cloud else "Local"
                                desc = f"{category.upper()} · REASONING"
                                ctx = item.get("details", {}).get("context_length", 8192) or 8192

                            models.append(
                                ModelInfo(
                                    id=raw_name,
                                    name=name,
                                    provider="ollama",
                                    category=category,
                                    description=desc,
                                    context_window=ctx,
                                    available=True,
                                    icon_type="ollama",
                                )
                            )
                        if models:
                            return models
            except Exception as e:
                logger.debug(f"Ollama list_models on {url} failed: {e}")

        # Fallback models if Ollama daemon is unreachable
        return [
            ModelInfo(
                id=m_id,
                name=meta[0],
                provider="ollama",
                category=meta[1],
                description=meta[2],
                context_window=meta[3],
                available=False,
                icon_type="ollama",
            )
            for m_id, meta in KNOWN_OLLAMA_METADATA.items()
        ]

    async def generate(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        images: Optional[List[str]] = None,
    ) -> str:
        target_model = model or self.default_model
        payload_messages = _prepare_payload_messages(messages, images)
        payload = {
            "model": target_model,
            "messages": payload_messages,
            "stream": False,
            "options": {"temperature": temperature},
        }
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        last_error = None
        for url in self._get_candidate_urls():
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(timeout=15.0, connect=2.0, read=15.0)) as client:
                    res = await client.post(f"{url}/api/chat", json=payload)
                    if res.status_code != 200:
                        raise LLMProviderError(f"Ollama returned HTTP {res.status_code}: {res.text}")
                    data = res.json()
                    self.base_url = url
                    return data.get("message", {}).get("content", "")
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.TimeoutException) as ce:
                last_error = ce
                continue
            except Exception as e:
                raise LLMProviderError(f"Ollama error: {str(e)}")

        raise OllamaUnavailableError() if isinstance(last_error, (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.TimeoutException)) else LLMProviderError(str(last_error))

    async def stream(
        self,
        messages: List[Dict[str, Any]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        images: Optional[List[str]] = None,
    ) -> AsyncGenerator[str, None]:
        target_model = model or self.default_model
        payload_messages = _prepare_payload_messages(messages, images)
        payload = {
            "model": target_model,
            "messages": payload_messages,
            "stream": True,
            "options": {"temperature": temperature},
        }
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens

        last_error = None
        success = False

        for url in self._get_candidate_urls():
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(timeout=12.0, connect=2.0, read=12.0)) as client:
                    async with client.stream("POST", f"{url}/api/chat", json=payload) as response:
                        if response.status_code != 200:
                            err_body = await response.aread()
                            raise LLMProviderError(f"Ollama HTTP {response.status_code}: {err_body.decode()}")

                        self.base_url = url
                        success = True
                        async for line in response.aiter_lines():
                            if not line:
                                continue
                            try:
                                chunk = json.loads(line)
                                token = chunk.get("message", {}).get("content", "")
                                if token:
                                    yield token
                                if chunk.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
                        return
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.ReadTimeout, httpx.TimeoutException) as ce:
                last_error = ce
                continue
            except Exception as e:
                if isinstance(e, (OllamaUnavailableError, LLMProviderError)):
                    raise
                raise LLMProviderError(f"Ollama stream error: {str(e)}")

        if not success:
            raise OllamaUnavailableError()

