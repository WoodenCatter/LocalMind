import { BookOpen, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { ConversationItem, KnowledgeBaseItem } from "../types/knowledgeBase";

interface SidebarProps {
  knowledgeBases: KnowledgeBaseItem[];
  conversations: ConversationItem[];
  activeKnowledgeBaseId: string | null;
  currentConversationId: string | null;
  error: string | null;
  onSelectKnowledgeBase: (id: string) => void;
  onCreateKnowledgeBase: () => void;
  onRenameKnowledgeBase: (knowledgeBase: KnowledgeBaseItem) => void;
  onDeleteKnowledgeBase: (knowledgeBase: KnowledgeBaseItem) => void;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onRenameConversation: (conversation: ConversationItem) => void;
  onDeleteConversation: (conversation: ConversationItem) => void;
}

export function Sidebar({
  knowledgeBases,
  conversations,
  activeKnowledgeBaseId,
  currentConversationId,
  error,
  onSelectKnowledgeBase,
  onCreateKnowledgeBase,
  onRenameKnowledgeBase,
  onDeleteKnowledgeBase,
  onSelectConversation,
  onCreateConversation,
  onRenameConversation,
  onDeleteConversation
}: SidebarProps) {
  return (
    <aside className="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-neutral-200 bg-white">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]">
        <SidebarSection
          title="知识库"
          icon={<BookOpen size={16} />}
          onAdd={onCreateKnowledgeBase}
        >
          {knowledgeBases.map((knowledgeBase) => (
            <SidebarItem
              key={knowledgeBase.id}
              active={knowledgeBase.id === activeKnowledgeBaseId}
              title={knowledgeBase.name}
              subtitle={`${knowledgeBase.document_count} 文件`}
              onClick={() => onSelectKnowledgeBase(knowledgeBase.id)}
              onRename={() => onRenameKnowledgeBase(knowledgeBase)}
              onDelete={() => onDeleteKnowledgeBase(knowledgeBase)}
              canDelete={knowledgeBases.length > 1 && !knowledgeBase.is_default}
            />
          ))}
        </SidebarSection>

        <SidebarSection
          title="对话"
          icon={<MessageSquare size={16} />}
          onAdd={onCreateConversation}
        >
          {conversations.map((conversation) => (
            <SidebarItem
              key={conversation.id}
              active={conversation.id === currentConversationId}
              title={conversation.title}
              subtitle={`${conversation.knowledge_base_ids.length || 1} 个知识库`}
              onClick={() => onSelectConversation(conversation.id)}
              onRename={() => onRenameConversation(conversation)}
              onDelete={() => onDeleteConversation(conversation)}
              canDelete
            />
          ))}
        </SidebarSection>
      </div>

      {error ? (
        <p className="m-3 shrink-0 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          {error}
        </p>
      ) : null}
    </aside>
  );
}

function SidebarSection({
  title,
  icon,
  children,
  onAdd
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  onAdd: () => void;
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden border-b border-neutral-200">
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
          onClick={onAdd}
          title={`新建${title}`}
        >
          <Plus size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3 pr-4">
        {children}
      </div>
    </section>
  );
}

function SidebarItem({
  active,
  title,
  subtitle,
  canDelete,
  onClick,
  onRename,
  onDelete
}: {
  active: boolean;
  title: string;
  subtitle: string;
  canDelete: boolean;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={
        active
          ? "box-border w-full cursor-pointer rounded-md border border-neutral-950 bg-neutral-50 px-2 py-2"
          : "box-border w-full cursor-pointer rounded-md border border-transparent px-2 py-2 hover:bg-neutral-50"
      }
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="w-full min-w-0 text-left">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">{subtitle}</p>
      </div>
      <div className="mt-2 flex gap-1">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
          onClick={(event) => {
            event.stopPropagation();
            onRename();
          }}
          title="重命名"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-red-50 hover:text-red-600 aria-disabled:opacity-40"
          aria-disabled={!canDelete}
          onClick={(event) => {
            event.stopPropagation();
            if (canDelete) {
              onDelete();
            }
          }}
          title={canDelete ? "删除" : "至少保留一个"}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
