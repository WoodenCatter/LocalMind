import hashlib
import math
import re

EMBEDDING_DIMENSION = 384


class LocalHashEmbeddingFunction:
    def __call__(self, input: list[str]) -> list[list[float]]:
        return [embed_text(text) for text in input]


def embed_text(text: str) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSION
    tokens = tokenize_for_vector(text)

    if not tokens:
        return vector

    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % EMBEDDING_DIMENSION
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector

    return [value / norm for value in vector]


def tokenize_for_vector(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+|[\u4e00-\u9fff]", text.lower())
