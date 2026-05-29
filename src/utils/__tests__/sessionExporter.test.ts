import { describe, expect, it } from 'vitest';
import { buildSessionSnapshot, parseSessionSnapshot, serializeSessionSnapshot } from '../sessionExporter';

describe('sessionExporter', () => {
  it('serializa y rehidrata una sesión completa', () => {
    const snapshot = buildSessionSnapshot({
      title: 'Noche Azul',
      mood: 'Jazzy Melancólico',
      bpm: 88,
      keyRoot: 'C',
      mode: 'minor',
      chords: ['Cm7', 'Fm7', 'G7', 'Cm7'],
      capo: 2,
      chordProContent: '[Cm7]Lluvia sobre el vidrio',
      language: 'es',
      rhymeScheme: 'ABAB',
      transposition: 2,
      autoScrollSpeed: 1,
      createdAt: '2026-05-26T12:00:00.000Z',
    });

    const json = serializeSessionSnapshot(snapshot);
    const parsed = parseSessionSnapshot(json);

    expect(parsed).toEqual(snapshot);
  });

  it('rechaza payloads que no sean JSON válido', () => {
    expect(() => parseSessionSnapshot('no es json')).toThrow('Session payload is not valid JSON');
  });
});
