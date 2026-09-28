from typing import List, Tuple
from backend.app.core.security import wrap_untrusted_context
from backend.app.rag.vector_store import vector_store
from backend.app.schemas.chat import CitationItem


class RAGRetriever:
    def __init__(self, store=vector_store):
        self.store = store

    def retrieve(
        self,
        query: str,
        file_ids: List[str] = None,
        top_k: int = 4,
    ) -> Tuple[str, List[CitationItem]]:
        """
        Retrieves top relevant chunks, builds structured citations,
        and produces isolated contextual text.
        """
        results = self.store.search(query=query, top_k=top_k, file_ids=file_ids)
        if not results:
            return "", []

        context_blocks = []
        citations: List[CitationItem] = []

        for idx, (record, score) in enumerate(results, start=1):
            text = record.get("text", "")
            meta = record.get("metadata", {})
            filename = meta.get("filename", "Uploaded Document")

            # Create clean snippet
            snippet = text[:200] + ("..." if len(text) > 200 else "")
            citations.append(
                CitationItem(
                    id=idx,
                    source=f"[{idx}] {filename}",
                    filename=filename,
                    snippet=snippet,
                    score=round(score, 3),
                )
            )

            wrapped = wrap_untrusted_context(text, f"Source [{idx}]: {filename}")
            context_blocks.append(wrapped)

        combined_context = "\n\n".join(context_blocks)
        return combined_context, citations


rag_retriever = RAGRetriever()
