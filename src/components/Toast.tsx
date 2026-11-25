import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { Toast as ToastData, ToastType } from '../hooks/useToast';

const renderTypeIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />;
    case 'error':
    case 'warning':
      return <AlertCircle className="w-4 h-4 shrink-0 text-[var(--color-accent)]" />;
    default:
      return <Info className="w-4 h-4 shrink-0 text-zinc-300" />;
  }
};

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-24 right-4 sm:right-6 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto rounded-full border border-[var(--color-ink)] bg-[var(--color-ink)] px-4 py-2 text-xs font-medium text-white flex items-center gap-2.5 max-w-xs shadow-sm"
        >
          {renderTypeIcon(toast.type)}
          <span className="flex-1">{toast.text}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="opacity-70 hover:opacity-100 text-white cursor-pointer"
            aria-label="Cerrar notificación"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
