import type { KeyOption, Mode } from './types';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;

const NATURAL_SEMITONES: Readonly<Record<string, number>> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const NOTE_SEMITONES: Readonly<Record<string, number>> = {
  'C': 0, 'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4,
  'F': 5, 'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

const SHARP_CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10] as const;

export const MAJOR_KEYS: readonly string[] = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db',
];

export const MINOR_KEYS: readonly string[] = [
  'A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb',
];

export const NOTE_SOLFEGE: Readonly<Record<string, string>> = {
  'C': 'Do',
  'C#': 'Do♯',
  'Db': 'Re♭',
  'D': 'Re',
  'D#': 'Re♯',
  'Eb': 'Mi♭',
  'E': 'Mi',
  'F': 'Fa',
  'F#': 'Fa♯',
  'Gb': 'Sol♭',
  'G': 'Sol',
  'G#': 'Sol♯',
  'Ab': 'La♭',
  'A': 'La',
  'A#': 'La♯',
  'Bb': 'Si♭',
  'B': 'Si',
};

export function noteToSemitone(note: string): number {
  const trimmed = note.trim();
  const value = NOTE_SEMITONES[trimmed];
  if (value === undefined) {
    throw new Error(`Unknown note name: "${note}"`);
  }
  return value;
}

export function normalizeToSharp(note: string): string {
  const semitone = noteToSemitone(note);
  return SHARP_CHROMATIC[((semitone % 12) + 12) % 12];
}

function spellNoteForLetter(letter: string, targetSemitone: number): string {
  const natural = NATURAL_SEMITONES[letter];
  const diff = ((targetSemitone - natural) % 12 + 12) % 12;

  if (diff === 0) return letter;
  if (diff === 1) return `${letter}#`;
  if (diff === 11) return `${letter}b`;
  if (diff === 2) return `${letter}##`;
  if (diff === 10) return `${letter}bb`;

  return SHARP_CHROMATIC[targetSemitone];
}

/**
 * Builds the 7-note diatonic scale for a root and mode, preserving strict
 * alphabetical letter sequence so enharmonic spellings are musically accurate
 * (e.g. F major uses Bb, G major uses F#, D minor uses Bb).
 */
export function buildScaleNotes(root: string, mode: Mode): string[] {
  const trimmed = root.trim();
  const rootLetter = trimmed.charAt(0).toUpperCase();
  const startLetterIdx = LETTERS.indexOf(rootLetter as (typeof LETTERS)[number]);

  if (startLetterIdx === -1) {
    throw new Error(`Invalid scale root: "${root}"`);
  }

  const rootSemitone = noteToSemitone(trimmed);
  const intervals = mode === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;

  return intervals.map((interval, degreeIdx) => {
    const letter = LETTERS[(startLetterIdx + degreeIdx) % 7];
    const targetSemitone = (rootSemitone + interval) % 12;
    return spellNoteForLetter(letter, targetSemitone);
  });
}

export function formatNoteLabel(note: string): string {
  const solfege = NOTE_SOLFEGE[note];
  return solfege ? `${note} (${solfege})` : note;
}

export function getKeyOptions(mode: Mode): KeyOption[] {
  const keys = mode === 'major' ? MAJOR_KEYS : MINOR_KEYS;
  return keys.map((root) => {
    const solfege = NOTE_SOLFEGE[root] ?? root;
    return {
      root,
      solfege,
      label: `${root} · ${solfege}`,
    };
  });
}
