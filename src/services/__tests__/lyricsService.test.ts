import { describe, expect, it } from 'vitest';
import { parseLyricsResponse, type LyricsParams } from '../lyricsService';

const baseParams: LyricsParams = {
  activeChords: ['C', 'G'],
  keyRoot: 'C',
  mode: 'major',
  bpm: 92,
  mood: 'Pop Acústico Relajado',
  rhymeScheme: 'ABAB',
  emotionalMood: 60,
  narrativePerson: '1ra',
  metaphorDensity: 'balanced',
  thematicConcept: 'Noche y ciudad',
  language: 'es',
  linesToGenerate: 4,
};

describe('parseLyricsResponse', () => {
  it('parsea JSON con fences y normaliza chordProOutput', () => {
    const raw = `\`\`\`json
{
  "lines": [
    { "text": "Luces bajas sobre la estación", "chord": "C", "syllableCount": 10, "rhymeLabel": "A" },
    { "text": "tu sombra cruza mi canción", "chord": "G", "syllableCount": 9, "rhymeLabel": "B" },
    { "text": "vuelvo tarde, no hay dirección", "chord": "C", "syllableCount": 10, "rhymeLabel": "A" },
    { "text": "pero el pulso pide resolución", "chord": "G", "syllableCount": 11, "rhymeLabel": "B" }
  ],
  "detectedScheme": "ABAB",
  "emotionalTag": "nostálgico",
  "chordProOutput": "[X]esto será ignorado"
}
\`\`\``;

    const parsed = parseLyricsResponse(raw, baseParams);

    expect(parsed.lines).toHaveLength(4);
    expect(parsed.detectedScheme).toBe('ABAB');
    expect(parsed.chordProOutput).toBe(
      '[C]Luces bajas sobre la estación\n[G]tu sombra cruza mi canción\n[C]vuelvo tarde, no hay dirección\n[G]pero el pulso pide resolución',
    );
  });

  it('lanza error cuando el número de líneas no coincide', () => {
    const raw = JSON.stringify({
      lines: [
        { text: 'línea 1', chord: 'C', syllableCount: 4, rhymeLabel: 'A' },
        { text: 'línea 2', chord: 'G', syllableCount: 4, rhymeLabel: 'B' },
      ],
      detectedScheme: 'AB',
      emotionalTag: 'neutral',
      chordProOutput: '[C]línea 1\n[G]línea 2',
    });

    expect(() => parseLyricsResponse(raw, baseParams)).toThrow('Expected 4 lines, received 2');
  });
});
