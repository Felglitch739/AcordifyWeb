import React from 'react';
import type { Toast as ToastData, ToastType } from '../hooks/useToast';

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-zinc-950',
  error: 'bg-red-600 text-zinc-950',
  warning: 'bg-amber-500 text-zinc-950',
  info: 'bg-blue-500 text-zinc-950',
};

const TYPE_ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
};

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto px-4 py-2.5 rounded-sm font-mono text-sm flex items-center gap-2 shadow-lg animate-[slideIn_200ms_ease-out] ${TYPE_STYLES[toast.type]}`}
        >
          <span className="font-bold text-base">{TYPE_ICONS[toast.type]}</span>
          <span className="flex-1">{toast.text}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="ml-2 opacity-60 hover:opacity-100 text-xs font-bold cursor-pointer"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
