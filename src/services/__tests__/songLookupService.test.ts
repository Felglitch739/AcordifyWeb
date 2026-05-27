import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lookupSong } from '../songLookupService';

describe('lookupSong', () => {
  beforeEach(() => {
    process.env.VITE_AZURE_API_KEY = 'test-key';
    process.env.VITE_AZURE_ENDPOINT = 'https://example.test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.VITE_AZURE_API_KEY;
    delete process.env.VITE_AZURE_ENDPOINT;
  });

  it('parses a valid response and enriches with validation', async () => {
    const payload = {
      found: true,
      title: 'Wonderwall',
      artist: 'Oasis',
      keyRoot: 'C',
      mode: 'major',
      bpmSuggested: 87,
      chords: ['C', 'G', 'Am', 'F'],
      chordProContent: '[C]Today is gonna be the day\n[G]that they gonna throw it back to you',
      confidence: 0.92,
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify(payload),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSong('Wonderwall Oasis', 'indie rock');

    expect(result.found).toBe(true);
    expect(result.title).toBe('Wonderwall');
    expect(result.coherenceScore).toBeGreaterThan(0);
    expect(result.keyDetected).toContain('C');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns found=false when response is not confident', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({ found: false }),
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSong('Unknown song');

    expect(result.found).toBe(false);
  });

  it('returns found=false when JSON is invalid', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'not-json',
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await lookupSong('Some song');

    expect(result.found).toBe(false);
  });
});
