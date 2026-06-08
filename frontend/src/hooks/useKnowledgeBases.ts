import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../api/client";
import {
  createConversation,
  createKnowledgeBase,
  deleteConversation,
  deleteKnowledgeBase,
  fetchConversations,
  fetchKnowledgeBases,
  renameKnowledgeBase,
  setConversationKnowledgeBases,
  updateConversation
} from "../api/knowledgeBases";
import type { ConversationItem, KnowledgeBaseItem } from "../types/knowledgeBase";

export function useKnowledgeBases() {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeKnowledgeBaseId, setActiveKnowledgeBaseId] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultKnowledgeBase = useMemo(
    () => knowledgeBases.find((item) => item.is_default) ?? knowledgeBases[0],
    [knowledgeBases]
  );

  const currentConversation = useMemo(
    () => conversations.find((item) => item.id === currentConversationId) ?? null,
    [currentConversationId, conversations]
  );

  const activeKnowledgeBaseIds = currentConversation?.knowledge_base_ids?.length
    ? currentConversation.knowledge_base_ids
    : defaultKnowledgeBase
      ? [defaultKnowledgeBase.id]
      : [];

  const loadAll = useCallback(async (preferredConversationId?: string | null) => {
    setIsLoading(true);
    setError(null);

    try {
      const [knowledgeBaseResponse, conversationResponse] = await Promise.all([
        fetchKnowledgeBases(),
        fetchConversations()
      ]);
      const nextKnowledgeBases = knowledgeBaseResponse.knowledge_bases;
      const nextConversations = conversationResponse.conversations;
      setKnowledgeBases(nextKnowledgeBases);
      setConversations(nextConversations);

      setActiveKnowledgeBaseId((current) => {
        if (current && nextKnowledgeBases.some((item) => item.id === current)) {
          return current;
        }
        return nextKnowledgeBases.find((item) => item.is_default)?.id ?? nextKnowledgeBases[0]?.id ?? null;
      });
      setCurrentConversationId((current) => {
        const candidate =
          preferredConversationId !== undefined ? preferredConversationId : current;
        if (candidate && nextConversations.some((item) => item.id === candidate)) {
          return candidate;
        }
        return null;
      });
    } catch (currentError) {
      setError(getApiErrorMessage(currentError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const createKnowledgeBaseByName = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return null;
      }

      try {
        const knowledgeBase = await createKnowledgeBase(trimmed);
        await loadAll();
        setActiveKnowledgeBaseId(knowledgeBase.id);
        return knowledgeBase;
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
        return null;
      }
    },
    [loadAll]
  );

  const renameKnowledgeBaseByName = useCallback(
    async (knowledgeBase: KnowledgeBaseItem, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) {
        return null;
      }

      try {
        const updated = await renameKnowledgeBase(knowledgeBase.id, trimmed);
        await loadAll();
        return updated;
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
        return null;
      }
    },
    [loadAll]
  );

  const removeKnowledgeBase = useCallback(
    async (knowledgeBase: KnowledgeBaseItem) => {
      try {
        await deleteKnowledgeBase(knowledgeBase.id);
        await loadAll();
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
      }
    },
    [loadAll]
  );

  const createConversationByTitle = useCallback(
    async (title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return null;
      }

      try {
        const conversation = await createConversation(trimmed, activeKnowledgeBaseIds);
        setConversations((current) => [
          ...current.filter((item) => item.id !== conversation.id),
          conversation
        ]);
        setCurrentConversationId(conversation.id);
        await loadAll(conversation.id);
        return conversation;
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
        return null;
      }
    },
    [activeKnowledgeBaseIds, loadAll]
  );

  const renameConversationByTitle = useCallback(
    async (conversation: ConversationItem, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) {
        return null;
      }

      try {
        const updated = await updateConversation(conversation.id, { title: trimmed });
        await loadAll();
        return updated;
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
        return null;
      }
    },
    [loadAll]
  );

  const removeConversation = useCallback(
    async (conversation: ConversationItem) => {
      const nextConversationId =
        conversation.id === currentConversationId
          ? getNextConversationId(conversations, conversation.id)
          : currentConversationId;

      try {
        setConversations((current) =>
          current.filter((item) => item.id !== conversation.id)
        );
        setCurrentConversationId(nextConversationId);
        await deleteConversation(conversation.id);
        await loadAll(nextConversationId);
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
        await loadAll(currentConversationId);
      }
    },
    [conversations, currentConversationId, loadAll]
  );

  const toggleConversationKnowledgeBase = useCallback(
    async (knowledgeBaseId: string) => {
      if (!currentConversation) {
        return;
      }

      const currentIds = currentConversation.knowledge_base_ids ?? [];
      const nextIds = currentIds.includes(knowledgeBaseId)
        ? currentIds.filter((id) => id !== knowledgeBaseId)
        : [...currentIds, knowledgeBaseId];

      try {
        const updated = await setConversationKnowledgeBases(
          currentConversation.id,
          nextIds.length ? nextIds : [defaultKnowledgeBase?.id ?? knowledgeBaseId]
        );
        setConversations((current) =>
          current.map((item) => (item.id === updated.id ? updated : item))
        );
      } catch (currentError) {
        setError(getApiErrorMessage(currentError));
      }
    },
    [currentConversation, defaultKnowledgeBase?.id]
  );

  return {
    knowledgeBases,
    conversations,
    activeKnowledgeBaseId,
    activeKnowledgeBaseIds,
    currentConversation,
    currentConversationId,
    defaultKnowledgeBase,
    isLoading,
    error,
    setActiveKnowledgeBaseId,
    setCurrentConversationId,
    loadAll,
    createKnowledgeBaseByName,
    renameKnowledgeBaseByName,
    removeKnowledgeBase,
    createConversationByTitle,
    renameConversationByTitle,
    removeConversation,
    toggleConversationKnowledgeBase
  };
}

function getNextConversationId(
  conversations: ConversationItem[],
  deletedConversationId: string
) {
  return conversations.find((item) => item.id !== deletedConversationId)?.id ?? null;
}
