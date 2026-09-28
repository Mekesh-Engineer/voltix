import math
import re
from typing import List, Dict, Optional
import httpx
from backend.app.config import settings
from backend.app.core.logging import logger


class EmbeddingsService:
    def __init__(self):
        self.ollama_base_url = settings.OLLAMA_BASE_URL.rstrip("/")
        self.embedding_model = "nomic-embed-text"

    async def get_embedding(self, text: str) -> Optional[List[float]]:
        """Attempts to obtain high-dimensional vector embeddings from Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    f"{self.ollama_base_url}/api/embeddings",
                    json={"model": self.embedding_model, "prompt": text[:2000]},
                )
                if res.status_code == 200:
                    data = res.json()
                    return data.get("embedding")
        except Exception:
            pass
        return None

    def compute_sparse_vector(self, text: str) -> Dict[str, float]:
        """
        Computes normalized term frequency vector with subword n-grams
        for robust offline similarity search and hybrid RAG.
        """
        words = re.findall(r"\w+", text.lower())
        if not words:
            return {}

        tf: Dict[str, float] = {}
        for w in words:
            tf[w] = tf.get(w, 0.0) + 1.0

        # Include character 3-grams for typo-tolerant matching
        for i in range(len(text) - 2):
            trigram = text[i:i + 3].lower()
            if not trigram.isspace():
                tf[f"tg_{trigram}"] = tf.get(f"tg_{trigram}", 0.0) + 0.25

        # Normalize
        norm = math.sqrt(sum(v * v for v in tf.values())) or 1.0
        return {k: v / norm for k, v in tf.items()}

    def cosine_similarity(self, vec_a: Dict[str, float], vec_b: Dict[str, float]) -> float:
        """Calculates cosine similarity between two sparse term vectors."""
        if not vec_a or not vec_b:
            return 0.0
        # Dot product
        common_keys = set(vec_a.keys()).intersection(vec_b.keys())
        return sum(vec_a[k] * vec_b[k] for k in common_keys)

    def dense_cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Calculates cosine similarity between two dense floating point vectors."""
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a)) or 1.0
        norm_b = math.sqrt(sum(b * b for b in vec_b)) or 1.0
        return dot / (norm_a * norm_b)


embeddings_service = EmbeddingsService()
