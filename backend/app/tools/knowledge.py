import time
from typing import Dict, Any, List
from backend.app.rag.vector_store import vector_store
from backend.app.rag.retriever import rag_retriever
from backend.app.tools.base import BaseTool, ToolDefinition, ToolResult


class KnowledgeSearchTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="knowledge.search",
                description="Performs semantic, keyword, and hybrid search across uploaded enterprise documents with citations and relevance scoring.",
                category="knowledge",
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query or concept"},
                        "top_k": {"type": "integer", "description": "Maximum chunks to retrieve", "default": 4},
                        "file_ids": {"type": "array", "items": {"type": "string"}, "description": "Optional list of document IDs to scope search to"},
                    },
                    "required": ["query"],
                },
                risk_level="low",
            )
        )

    async def execute(self, query: str, top_k: int = 4, file_ids: List[str] = None, **kwargs) -> ToolResult:
        start = time.time()
        context_str, citations = rag_retriever.retrieve(query=query, file_ids=file_ids, top_k=top_k)
        duration = round((time.time() - start) * 1000, 2)
        citations_data = [c.model_dump() for c in citations]
        return ToolResult(
            tool_name=self.name,
            success=True,
            output=context_str if context_str else "No matching document excerpts found.",
            duration_ms=duration,
            metadata={"citations": citations_data, "match_count": len(citations_data)},
        )


class KnowledgeListDocumentsTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="knowledge.list_documents",
                description="Lists all indexed documents, their chunk counts, and metadata in the knowledge base.",
                category="knowledge",
                input_schema={"type": "object", "properties": {}},
                risk_level="low",
            )
        )

    async def execute(self, **kwargs) -> ToolResult:
        start = time.time()
        docs = {}
        for rec in vector_store.records:
            meta = rec.get("metadata", {})
            f_id = meta.get("file_id", "unknown")
            fname = meta.get("filename", "unknown")
            if f_id not in docs:
                docs[f_id] = {"file_id": f_id, "filename": fname, "chunks": 0}
            docs[f_id]["chunks"] += 1

        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output=list(docs.values()),
            duration_ms=duration,
        )


class KnowledgeGraphQueryTool(BaseTool):
    def __init__(self):
        super().__init__(
            ToolDefinition(
                name="knowledge.graph_query",
                description="Queries the lightweight knowledge graph for entities, relationships, attributes, and source provenance.",
                category="knowledge",
                input_schema={
                    "type": "object",
                    "properties": {
                        "entity": {"type": "string", "description": "Entity name to search relations for"},
                        "relation": {"type": "string", "description": "Optional relation type filter"},
                    },
                    "required": ["entity"],
                },
                risk_level="low",
            )
        )

    async def execute(self, entity: str, relation: str = None, **kwargs) -> ToolResult:
        start = time.time()
        # Search vector store for relations mentioning the entity
        hits = vector_store.search(query=entity, top_k=6)
        facts = []
        for hit, score in hits:
            text = hit.get("text", "")
            meta = hit.get("metadata", {})
            if entity.lower() in text.lower():
                facts.append({
                    "entity": entity,
                    "evidence": text[:200] + "...",
                    "source": meta.get("filename", "unknown"),
                    "confidence": round(score, 3),
                })

        duration = round((time.time() - start) * 1000, 2)
        return ToolResult(
            tool_name=self.name,
            success=True,
            output=facts if facts else f"No direct graph relationships found for entity '{entity}'.",
            duration_ms=duration,
        )
