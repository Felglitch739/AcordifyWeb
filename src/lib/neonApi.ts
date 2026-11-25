import type { SaveProgressionInput, SavedProgression } from '../storage';

const API_BASE_URL =
  typeof import.meta !== 'undefined'
    ? (import.meta.env.VITE_NEON_API_URL as string | undefined)?.replace(/\/+$/, '') ?? ''
    : '';

export const isNeonApiConfigured = API_BASE_URL.length > 0;

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
