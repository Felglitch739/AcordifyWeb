import { useCallback, useSyncExternalStore } from 'react';
import {
  clearTokenUsage,
  getTokenUsageSummary,
  subscribeTokenUsage,
  type TokenUsageSummary,
} from '../services/tokenTracker';

/**
 * Reactive hook for the token usage dashboard.
 * Re-renders whenever a new token usage entry is recorded.
 */
export function useTokenTracker(): {
  summary: TokenUsageSummary;
  clearAll: () => void;
} {
  const summary = useSyncExternalStore(
    subscribeTokenUsage,
    getTokenUsageSummary,
    getTokenUsageSummary,
  );

  const clearAll = useCallback(() => {
    clearTokenUsage();
  }, []);

  return { summary, clearAll };
}
