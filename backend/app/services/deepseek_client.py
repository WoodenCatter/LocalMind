from typing import Any

from fastapi import HTTPException, status

from app.services.settings_store import get_deepseek_runtime_config

MAX_CONTEXT_CHARS = 12000


def generate_answer(question: str, sources: list[dict[str, Any]]) -> str:
    config = get_deepseek_runtime_config()
    api_key = config["api_key"].strip()
    api_base = config["api_base"].strip().rstrip("/")
    model = config["model"].strip()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="尚未配置 DeepSeek API Key，请先在设置中填写。",
        )

    if not sources:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No relevant context was found for this question.",
        )

    try:
        import httpx
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HTTP client dependency is not installed. Run: pip install -r requirements.txt",
        ) from exc

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are LocalMind, a local knowledge base assistant. "
                    "Answer in Chinese by default. Use only the provided document excerpts. "
                    "If the excerpts do not contain enough evidence, say: 根据当前文档无法确定。 "
                    "When several documents provide useful evidence, synthesize them into one answer. "
                    "When possible, mention source labels such as [Source 1] in the answer."
                ),
            },
            {
                "role": "user",
                "content": _build_user_prompt(question, sources),
            },
        ],
        "stream": False,
        "thinking": {"type": "disabled"},
    }

    try:
        response = httpx.post(
            f"{api_base}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=60.0,
        )
        response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"DeepSeek API returned an error: {exc.response.text}",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"DeepSeek API request failed: {exc}",
        ) from exc

    data = response.json()
    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="DeepSeek API response format was unexpected.",
        ) from exc


def _build_user_prompt(question: str, sources: list[dict[str, Any]]) -> str:
    context_text = _format_sources(sources)

    return f"""请基于下面的文档片段回答问题。

要求：
1. 只能使用文档片段中的信息回答。
2. 如果文档片段不足以回答，请说“根据当前文档无法确定”。
3. 如果多个文档都提供了相关信息，请综合回答，不要只看其中一个文档。
4. 回答后尽量标注引用来源，例如 [Source 1]、[Source 2]。

问题：
{question}

文档片段：
{context_text}
"""


def _format_sources(sources: list[dict[str, Any]]) -> str:
    blocks = []
    used_chars = 0

    for index, source in enumerate(sources, start=1):
        text = str(source.get("text", "")).strip()
        if not text:
            continue

        header = (
            f"[Source {index}]\n"
            f"document_id: {source.get('document_id', '')}\n"
            f"filename: {source.get('original_filename', '')}\n"
            f"page: {source.get('page') or 'unknown'}\n"
            f"chunk_index: {source.get('chunk_index', '')}\n"
        )
        remaining_chars = MAX_CONTEXT_CHARS - used_chars - len(header)
        if remaining_chars <= 0:
            break

        clipped_text = text[:remaining_chars]
        blocks.append(f"{header}content:\n{clipped_text}")
        used_chars += len(header) + len(clipped_text)

        if used_chars >= MAX_CONTEXT_CHARS:
            break

    return "\n\n".join(blocks)
