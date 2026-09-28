import pytest
from backend.app.rag.chunker import chunk_text
from backend.app.rag.embeddings import embeddings_service


def test_chunker_overlap():
    text = "Sentence one. Sentence two. Sentence three. Sentence four. " * 50
    chunks = chunk_text(text, chunk_size=200, chunk_overlap=50)
    assert len(chunks) > 1
    assert chunks[0].index == 0
    assert "chunk_id" in chunks[0].metadata


def test_sparse_embeddings_similarity():
    vec1 = embeddings_service.compute_sparse_vector("quantum computing algorithm")
    vec2 = embeddings_service.compute_sparse_vector("quantum computer algorithms")
    vec3 = embeddings_service.compute_sparse_vector("sourdough baking bread")
    sim_related = embeddings_service.cosine_similarity(vec1, vec2)
    sim_unrelated = embeddings_service.cosine_similarity(vec1, vec3)
    assert sim_related > sim_unrelated
    assert sim_related > 0.4
