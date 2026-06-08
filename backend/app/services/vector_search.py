import json
from pathlib import Path

from fastapi import HTTPException, status

from app.core.config import BASE_DIR, settings
from app.services.embedding import LocalHashEmbeddingFunction
from app.services.retrieval_types import IndexingResult, SearchResult


def index_document_chunks(document_id: str) -> IndexingResult:
    if not _is_valid_document_id(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id.",
        )

    chunks_path = BASE_DIR / "chunks" / f"{document_id}.json"
    if not chunks_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chunks were not found. Run chunks first.",
        )

    chunk_records = json.loads(chunks_path.read_text(encoding="utf-8"))
    if not chunk_records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No chunks were found for this document.",
        )

    collection = get_collection()
    collection.upsert(
        ids=[record["chunk_id"] for record in chunk_records],
        documents=[record["text"] for record in chunk_records],
        metadatas=[
            {
                "document_id": record["document_id"],
                "chunk_index": record["index"],
                "character_count": record["character_count"],
                "page": record.get("page") or 0,
            }
            for record in chunk_records
        ],
    )

    return IndexingResult(
        collection_name=settings.chroma_collection_name,
        indexed_chunk_count=len(chunk_records),
        persist_directory=str(Path(settings.chroma_persist_dir)),
    )


def delete_document_vectors(document_id: str) -> int:
    if not _is_valid_document_id(document_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document_id.",
        )

    collection = get_collection()
    existing = collection.get(where={"document_id": document_id})
    existing_ids = existing.get("ids", [])

    if existing_ids:
        collection.delete(where={"document_id": document_id})

    return len(existing_ids)


def get_indexed_document_ids() -> set[str]:
    collection = get_collection()
    if collection.count() == 0:
        return set()

    result = collection.get(include=["metadatas"])
    metadatas = result.get("metadatas", [])

    return {
        str(metadata.get("document_id"))
        for metadata in metadatas
        if metadata and metadata.get("document_id")
    }


def search_vector_candidates(
    question: str,
    document_ids: list[str] | None,
    limit: int,
) -> list[SearchResult]:
    collection = get_collection()
    if collection.count() == 0:
        return []

    query_args = {
        "query_texts": [question],
        "n_results": limit,
        "include": ["documents", "metadatas", "distances"],
    }
    if document_ids:
        query_args["where"] = document_where_filter(document_ids)

    query_result = collection.query(**query_args)
    ids = query_result.get("ids", [[]])[0]
    documents = query_result.get("documents", [[]])[0]
    metadatas = query_result.get("metadatas", [[]])[0]
    distances = query_result.get("distances", [[]])[0]

    results = []
    for index, chunk_id in enumerate(ids):
        metadata = metadatas[index] or {}
        distance = float(distances[index])
        results.append(
            SearchResult(
                chunk_id=chunk_id,
                document_id=str(metadata.get("document_id", "")),
                chunk_index=int(metadata.get("chunk_index", -1)),
                text=documents[index],
                distance=distance,
                score=max(0.0, 1.0 - distance),
                vector_score=max(0.0, 1.0 - distance),
                page=metadata_page(metadata),
            )
        )

    return results


def get_collection():
    try:
        import chromadb
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ChromaDB is not installed. Run: pip install -r requirements.txt",
        ) from exc

    persist_directory = Path(settings.chroma_persist_dir)
    persist_directory.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(persist_directory))
    return client.get_or_create_collection(
        name=settings.chroma_collection_name,
        embedding_function=LocalHashEmbeddingFunction(),
        metadata={"hnsw:space": "cosine"},
    )


def metadata_page(metadata: dict) -> int | None:
    page = metadata.get("page")
    if page in (None, 0, "0", ""):
        return None

    try:
        return int(page)
    except (TypeError, ValueError):
        return None


def document_where_filter(document_ids: list[str]) -> dict:
    if len(document_ids) == 1:
        return {"document_id": document_ids[0]}

    return {"document_id": {"$in": document_ids}}


def _is_valid_document_id(document_id: str) -> bool:
    return len(document_id) == 64 and all(char in "0123456789abcdef" for char in document_id)
