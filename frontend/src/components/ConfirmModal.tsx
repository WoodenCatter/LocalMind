interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "确认",
  cancelText = "取消",
  danger = false,
  onCancel,
  onConfirm
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-md bg-white shadow-xl">
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-neutral-600">{message}</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            className="h-9 rounded-md border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={
              danger
                ? "h-9 rounded-md bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700"
                : "h-9 rounded-md bg-neutral-950 px-3 text-sm font-medium text-white"
            }
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
