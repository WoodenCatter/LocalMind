import { useCallback, useState } from "react";
import { clearChatHistory, fetchChatHistory, saveChatHistory } from "../api/chatHistory";
import { getApiErrorMessage } from "../api/client";
import { askQuestion } from "../api/qa";
import type {
  AssistantRequestContext,
  ChatMessage,
  RetrievalSettings
} from "../types/qa";

function createMessageId() {
  return crypto.randomUUID();
}

function createTimestamp() {
  return new Date().toISOString();
}

function createRequestContext(
  question: string,
  selectedDocumentIds: string[],
  retrievalSettings: RetrievalSettings
): AssistantRequestContext {
  return {
    question,
    selectedDocumentIds: [...selectedDocumentIds],
    retrievalSettings: { ...retrievalSettings }
  };
}

function attachRequestContexts(messages: ChatMessage[]) {
  let lastUserMessage: ChatMessage | null = null;

  return messages.map((message) => {
    const normalizedMessage: ChatMessage = {
      ...message,
      created_at: message.created_at ?? createTimestamp(),
      sources: message.sources ?? []
    };

    if (normalizedMessage.role === "user") {
      lastUserMessage = normalizedMessage;
      return normalizedMessage;
    }

    if (!lastUserMessage) {
      return normalizedMessage;
    }

    return {
      ...normalizedMessage,
      requestContext: createRequestContext(
        lastUserMessage.content,
        normalizedMessage.selected_document_ids ??
          lastUserMessage.selected_document_ids ??
          [],
        {
          topK:
            normalizedMessage.top_k ??
            lastUserMessage.top_k ??
            5,
          maxDistance:
            normalizedMessage.max_distance ??
            lastUserMessage.max_distance ??
            null
        }
      )
    };
  });
}

function createErrorMessage(
  content: string,
  requestContext?: AssistantRequestContext
): ChatMessage {
  return {
    id: createMessageId(),
    role: "error",
    content,
    created_at: createTimestamp(),
    sources: [],
    selected_document_ids: requestContext?.selectedDocumentIds ?? [],
    top_k: requestContext?.retrievalSettings.topK ?? null,
    max_distance: requestContext?.retrievalSettings.maxDistance ?? null,
    requestContext
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const persistMessages = useCallback(async (nextMessages: ChatMessage[]) => {
    try {
      await saveChatHistory(nextMessages);
    } catch (error) {
      console.error("Failed to save chat history", error);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    const response = await fetchChatHistory();
    setMessages(attachRequestContexts(response.messages));
  }, []);

  const ask = useCallback(
    async (
      question: string,
      selectedDocumentIds: string[],
      retrievalSettings: RetrievalSettings
    ) => {
      if (isAsking) {
        return;
      }

      const requestContext = createRequestContext(
        question,
        selectedDocumentIds,
        retrievalSettings
      );
      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: question,
        created_at: createTimestamp(),
        sources: [],
        selected_document_ids: requestContext.selectedDocumentIds,
        top_k: requestContext.retrievalSettings.topK,
        max_distance: requestContext.retrievalSettings.maxDistance
      };
      const baseMessages = [...messages, userMessage];

      setMessages(baseMessages);
      setIsAsking(true);

      try {
        const response = await askQuestion({
          question,
          top_k: retrievalSettings.topK,
          max_distance: retrievalSettings.maxDistance ?? undefined,
          document_ids:
            selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined
        });
        const assistantMessage: ChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: response.answer,
          created_at: createTimestamp(),
          sources: response.sources,
          selected_document_ids: response.selected_document_ids,
          top_k: requestContext.retrievalSettings.topK,
          max_distance: requestContext.retrievalSettings.maxDistance,
          requestContext
        };
        const nextMessages = [...baseMessages, assistantMessage];
        setMessages(nextMessages);
        void persistMessages(nextMessages);
      } catch (currentError) {
        const nextMessages = [
          ...baseMessages,
          createErrorMessage(
            `问答失败：${getApiErrorMessage(currentError)}`,
            requestContext
          )
        ];
        setMessages(nextMessages);
        void persistMessages(nextMessages);
      } finally {
        setIsAsking(false);
      }
    },
    [isAsking, messages, persistMessages]
  );

  const regenerate = useCallback(
    async (messageId: string) => {
      if (isAsking || regeneratingId) {
        return;
      }

      const message = messages.find((item) => item.id === messageId);
      const requestContext = message?.requestContext;
      if (!requestContext) {
        return;
      }

      setRegeneratingId(messageId);

      try {
        const response = await askQuestion({
          question: requestContext.question,
          top_k: requestContext.retrievalSettings.topK,
          max_distance: requestContext.retrievalSettings.maxDistance ?? undefined,
          document_ids:
            requestContext.selectedDocumentIds.length > 0
              ? requestContext.selectedDocumentIds
              : undefined
        });

        const nextMessages = messages.map((item) =>
          item.id === messageId
            ? {
                ...item,
                content: response.answer,
                created_at: createTimestamp(),
                sources: response.sources,
                selected_document_ids: response.selected_document_ids,
                role: "assistant" as const
              }
            : item
        );
        setMessages(nextMessages);
        void persistMessages(nextMessages);
      } catch (currentError) {
        const nextMessages = messages.map((item) =>
          item.id === messageId
            ? {
                ...item,
                role: "error" as const,
                content: `重新生成失败：${getApiErrorMessage(currentError)}`,
                created_at: createTimestamp(),
                sources: []
              }
            : item
        );
        setMessages(nextMessages);
        void persistMessages(nextMessages);
      } finally {
        setRegeneratingId(null);
      }
    },
    [isAsking, messages, persistMessages, regeneratingId]
  );

  const clearMessages = useCallback(async () => {
    setMessages([]);
    try {
      await clearChatHistory();
    } catch (error) {
      console.error("Failed to clear chat history", error);
    }
  }, []);

  return {
    messages,
    isAsking,
    regeneratingId,
    loadHistory,
    ask,
    regenerate,
    clearMessages
  };
}
