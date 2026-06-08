import { ChevronDown, ChevronRight, ExternalLink, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDocumentPreview, getDocumentPreviewFileUrl } from "../api/documents";
import type { DocumentPreviewResponse } from "../types/document";

const IMAGE_FILE_TYPES = new Set(["png", "jpg", "jpeg", "bmp", "webp"]);

interface PreviewRequest {
  documentId: string;
  page?: number | null;
  chunkIndex?: number | null;
}

interface DocumentPreviewDrawerProps {
  request: PreviewRequest | null;
  onClose: () => void;
  onOpenOriginal: (documentId: string) => void;
}

export function DocumentPreviewDrawer({
  request,
  onClose,
  onOpenOriginal
}: DocumentPreviewDrawerProps) {
  const [preview, setPreview] = useState<DocumentPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!request) {
      setPreview(null);
      setError(null);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    void fetchDocumentPreview(request.documentId, {
      page: request.page,
      chunkIndex: request.chunkIndex
    })
      .then((data) => {
        if (!isCancelled) {
          setPreview(data);
        }
      })
      .catch((currentError) => {
        if (!isCancelled) {
          setError(currentError instanceof Error ? currentError.message : "预览加载失败");
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [request]);

  if (!request) {
    return null;
  }

  const locationLabel = preview ? buildLocationLabel(preview) : "";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20">
      <aside className="flex h-full w-[min(760px,calc(100vw-48px))] flex-col border-l border-neutral-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-neutral-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase text-neutral-500">文档预览</p>
            <h2 className="mt-1 truncate text-base font-semibold">
              {preview?.filename ?? "正在加载..."}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              {preview?.file_type ? <span>{preview.file_type.toUpperCase()}</span> : null}
              {locationLabel ? (
                <>
                  <span>/</span>
                  <span>{locationLabel}</span>
                </>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50"
              onClick={() => onOpenOriginal(request.documentId)}
            >
              <ExternalLink size={14} />
              打开文件
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              onClick={onClose}
              aria-label="关闭预览"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden bg-neutral-100">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-neutral-500">
              <Loader2 size={16} className="animate-spin" />
              正在加载预览...
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="m-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {!isLoading && preview ? <PreviewBody preview={preview} /> : null}
        </div>
      </aside>
    </div>
  );
}

function PreviewBody({ preview }: { preview: DocumentPreviewResponse }) {
  if (!preview.preview_supported || preview.preview_mode === "unsupported") {
    return (
      <div className="m-5 rounded-md border border-neutral-200 bg-white px-4 py-4 text-sm leading-6 text-neutral-600">
        {preview.message ?? "暂不支持该格式预览。"}
      </div>
    );
  }

  if (preview.preview_mode === "pdf") {
    return (
      <iframe
        className="h-full w-full border-0 bg-white"
        title={preview.filename}
        src={getDocumentPreviewFileUrl(preview.document_id, preview.page)}
      />
    );
  }

  if (preview.preview_mode === "image") {
    return <ImagePreview preview={preview} />;
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <pre className="whitespace-pre-wrap break-words px-6 py-5 text-sm leading-7 text-neutral-800">
        {preview.content}
      </pre>
    </div>
  );
}

function ImagePreview({ preview }: { preview: DocumentPreviewResponse }) {
  const [isOcrExpanded, setIsOcrExpanded] = useState(false);
  const ocrContent = preview.content?.trim();

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="flex min-h-[360px] items-center justify-center bg-neutral-100 p-6">
        <img
          className="max-h-[70vh] max-w-full rounded-md border border-neutral-200 bg-white object-contain shadow-sm"
          src={getDocumentPreviewFileUrl(preview.document_id)}
          alt={preview.filename}
        />
      </div>
      <div className="border-t border-neutral-200 bg-white px-6 py-4">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-800 hover:text-neutral-950"
          onClick={() => setIsOcrExpanded((current) => !current)}
        >
          {isOcrExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          OCR识别结果
        </button>
        {isOcrExpanded ? (
          <pre className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm leading-7 text-neutral-700">
            {ocrContent || "未检测到可识别文字。"}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function buildLocationLabel(preview: DocumentPreviewResponse) {
  const parts = [];
  if (preview.page) {
    if (preview.file_type === "pptx") {
      parts.push(`Slide ${preview.page}`);
    } else if (IMAGE_FILE_TYPES.has(preview.file_type)) {
      parts.push("OCR文本");
    } else if (["txt", "md", "docx"].includes(preview.file_type)) {
      parts.push("文档内容");
    } else {
      parts.push(`Page ${preview.page}`);
    }
  }
  if (preview.chunk_index !== null && preview.chunk_index !== undefined) {
    parts.push(`Chunk ${preview.chunk_index}`);
  }
  return parts.join(" / ");
}
