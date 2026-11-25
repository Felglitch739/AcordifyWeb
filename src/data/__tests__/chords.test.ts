import { describe, expect, it } from 'vitest';
import { ALL_CANONICAL_CHORD_KEYS, getGuitarChord } from '../chords';
import { MAJOR_KEYS, MINOR_KEYS, getDiatonicChords, noteToSemitone } from '../../theory';

const NOTE_SEMITONE_MAP: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
};

function midiNotePitchClass(midiNote: string): number {
  const match = midiNote.match(/^([A-G]#?)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid MIDI note: ${midiNote}`);
  }
  return NOTE_SEMITONE_MAP[match[1]];
}

describe('curated guitar chord dictionary', () => {
  it('contains all 36 canonical diatonic triads (12 major, 12 minor, 12 diminished)', () => {
    expect(ALL_CANONICAL_CHORD_KEYS).toHaveLength(36);
  });

  it('resolves every diatonic chord across all 24 keys to a valid playable voicing within a 4-fret window', () => {
    const allChecks = [
      ...MAJOR_KEYS.map((root) => ({ root, mode: 'major' as const })),
      ...MINOR_KEYS.map((root) => ({ root, mode: 'minor' as const })),
    ];

    for (const { root, mode } of allChecks) {
      const chords = getDiatonicChords(root, mode);

      for (const chord of chords) {
        const voicing = getGuitarChord(chord.symbol);

        // At least 3 played strings
        const playedFrets = voicing.frets.filter((f) => f >= 0);
        expect(playedFrets.length).toBeGreaterThanOrEqual(3);

        // Every fretted (> 0) note must fit inside the 4-fret diagram window
        for (const fret of voicing.frets) {
          if (fret > 0) {
            expect(fret).toBeGreaterThanOrEqual(voicing.startFret);
            expect(fret).toBeLessThanOrEqual(voicing.startFret + 3);
          }
        }

        // Valid MIDI notes matching the chord's triad pitch classes
        expect(voicing.midiNotes.length).toBe(playedFrets.length);
        const expectedPitchClasses = new Set(chord.notes.map(noteToSemitone));
        const actualPitchClasses = new Set(voicing.midiNotes.map(midiNotePitchClass));

        for (const pc of actualPitchClasses) {
          expect(expectedPitchClasses.has(pc)).toBe(true);
        }
        // Must contain all 3 notes of the triad
        expect(actualPitchClasses.size).toBe(3);
      }
    }
  });
});
