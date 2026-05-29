import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLyricsControls } from '../useLyricsControls';

describe('useLyricsControls', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('genera letras con payload tipo Azure/OpenAI y apaga loader', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: `\`\`\`json
{
  "lines": [
    { "text": "Cruzo cables en la ciudad", "chord": "C", "syllableCount": 9, "rhymeLabel": "A" },
    { "text": "cada paso tiene señal", "chord": "G", "syllableCount": 9, "rhymeLabel": "B" },
    { "text": "sigo el ruido de tu verdad", "chord": "C", "syllableCount": 10, "rhymeLabel": "A" },
    { "text": "y aterrizo justo en tu portal", "chord": "G", "syllableCount": 10, "rhymeLabel": "B" }
  ],
  "detectedScheme": "ABAB",
  "emotionalTag": "íntimo",
  "chordProOutput": "[placeholder]"
}
\`\`\``,
            },
          },
        ],
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() =>
      useLyricsControls({
        activeChords: ['C', 'G'],
        keyRoot: 'C',
        mode: 'major',
        bpm: 90,
        mood: 'Pop Acústico Relajado',
      }),
    );

    let generationPromise: Promise<unknown> | undefined;

    act(() => {
      generationPromise = result.current.generateLyrics();
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(true);
    });

    await act(async () => {
      await generationPromise;
    });

    await waitFor(() => {
      expect(result.current.isGenerating).toBe(false);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.lines).toHaveLength(4);
    expect(result.current.result?.chordProOutput).toContain('[C]Cruzo cables en la ciudad');
  });
});
