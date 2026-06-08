import { useCallback, useEffect, useRef, useState } from "react";
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
  knowledgeBaseIds: string[],
  conversationId: string | null,
  retrievalSettings: RetrievalSettings
): AssistantRequestContext {
  return {
    question,
    selectedDocumentIds: [...selectedDocumentIds],
    knowledgeBaseIds: [...knowledgeBaseIds],
    conversationId,
    retrievalSettings: { ...retrievalSettings }
  };
}

function attachRequestContexts(messages: ChatMessage[], conversationId: string | null) {
  let lastUserMessage: ChatMessage | null = null;

  return messages.map((message) => {
    const normalizedMessage: ChatMessage = {
      ...message,
      conversation_id: message.conversation_id ?? conversationId,
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
        normalizedMessage.knowledge_base_ids ??
          lastUserMessage.knowledge_base_ids ??
          [],
        normalizedMessage.conversation_id ?? lastUserMessage.conversation_id ?? conversationId,
        {
          topK: normalizedMessage.top_k ?? lastUserMessage.top_k ?? 5,
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
    knowledge_base_ids: requestContext?.knowledgeBaseIds ?? [],
    conversation_id: requestContext?.conversationId ?? null,
    top_k: requestContext?.retrievalSettings.topK ?? null,
    max_distance: requestContext?.retrievalSettings.maxDistance ?? null,
    requestContext
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const isAskingRef = useRef(false);
  const currentConversationIdRef = useRef<string | null>(null);
  const messageRevisionRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isAskingRef.current = isAsking;
  }, [isAsking]);

  const persistMessages = useCallback(
    async (nextMessages: ChatMessage[], conversationId: string | null) => {
      try {
        await saveChatHistory(nextMessages, conversationId);
      } catch (error) {
        console.error("Failed to save chat history", error);
      }
    },
    []
  );

  const loadHistory = useCallback(async (conversationId: string | null) => {
    currentConversationIdRef.current = conversationId;
    setIsAsking(false);
    setRegeneratingId(null);
    isAskingRef.current = false;
    const startedAtRevision = messageRevisionRef.current;
    const response = await fetchChatHistory(conversationId);
    const loadedMessages = attachRequestContexts(response.messages, conversationId);

    setMessages((currentMessages) => {
      if (conversationId !== currentConversationIdRef.current) {
        return currentMessages;
      }

      const hasLocalMessageChanges = messageRevisionRef.current !== startedAtRevision;
      if (!isAskingRef.current && !hasLocalMessageChanges) {
        return loadedMessages;
      }

      const loadedIds = new Set(loadedMessages.map((message) => message.id));
      const pendingMessages = currentMessages.filter((message) => !loadedIds.has(message.id));
      return [...loadedMessages, ...pendingMessages];
    });
  }, []);

  const ask = useCallback(
    async (
      question: string,
      selectedDocumentIds: string[],
      knowledgeBaseIds: string[],
      conversationId: string | null,
      retrievalSettings: RetrievalSettings
    ) => {
      if (isAsking) {
        return;
      }

      const requestContext = createRequestContext(
        question,
        selectedDocumentIds,
        knowledgeBaseIds,
        conversationId,
        retrievalSettings
      );
      const isSameConversation = currentConversationIdRef.current === conversationId;
      currentConversationIdRef.current = conversationId;
      const userMessage: ChatMessage = {
        id: createMessageId(),
        role: "user",
        content: question,
        created_at: createTimestamp(),
        sources: [],
        selected_document_ids: requestContext.selectedDocumentIds,
        knowledge_base_ids: requestContext.knowledgeBaseIds,
        conversation_id: requestContext.conversationId,
        top_k: requestContext.retrievalSettings.topK,
        max_distance: requestContext.retrievalSettings.maxDistance
      };
      const currentMessages = isSameConversation ? messagesRef.current : [];
      const baseMessages = [...currentMessages, userMessage];

      messageRevisionRef.current += 1;
      setMessages(baseMessages);
      setIsAsking(true);
      void persistMessages(baseMessages, conversationId);

      try {
        const response = await askQuestion({
          question,
          top_k: retrievalSettings.topK,
          max_distance: retrievalSettings.maxDistance ?? undefined,
          conversation_id: conversationId,
          knowledge_base_ids: knowledgeBaseIds.length > 0 ? knowledgeBaseIds : undefined,
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
          knowledge_base_ids: requestContext.knowledgeBaseIds,
          conversation_id: requestContext.conversationId,
          top_k: requestContext.retrievalSettings.topK,
          max_distance: requestContext.retrievalSettings.maxDistance,
          requestContext
        };
        const nextMessages = [...baseMessages, assistantMessage];
        if (conversationId !== currentConversationIdRef.current) {
          return;
        }
        messageRevisionRef.current += 1;
        setMessages(nextMessages);
        void persistMessages(nextMessages, conversationId);
      } catch (currentError) {
        const nextMessages = [
          ...baseMessages,
          createErrorMessage(
            `问答失败：${getApiErrorMessage(currentError)}`,
            requestContext
          )
        ];
        if (conversationId !== currentConversationIdRef.current) {
          return;
        }
        messageRevisionRef.current += 1;
        setMessages(nextMessages);
        void persistMessages(nextMessages, conversationId);
      } finally {
        setIsAsking(false);
      }
    },
    [isAsking, persistMessages]
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
          conversation_id: requestContext.conversationId,
          knowledge_base_ids:
            requestContext.knowledgeBaseIds.length > 0
              ? requestContext.knowledgeBaseIds
              : undefined,
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
        messageRevisionRef.current += 1;
        setMessages(nextMessages);
        void persistMessages(nextMessages, requestContext.conversationId);
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
        messageRevisionRef.current += 1;
        setMessages(nextMessages);
        void persistMessages(nextMessages, requestContext.conversationId);
      } finally {
        setRegeneratingId(null);
      }
    },
    [isAsking, messages, persistMessages, regeneratingId]
  );

  const clearMessages = useCallback(async (conversationId: string | null) => {
    messageRevisionRef.current += 1;
    setMessages([]);
    try {
      await clearChatHistory(conversationId);
    } catch (error) {
      console.error("Failed to clear chat history", error);
    }
  }, []);

  const resetMessages = useCallback(() => {
    messageRevisionRef.current += 1;
    setMessages([]);
    setIsAsking(false);
    setRegeneratingId(null);
    currentConversationIdRef.current = null;
    isAskingRef.current = false;
  }, []);

  return {
    messages,
    isAsking,
    regeneratingId,
    loadHistory,
    ask,
    regenerate,
    clearMessages,
    resetMessages
  };
}
