// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// tokenTracker.ts — API Token Usage Tracker for Acordify Dashboard
// Singleton module that records prompt/completion/total tokens per call
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TokenUsageEntry {
  id: string;
  timestamp: number;
  service: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TokenUsageSummary {
  totalCalls: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  byService: Record<string, {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }>;
  entries: TokenUsageEntry[];
}

type Listener = () => void;

const STORAGE_KEY = 'acordify_token_usage';

let entries: TokenUsageEntry[] = [];
const listeners: Set<Listener> = new Set();

// Load persisted data on module init
try {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      entries = parsed as TokenUsageEntry[];
    }
  }
} catch {
  // ignore
}

function persist(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

let idCounter = 0;

/**
 * Record a new token usage entry from an API response.
 * Call this after every successful API call.
 */
export function recordTokenUsage(
  service: string,
  model: string,
  usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number },
): void {
  idCounter += 1;
  const entry: TokenUsageEntry = {
    id: `${Date.now()}-${idCounter}`,
    timestamp: Date.now(),
    service,
    model,
    promptTokens: usage.prompt_tokens ?? 0,
    completionTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
  };

  entries.push(entry);
  persist();
  notify();
}

/** Get a full summary of all recorded token usage. */
export function getTokenUsageSummary(): TokenUsageSummary {
  const byService: TokenUsageSummary['byService'] = {};
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  for (const entry of entries) {
    totalPromptTokens += entry.promptTokens;
    totalCompletionTokens += entry.completionTokens;
    totalTokens += entry.totalTokens;

    if (!byService[entry.service]) {
      byService[entry.service] = { calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }

    const svc = byService[entry.service];
    svc.calls += 1;
    svc.promptTokens += entry.promptTokens;
    svc.completionTokens += entry.completionTokens;
    svc.totalTokens += entry.totalTokens;
  }

  return {
    totalCalls: entries.length,
    totalPromptTokens,
    totalCompletionTokens,
    totalTokens,
    byService,
    entries: [...entries],
  };
}

/** Clear all recorded token usage data. */
export function clearTokenUsage(): void {
  entries = [];
  persist();
  notify();
}

/** Subscribe to changes in token usage data. Returns an unsubscribe function. */
export function subscribeTokenUsage(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
