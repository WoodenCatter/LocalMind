import { useEffect, useRef, useState } from "react";

interface TextInputModalProps {
  isOpen: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

export function TextInputModal({
  isOpen,
  title,
  label,
  initialValue = "",
  confirmText = "确认",
  onClose,
  onConfirm
}: TextInputModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [initialValue, isOpen]);

  if (!isOpen) {
    return null;
  }

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div
        className="w-full max-w-sm rounded-md bg-white shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <div className="px-5 py-4">
          <label className="block text-sm font-medium text-neutral-700">
            {label}
          </label>
          <input
            ref={inputRef}
            className="mt-2 h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-950"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                submit();
              }
              if (event.key === "Escape") {
                onClose();
              }
            }}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            className="h-9 rounded-md border border-neutral-200 px-3 text-sm text-neutral-700 hover:bg-neutral-50"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="h-9 rounded-md bg-neutral-950 px-3 text-sm font-medium text-white disabled:opacity-50"
            disabled={!value.trim()}
            onClick={submit}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
