import { buildLocalStrumFallback, type InspirationRequest, type InspirationResponse } from './localStrumTip';

export type { InspirationRequest, InspirationResponse };

export async function requestInspiration(
  input: InspirationRequest,
): Promise<InspirationResponse> {
  try {
    const res = await fetch('/api/inspiration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return buildLocalStrumFallback(input);
    }

    const data = (await res.json()) as Partial<InspirationResponse>;
    if (
      (data.source === 'gemini' || data.source === 'fallback') &&
      typeof data.strumTip === 'string' &&
      data.strumTip.trim().length > 0 &&
      typeof data.title === 'string'
    ) {
      return {
        source: data.source,
        model: typeof data.model === 'string' ? data.model : null,
        title: data.title,
        lyrics: typeof data.lyrics === 'string' ? data.lyrics : null,
        strumTip: data.strumTip,
        notice: typeof data.notice === 'string' ? data.notice : null,
      };
    }

    return buildLocalStrumFallback(input);
  } catch {
    return buildLocalStrumFallback(input);
  }
}
