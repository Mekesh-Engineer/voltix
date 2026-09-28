from typing import List, Dict, Any


class TextChunk:
    def __init__(self, text: str, index: int, metadata: Dict[str, Any]):
        self.text = text
        self.index = index
        self.metadata = metadata

    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "index": self.index,
            "metadata": self.metadata,
        }


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
    metadata: Dict[str, Any] = None,
) -> List[TextChunk]:
    """Recursively chunks text into manageable segments with overlap."""
    if not text.strip():
        return []

    meta = metadata or {}
    separators = ["\n\n", "\n", ". ", " "]
    
    def _split(t: str, seps: List[str]) -> List[str]:
        if not seps or len(t) <= chunk_size:
            # Fallback character slice if no separator splits it
            if len(t) > chunk_size:
                chunks = []
                for i in range(0, len(t), chunk_size - chunk_overlap):
                    chunks.append(t[i:i + chunk_size])
                return chunks
            return [t] if t.strip() else []

        sep = seps[0]
        parts = t.split(sep)
        result = []
        current = ""

        for part in parts:
            candidate = f"{current}{sep}{part}" if current else part
            if len(candidate) <= chunk_size:
                current = candidate
            else:
                if current.strip():
                    result.append(current.strip())
                if len(part) > chunk_size:
                    result.extend(_split(part, seps[1:]))
                    current = ""
                else:
                    current = part

        if current.strip():
            result.append(current.strip())
        return result

    raw_chunks = _split(text, separators)
    chunks: List[TextChunk] = []
    
    for idx, c in enumerate(raw_chunks):
        if c.strip():
            chunk_meta = dict(meta)
            chunk_meta["chunk_id"] = f"{meta.get('file_id', 'doc')}_{idx}"
            chunks.append(TextChunk(text=c.strip(), index=idx, metadata=chunk_meta))

    return chunks
