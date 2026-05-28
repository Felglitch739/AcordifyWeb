import { useCallback, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  text: string;
}

export interface UseToastReturn {
  toasts: Toast[];
  addToast: (type: ToastType, text: string) => void;
  removeToast: (id: string) => void;
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 3000;

/**
 * Hook for managing toast notification queue.
 * - Max 3 visible at a time
 * - Auto-dismiss after 3 seconds
 */
export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, text: string) => {
    counterRef.current += 1;
    const id = `toast-${Date.now()}-${counterRef.current}`;
    const toast: Toast = { id, type, text };

    setToasts((prev) => {
      const next = [...prev, toast];
      // Enforce max visible — remove oldest if exceeding limit
      if (next.length > MAX_VISIBLE) {
        return next.slice(next.length - MAX_VISIBLE);
      }
      return next;
    });

    // Auto-dismiss
    setTimeout(() => {
      removeToast(id);
    }, AUTO_DISMISS_MS);
  }, [removeToast]);

  return { toasts, addToast, removeToast };
}
