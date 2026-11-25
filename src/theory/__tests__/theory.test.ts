import { describe, expect, it } from 'vitest';
import {
  MAJOR_KEYS,
  MINOR_KEYS,
  MOOD_OPTIONS,
  buildProgressionFromDegrees,
  buildScaleNotes,
  generateProgression,
  getDiatonicChords,
  getReplacementSuggestions,
} from '../index';

describe('music theory engine', () => {
  it('spells major and minor scales accurately without incorrect enharmonics', () => {
    expect(buildScaleNotes('C', 'major')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
    expect(buildScaleNotes('G', 'major')).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
    expect(buildScaleNotes('F', 'major')).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
    expect(buildScaleNotes('Bb', 'major')).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']);
    expect(buildScaleNotes('A', 'minor')).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    expect(buildScaleNotes('D', 'minor')).toEqual(['D', 'E', 'F', 'G', 'A', 'Bb', 'C']);
  });

  it('derives accurate diatonic chords and roman numerals for standard keys', () => {
    const cMajor = getDiatonicChords('C', 'major');
    expect(cMajor.map((c) => c.symbol)).toEqual(['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
    expect(cMajor.map((c) => c.roman)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);

    const gMajor = getDiatonicChords('G', 'major');
    expect(gMajor.map((c) => c.symbol)).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);

    const fMajor = getDiatonicChords('F', 'major');
    expect(fMajor.map((c) => c.symbol)).toEqual(['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim']);

    const aMinor = getDiatonicChords('A', 'minor');
    expect(aMinor.map((c) => c.symbol)).toEqual(['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G']);
    expect(aMinor.map((c) => c.roman)).toEqual(['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);

    const dMinor = getDiatonicChords('D', 'minor');
    expect(dMinor.map((c) => c.symbol)).toEqual(['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C']);
  });

  it('generates valid 7-chord diatonic sets and 4-chord progressions across all 24 keys and 5 moods', () => {
    for (const keyRoot of MAJOR_KEYS) {
      const chords = getDiatonicChords(keyRoot, 'major');
      expect(chords).toHaveLength(7);

      for (const mood of MOOD_OPTIONS) {
        const prog = generateProgression(keyRoot, 'major', mood.id);
        expect(prog.slots).toHaveLength(4);
        expect(prog.degrees).toHaveLength(4);
        const validSymbols = new Set(chords.map((c) => c.symbol));
        for (const slot of prog.slots) {
          expect(validSymbols.has(slot.chord.symbol)).toBe(true);
          expect(slot.chord.explanation.length).toBeGreaterThan(10);
          expect(slot.roleHint.length).toBeGreaterThan(10);
        }
      }
    }

    for (const keyRoot of MINOR_KEYS) {
      const chords = getDiatonicChords(keyRoot, 'minor');
      expect(chords).toHaveLength(7);

      for (const mood of MOOD_OPTIONS) {
        const prog = generateProgression(keyRoot, 'minor', mood.id);
        expect(prog.slots).toHaveLength(4);
        const validSymbols = new Set(chords.map((c) => c.symbol));
        for (const slot of prog.slots) {
          expect(validSymbols.has(slot.chord.symbol)).toBe(true);
        }
      }
    }
  });

  it('suggests valid diatonic replacements excluding the current chord and ranking non-diminished first', () => {
    const prog = buildProgressionFromDegrees('G', 'major', 'calm', [1, 5, 6, 4]);
    const replacements = getReplacementSuggestions('G', 'major', prog.degrees, 1);

    expect(replacements).toHaveLength(6);
    const diatonicSymbols = new Set(getDiatonicChords('G', 'major').map((c) => c.symbol));

    for (const suggestion of replacements) {
      expect(diatonicSymbols.has(suggestion.chord.symbol)).toBe(true);
      expect(suggestion.chord.symbol).not.toBe('D');
      expect(suggestion.moodEffect.length).toBeGreaterThan(10);
    }

    // Diminished chord (vii° = F#dim) should rank last
    expect(replacements[replacements.length - 1].chord.quality).toBe('dim');
  });
});
