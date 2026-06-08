import json
import math
import re

from app.core.config import BASE_DIR
from app.services.retrieval_types import ChunkCandidate, SearchResult

MIN_KEYWORD_SCORE = 0.01


def search_keyword_candidates(
    question: str,
    document_ids: list[str] | None,
    limit: int,
) -> list[SearchResult]:
    chunks = load_chunk_candidates(document_ids)
    if not chunks:
        return []

    query_tokens = tokenize_for_keyword(question)
    if not query_tokens:
        return []

    tokenized_corpus = [tokenize_for_keyword(chunk.text) for chunk in chunks]
    scores = bm25_scores(query_tokens, tokenized_corpus)

    ranked_indexes = sorted(
        range(len(chunks)),
        key=lambda index: scores[index],
        reverse=True,
    )

    results = []
    for index in ranked_indexes:
        score = scores[index]
        if score <= MIN_KEYWORD_SCORE:
            continue

        chunk = chunks[index]
        results.append(
            SearchResult(
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                chunk_index=chunk.chunk_index,
                text=chunk.text,
                page=chunk.page,
                distance=1.0,
                score=score,
                keyword_score=score,
                retrieval_source="keyword",
            )
        )
        if len(results) >= limit:
            break

    return results


def load_chunk_candidates(document_ids: list[str] | None = None) -> list[ChunkCandidate]:
    chunk_dir = BASE_DIR / "chunks"
    if not chunk_dir.exists():
        return []

    chunk_files = (
        [chunk_dir / f"{document_id}.json" for document_id in document_ids]
        if document_ids
        else chunk_dir.glob("*.json")
    )
    candidates = []

    for chunk_path in chunk_files:
        if not chunk_path.exists():
            continue

        try:
            chunk_records = json.loads(chunk_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue

        for record in chunk_records:
            text = str(record.get("text", "")).strip()
            if not text:
                continue

            candidates.append(
                ChunkCandidate(
                    chunk_id=str(record["chunk_id"]),
                    document_id=str(record["document_id"]),
                    chunk_index=int(record["index"]),
                    text=text,
                    page=record.get("page"),
                )
            )

    return candidates


def bm25_scores(query_tokens: list[str], tokenized_corpus: list[list[str]]) -> list[float]:
    try:
        from rank_bm25 import BM25Okapi

        bm25 = BM25Okapi(tokenized_corpus)
        return [float(score) for score in bm25.get_scores(query_tokens)]
    except ImportError:
        return fallback_keyword_scores(query_tokens, tokenized_corpus)


def fallback_keyword_scores(
    query_tokens: list[str],
    tokenized_corpus: list[list[str]],
) -> list[float]:
    query_set = set(query_tokens)
    scores = []

    for tokens in tokenized_corpus:
        if not tokens:
            scores.append(0.0)
            continue

        token_counts = {}
        for token in tokens:
            token_counts[token] = token_counts.get(token, 0) + 1

        score = sum(token_counts.get(token, 0) for token in query_set)
        scores.append(float(score) / math.sqrt(len(tokens)))

    return scores


def tokenize_for_keyword(text: str) -> list[str]:
    normalized = text.lower()
    tokens = []

    for token in re.findall(r"[a-z0-9][a-z0-9_+#.-]*", normalized):
        tokens.append(token)

    chinese_text = "".join(re.findall(r"[\u4e00-\u9fff]+", normalized))
    if chinese_text:
        try:
            import jieba

            tokens.extend(token.strip() for token in jieba.cut(chinese_text) if token.strip())
        except ImportError:
            tokens.extend(re.findall(r"[\u4e00-\u9fff]", chinese_text))

        # Short n-grams help course names, OCR text, and domain phrases survive
        # imperfect segmentation.
        for size in (2, 3, 4):
            for index in range(0, max(len(chinese_text) - size + 1, 0)):
                tokens.append(chinese_text[index : index + size])

    return [token for token in tokens if token.strip()]
