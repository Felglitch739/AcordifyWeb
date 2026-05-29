import { useCallback, useEffect, useRef, useState } from 'react';

function arrayMove<T>(arr: T[], from: number, to: number) {
  const copy = arr.slice();
  const val = copy.splice(from, 1)[0];
  copy.splice(to, 0, val);
  return copy;
}

export default function useWorkspaceLayout(initialOrder: string[] = [], onChange?: (next: string[]) => void) {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem('acordify_layout');
      if (raw) return JSON.parse(raw) as string[];
    } catch {}
    return initialOrder;
  });

  // Keep a ref to onChange so that callers can pass non-stable callbacks
  // without causing this effect to re-run unnecessarily and trigger
  // update loops in consuming components.
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    window.localStorage.setItem('acordify_layout', JSON.stringify(order));
    if (onChangeRef.current) onChangeRef.current(order);
  }, [order]);

  const handleDragEnd = useCallback((activeId: string, overId?: string) => {
    if (!overId || activeId === overId) return;
    const from = order.indexOf(activeId);
    const to = order.indexOf(overId);
    if (from === -1 || to === -1) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
  }, [order]);

  return {
    order,
    setOrder,
    handleDragEnd,
  };
}
