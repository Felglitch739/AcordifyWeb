import type { SaveProgressionInput, SavedProgression } from '../storage';

const API_BASE_URL =
  typeof import.meta !== 'undefined'
    ? (import.meta.env.VITE_NEON_API_URL as string | undefined)?.replace(/\/+$/, '') ?? ''
    : '';

export const isNeonApiConfigured = API_BASE_URL.length > 0;

export interface AiInspirationPayload {
  chords: string[];
  keyRoot: string;
  mode: 'major' | 'minor';
  mood: string;
  bpm: number;
  theme?: string;
}

export interface AiInspirationResult {
  model: string;
  title: string;
  lyrics: string;
  strumTip: string;
}

export class AiGatewayCreditsError extends Error {
  unavailableReason: string;
  recoveryUrl: string | null;

  constructor(message: string, unavailableReason: string, recoveryUrl: string | null) {
    super(message);
    this.name = 'AiGatewayCreditsError';
    this.unavailableReason = unavailableReason;
    this.recoveryUrl = recoveryUrl;
  }
}

async function apiFetch<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('Neon API URL is not configured');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await response.text();
  let parsed: Record<string, unknown> = {};
  if (text) {
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      parsed = {};
    }
  }

  if (!response.ok) {
    if (response.status === 402 || response.status === 403) {
      const reason =
        typeof parsed.unavailableReason === 'string'
          ? parsed.unavailableReason
          : 'paid_plan_required';
      const recoveryUrl =
        typeof parsed.recoveryUrl === 'string' ? parsed.recoveryUrl : null;
      if (reason === 'paid_plan_required' || recoveryUrl) {
        throw new AiGatewayCreditsError(
          'Neon AI Gateway requiere créditos prepagados activos en tu cuenta.',
          reason,
          recoveryUrl,
        );
      }
    }

    const msg =
      typeof parsed.error === 'string'
        ? parsed.error
        : `Error de servidor (${response.status})`;
    throw new Error(msg);
  }

  return parsed as T;
}

export async function fetchCloudProgressions(token: string): Promise<SavedProgression[]> {
  const data = await apiFetch<{ progressions?: SavedProgression[] }>('/progressions', token);
  return Array.isArray(data.progressions) ? data.progressions : [];
}

export async function createCloudProgression(
  token: string,
  input: SaveProgressionInput,
): Promise<SavedProgression> {
  const data = await apiFetch<{ progression: SavedProgression }>('/progressions', token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.progression;
}

export async function deleteCloudProgression(token: string, id: string): Promise<void> {
  await apiFetch<{ deleted: boolean }>(`/progressions/${encodeURIComponent(id)}`, token, {
    method: 'DELETE',
  });
}

export async function fetchAiInspiration(
  token: string,
  payload: AiInspirationPayload,
): Promise<AiInspirationResult> {
  return apiFetch<AiInspirationResult>('/ai/inspiration', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
