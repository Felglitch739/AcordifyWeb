import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { Toast as ToastData, ToastType } from '../hooks/useToast';
import { useStudioStyle } from '../styles/useStudioStyle';

const TYPE_ACCENTS: Readonly<Record<ToastType, string>> = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-[var(--mood-accent)]',
};

const renderTypeIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-4 h-4 shrink-0" />;
    case 'error':
    case 'warning':
      return <AlertCircle className="w-4 h-4 shrink-0" />;
    default:
      return <Info className="w-4 h-4 shrink-0" />;
  }
};

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  const { studioStyle } = useStudioStyle();
  const isApple = studioStyle === 'apple';
  const isVinyl = studioStyle === 'vinyl';

  return (
    <div
      className="fixed bottom-24 right-4 sm:right-6 z-[100] flex flex-col-reverse gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto px-3.5 py-2.5 text-xs font-medium flex items-center gap-2.5 max-w-xs ${
              isVinyl
                ? 'vinyl-brutal-card text-[#141210]'
                : isApple
                  ? 'apple-liquid-glass rounded-full text-[#1D1D1F] px-4'
                  : 'rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xl backdrop-blur-md'
            }`}
          >
            <span className={TYPE_ACCENTS[toast.type]}>{renderTypeIcon(toast.type)}</span>
            <span className="flex-1 text-[var(--text-primary)]">{toast.text}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="opacity-60 hover:opacity-100 text-[var(--text-secondary)] cursor-pointer"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
