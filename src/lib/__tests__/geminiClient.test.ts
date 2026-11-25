import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from '../../../api/inspiration.js';
import { LOCAL_FALLBACK_NOTICE } from '../localStrumTip';
import { fetchInspirationStatus, requestInspiration } from '../geminiClient';

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;
const ORIGINAL_MODEL = process.env.GEMINI_MODEL;

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_KEY === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = ORIGINAL_KEY;
  }
  if (ORIGINAL_MODEL === undefined) {
    delete process.env.GEMINI_MODEL;
  } else {
    process.env.GEMINI_MODEL = ORIGINAL_MODEL;
  }
});

const SAMPLE_PAYLOAD = {
  chords: ['C', 'Am', 'F', 'G'],
  keyRoot: 'C',
  mode: 'major' as const,
  mood: 'calm',
  bpm: 76,
  degrees: [1, 6, 4, 5],
  strumPattern: 'folk' as const,
  theme: 'café de mañana',
};

describe('Gemini proxy & client graceful fallback', () => {
  it('returns local fallback tip when GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;

    const req = new Request('http://localhost/api/inspiration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_PAYLOAD),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.source).toBe('fallback');
    expect(data.notice).toBe(LOCAL_FALLBACK_NOTICE);
    expect(String(data.strumTip)).toContain('C');
  });

  it('calls Gemini REST API with x-goog-api-key header and returns parsed verse when key is set', async () => {
    process.env.GEMINI_API_KEY = 'fake-test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Taza en la mesa',
                      lyrics:
                        '[C]Humo tibio junto al ventanal\n[Am]suena el patio antes de salir\n[F]dejo el cuaderno abierto al sol\n[G]y marco el pulso para seguir',
                      strumTip: 'Acentúa C hacia abajo y deja abierto G en el último tiempo.',
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const req = new Request('http://localhost/api/inspiration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_PAYLOAD),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [calledUrl, init] = fetchSpy.mock.calls[0];
    expect(String(calledUrl)).toContain('gemini-2.5-flash:generateContent');
    expect(String(calledUrl)).not.toContain('fake-test-gemini-key');
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe(
      'fake-test-gemini-key',
    );

    expect(data.source).toBe('gemini');
    expect(data.title).toBe('Taza en la mesa');
    expect(String(data.lyrics)).toContain('[C]');
    expect(data.notice).toBeNull();
  });

  it('falls back cleanly when Gemini upstream fails or returns invalid JSON', async () => {
    process.env.GEMINI_API_KEY = 'fake-test-gemini-key';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('upstream error', { status: 500 }),
    );

    const req = new Request('http://localhost/api/inspiration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(SAMPLE_PAYLOAD),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.source).toBe('fallback');
    expect(data.notice).toBe(LOCAL_FALLBACK_NOTICE);
  });

  it('requestInspiration client returns local fallback cleanly on network errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    const result = await requestInspiration(SAMPLE_PAYLOAD);
    expect(result.source).toBe('fallback');
    expect(result.notice).toBe(LOCAL_FALLBACK_NOTICE);
    expect(result.strumTip).toContain('C');
  });

  it('GET /api/inspiration reports aiConfigured truthfully without exposing keys', async () => {
    delete process.env.GEMINI_API_KEY;
    const unconfiguredRes = await GET();
    expect(unconfiguredRes.status).toBe(200);
    const unconfiguredJson = (await unconfiguredRes.json()) as { aiConfigured: boolean };
    expect(unconfiguredJson.aiConfigured).toBe(false);

    process.env.GEMINI_API_KEY = 'fake-test-gemini-key';
    const configuredRes = await GET();
    expect(configuredRes.status).toBe(200);
    const configuredJson = (await configuredRes.json()) as { aiConfigured: boolean };
    expect(configuredJson.aiConfigured).toBe(true);

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await fetchInspirationStatus()).toEqual({ aiConfigured: false });
  });
});
