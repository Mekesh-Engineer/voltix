import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from backend.app.config import settings
from backend.app.core.logging import logger
from backend.app.rag.chunker import TextChunk
from backend.app.rag.embeddings import embeddings_service


class VectorStore:
    def __init__(self, storage_dir: str = settings.VECTOR_DB_PATH):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.storage_dir / "index.json"
        self.records: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.index_file.exists():
            try:
                content = self.index_file.read_text(encoding="utf-8")
                self.records = json.loads(content)
            except Exception as e:
                logger.error(f"Failed to load vector store: {e}")
                self.records = []

    def _save(self):
        temp_file = self.index_file.with_suffix(".tmp")
        try:
            temp_file.write_text(json.dumps(self.records, indent=2), encoding="utf-8")
            temp_file.replace(self.index_file)
        except Exception as e:
            logger.error(f"Failed to persist vector index atomically: {e}")
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except Exception:
                    pass

    def add_chunks(self, chunks: List[TextChunk]):
        for chunk in chunks:
            sparse_vec = embeddings_service.compute_sparse_vector(chunk.text)
            self.records.append({
                "text": chunk.text,
                "metadata": chunk.metadata,
                "sparse_vector": sparse_vec,
            })
        self._save()
        logger.info(f"Added {len(chunks)} chunks to vector store. Total records: {len(self.records)}")

    def delete_file_chunks(self, file_id: str):
        original_count = len(self.records)
        self.records = [
            r for r in self.records if r.get("metadata", {}).get("file_id") != file_id
        ]
        if len(self.records) != original_count:
            self._save()
            logger.info(f"Removed chunks for file {file_id}")

    def search(
        self,
        query: str,
        top_k: int = 4,
        file_ids: List[str] = None,
        min_score: float = 0.05,
    ) -> List[Tuple[Dict[str, Any], float]]:
        if not self.records or not query.strip():
            return []

        query_vec = embeddings_service.compute_sparse_vector(query)
        scored: List[Tuple[Dict[str, Any], float]] = []

        for record in self.records:
            if file_ids:
                record_file_id = record.get("metadata", {}).get("file_id")
                if record_file_id not in file_ids:
                    continue

            sparse_vec = record.get("sparse_vector", {})
            score = embeddings_service.cosine_similarity(query_vec, sparse_vec)
            if score >= min_score:
                scored.append((record, score))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]


vector_store = VectorStore()
