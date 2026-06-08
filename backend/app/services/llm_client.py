from typing import Any, Literal, Protocol, TypedDict

from fastapi import HTTPException, status

from app.services.settings_store import LLMRuntimeConfig, get_llm_runtime_config

MAX_CONTEXT_CHARS = 12000


class ConversationMessage(TypedDict):
    role: Literal["user", "assistant"]
    content: str


class ChatMessage(TypedDict):
    role: Literal["system", "user", "assistant"]
    content: str


class LLMClient(Protocol):
    def chat(self, messages: list[ChatMessage]) -> str:
        ...

    def test_connection(self) -> str:
        ...


class DeepSeekClient:
    def __init__(self, config: LLMRuntimeConfig):
        self.api_key = config["deepseek_api_key"].strip()
        self.api_base = config["deepseek_api_base"].strip().rstrip("/")
        self.model = config["deepseek_model"].strip()

    def chat(self, messages: list[ChatMessage]) -> str:
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="尚未配置 DeepSeek API Key，请先在设置中填写。",
            )

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "thinking": {"type": "disabled"},
        }
        response_data = self._post_chat_completion(payload)

        try:
            return str(response_data["choices"][0]["message"]["content"])
        except (KeyError, IndexError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="DeepSeek API response format was unexpected.",
            ) from exc

    def test_connection(self) -> str:
        self.chat(
            [
                {"role": "system", "content": "You are a connection test assistant."},
                {"role": "user", "content": "Reply with OK."},
            ]
        )
        return "DeepSeek 连接测试成功。"

    def _post_chat_completion(self, payload: dict[str, Any]) -> dict[str, Any]:
        httpx = _load_httpx()
        try:
            response = httpx.post(
                f"{self.api_base}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
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

        return response.json()


class OllamaClient:
    def __init__(self, config: LLMRuntimeConfig):
        self.api_base = config["ollama_api_base"].strip().rstrip("/")
        self.model = config["ollama_model"].strip()

    def chat(self, messages: list[ChatMessage]) -> str:
        httpx = _load_httpx()
        try:
            response = httpx.post(
                f"{self.api_base}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                },
                timeout=180.0,
            )
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="未检测到 Ollama 服务，请确认 Ollama 已启动。",
            ) from exc
        except httpx.ReadTimeout as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Ollama 本地模型响应超时，可尝试更小模型。",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    f"Ollama 返回错误：{exc.response.text}。"
                    f"如果模型不存在，请先运行：ollama pull {self.model}"
                ),
            ) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ollama 请求失败：{exc}",
            ) from exc

        data = response.json()
        try:
            return str(data["message"]["content"])
        except (KeyError, TypeError) as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Ollama API response format was unexpected.",
            ) from exc

    def test_connection(self) -> str:
        httpx = _load_httpx()
        try:
            response = httpx.get(f"{self.api_base}/api/tags", timeout=10.0)
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="未检测到 Ollama 服务，请确认 Ollama 已启动。",
            ) from exc
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Ollama 服务访问失败：{exc}",
            ) from exc

        models = response.json().get("models", [])
        model_names = {str(model.get("name")) for model in models if isinstance(model, dict)}
        if self.model not in model_names:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"未找到 Ollama 模型 {self.model}，请先运行：ollama pull {self.model}",
            )

        return f"Ollama 连接测试成功，已找到模型 {self.model}。"


def get_llm_client(config: LLMRuntimeConfig | None = None) -> LLMClient:
    runtime_config = config or get_llm_runtime_config()
    if runtime_config["provider"] == "ollama":
        return OllamaClient(runtime_config)

    return DeepSeekClient(runtime_config)


def rewrite_question_for_retrieval(
    question: str,
    history_messages: list[ConversationMessage],
) -> str:
    if not history_messages:
        return question

    messages: list[ChatMessage] = [
        {
            "role": "system",
            "content": (
                "You rewrite follow-up questions for retrieval in a local knowledge base. "
                "Use the conversation history to resolve pronouns, omitted subjects, and "
                "context-dependent references. Return one standalone Chinese question. "
                "If the current question is already standalone, return it unchanged. "
                "Do not answer the question. Do not add explanations."
            ),
        },
        *_to_api_messages(history_messages),
        {
            "role": "user",
            "content": f"Current question:\n{question}\n\nStandalone retrieval question:",
        },
    ]

    rewritten_question = get_llm_client().chat(messages).strip()
    return rewritten_question or question


def generate_answer(
    question: str,
    sources: list[dict[str, Any]],
    history_messages: list[ConversationMessage] | None = None,
) -> str:
    if not sources:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No relevant context was found for this question.",
        )

    messages: list[ChatMessage] = [
        {
            "role": "system",
            "content": (
                "You are LocalMind, a local knowledge base assistant. "
                "Answer in Chinese by default. Use only the provided document excerpts "
                "as factual evidence. The conversation history is only for understanding "
                "the user's follow-up intent, not as a source of document facts. "
                "Only if none of the excerpts contain enough evidence to answer, say: "
                "根据当前文档无法确定。"
                "If the excerpts already support an answer, do not append that sentence. "
                "If the excerpts answer only part of the question, answer the supported part "
                "and clearly state what is missing. "
                "When several documents provide useful evidence, synthesize them into one answer. "
                "When possible, mention source labels such as [Source 1] in the answer."
            ),
        },
        *_to_api_messages(history_messages or []),
        {
            "role": "user",
            "content": _build_user_prompt(question, sources),
        },
    ]

    return get_llm_client().chat(messages)


def test_llm_connection(config: LLMRuntimeConfig | None = None) -> str:
    return get_llm_client(config).test_connection()


def _build_user_prompt(question: str, sources: list[dict[str, Any]]) -> str:
    context_text = _format_sources(sources)

    return f"""请基于下面的文档片段回答问题。
要求：
1. 只能使用文档片段中的信息回答。
2. 只有当所有文档片段都无法回答当前问题时，才说“根据当前文档无法确定”。
3. 如果文档片段已经能回答问题，不要在答案末尾追加“根据当前文档无法确定”。
4. 如果文档片段只能回答问题的一部分，请回答能确定的部分，并说明哪些部分缺少依据。
5. 如果多个文档都提供了相关信息，请综合回答，不要只看其中一个文档。
6. 回答后尽量标注引用来源，例如 [Source 1]、[Source 2]。

当前问题：
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


def _to_api_messages(
    history_messages: list[ConversationMessage],
) -> list[ChatMessage]:
    return [
        {"role": message["role"], "content": message["content"]}
        for message in history_messages
        if message["content"].strip()
    ]


def _load_httpx():
    try:
        import httpx
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HTTP client dependency is not installed. Run: pip install -r requirements.txt",
        ) from exc

    return httpx
