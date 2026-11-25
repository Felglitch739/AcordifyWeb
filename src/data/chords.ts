export interface BarreSpec {
  fret: number;
  fromString: number; // 0 = 6th string (low E), 5 = 1st string (high e)
  toString: number;
}

export interface GuitarChordVoicing {
  symbol: string;
  frets: [number, number, number, number, number, number];
  fingers: [number, number, number, number, number, number];
  rootStrings: number[];
  startFret: number;
  barre?: BarreSpec;
  difficulty: 'open' | 'barre';
  midiNotes: string[];
}

interface RawVoicing {
  frets: [number, number, number, number, number, number];
  fingers: [number, number, number, number, number, number];
  startFret: number;
  barre?: BarreSpec;
  difficulty: 'open' | 'barre';
}

const OPEN_STRING_MIDI = [40, 45, 50, 55, 59, 64] as const; // E2, A2, D3, G3, B3, E4
const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const ENHARMONIC_ROOT_TO_SHARP: Readonly<Record<string, string>> = {
  'C': 'C',
  'B#': 'C',
  'C#': 'C#',
  'Db': 'C#',
  'D': 'D',
  'D#': 'D#',
  'Eb': 'D#',
  'E': 'E',
  'Fb': 'E',
  'F': 'F',
  'E#': 'F',
  'F#': 'F#',
  'Gb': 'F#',
  'G': 'G',
  'G#': 'G#',
  'Ab': 'G#',
  'A': 'A',
  'A#': 'A#',
  'Bb': 'A#',
  'B': 'B',
  'Cb': 'B',
};

function midiNumberToNoteName(midi: number): string {
  const note = CHROMATIC_SHARPS[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function fretsToMidiNotes(frets: readonly [number, number, number, number, number, number]): string[] {
  const notes: string[] = [];
  for (let i = 0; i < 6; i++) {
    const fret = frets[i];
    if (fret >= 0) {
      notes.push(midiNumberToNoteName(OPEN_STRING_MIDI[i] + fret));
    }
  }
  return notes;
}

function computeRootStrings(
  canonicalKey: string,
  frets: readonly [number, number, number, number, number, number],
): number[] {
  const rootMatch = canonicalKey.match(/^([A-G]#?)/);
  const rootSemitone = rootMatch
    ? (CHROMATIC_SHARPS as readonly string[]).indexOf(rootMatch[1])
    : 0;
  if (rootSemitone < 0) return [];

  const indices: number[] = [];
  for (let i = 0; i < 6; i++) {
    const fret = frets[i];
    if (fret >= 0 && (OPEN_STRING_MIDI[i] + fret) % 12 === rootSemitone) {
      indices.push(i);
    }
  }
  return indices;
}

function makeVoicing(symbol: string, canonicalKey: string, raw: RawVoicing): GuitarChordVoicing {
  return {
    symbol,
    frets: raw.frets,
    fingers: raw.fingers,
    rootStrings: computeRootStrings(canonicalKey, raw.frets),
    startFret: raw.startFret,
    barre: raw.barre,
    difficulty: raw.difficulty,
    midiNotes: fretsToMidiNotes(raw.frets),
  };
}

const RAW_CHORDS: Readonly<Record<string, RawVoicing>> = {
  // 12 Major triads
  'C': {
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    startFret: 1,
    difficulty: 'open',
  },
  'C#': {
    frets: [-1, 4, 6, 6, 6, 4],
    fingers: [0, 1, 2, 3, 4, 1],
    startFret: 4,
    barre: { fret: 4, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },
  'D': {
    frets: [-1, -1, 0, 2, 3, 2],
    fingers: [0, 0, 0, 1, 3, 2],
    startFret: 1,
    difficulty: 'open',
  },
  'D#': {
    frets: [-1, 6, 8, 8, 8, 6],
    fingers: [0, 1, 2, 3, 4, 1],
    startFret: 6,
    barre: { fret: 6, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },
  'E': {
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [0, 2, 3, 1, 0, 0],
    startFret: 1,
    difficulty: 'open',
  },
  'F': {
    frets: [1, 3, 3, 2, 1, 1],
    fingers: [1, 3, 4, 2, 1, 1],
    startFret: 1,
    barre: { fret: 1, fromString: 0, toString: 5 },
    difficulty: 'barre',
  },
  'F#': {
    frets: [2, 4, 4, 3, 2, 2],
    fingers: [1, 3, 4, 2, 1, 1],
    startFret: 2,
    barre: { fret: 2, fromString: 0, toString: 5 },
    difficulty: 'barre',
  },
  'G': {
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, 0, 0, 0, 3],
    startFret: 1,
    difficulty: 'open',
  },
  'G#': {
    frets: [4, 6, 6, 5, 4, 4],
    fingers: [1, 3, 4, 2, 1, 1],
    startFret: 4,
    barre: { fret: 4, fromString: 0, toString: 5 },
    difficulty: 'barre',
  },
  'A': {
    frets: [-1, 0, 2, 2, 2, 0],
    fingers: [0, 0, 1, 2, 3, 0],
    startFret: 1,
    difficulty: 'open',
  },
  'A#': {
    frets: [-1, 1, 3, 3, 3, 1],
    fingers: [0, 1, 2, 3, 4, 1],
    startFret: 1,
    barre: { fret: 1, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },
  'B': {
    frets: [-1, 2, 4, 4, 4, 2],
    fingers: [0, 1, 2, 3, 4, 1],
    startFret: 2,
    barre: { fret: 2, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },

  // 12 Minor triads
  'Cm': {
    frets: [-1, 3, 5, 5, 4, 3],
    fingers: [0, 1, 3, 4, 2, 1],
    startFret: 3,
    barre: { fret: 3, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },
  'C#m': {
    frets: [-1, 4, 6, 6, 5, 4],
    fingers: [0, 1, 3, 4, 2, 1],
    startFret: 4,
    barre: { fret: 4, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },
  'Dm': {
    frets: [-1, -1, 0, 2, 3, 1],
    fingers: [0, 0, 0, 2, 3, 1],
    startFret: 1,
    difficulty: 'open',
  },
  'D#m': {
    frets: [-1, 6, 8, 8, 7, 6],
    fingers: [0, 1, 3, 4, 2, 1],
    startFret: 6,
    barre: { fret: 6, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },
  'Em': {
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [0, 2, 3, 0, 0, 0],
    startFret: 1,
    difficulty: 'open',
  },
  'Fm': {
    frets: [1, 3, 3, 1, 1, 1],
    fingers: [1, 3, 4, 1, 1, 1],
    startFret: 1,
    barre: { fret: 1, fromString: 0, toString: 5 },
    difficulty: 'barre',
  },
  'F#m': {
    frets: [2, 4, 4, 2, 2, 2],
    fingers: [1, 3, 4, 1, 1, 1],
    startFret: 2,
    barre: { fret: 2, fromString: 0, toString: 5 },
    difficulty: 'barre',
  },
  'Gm': {
    frets: [3, 5, 5, 3, 3, 3],
    fingers: [1, 3, 4, 1, 1, 1],
    startFret: 3,
    barre: { fret: 3, fromString: 0, toString: 5 },
    difficulty: 'barre',
  },
  'G#m': {
    frets: [4, 6, 6, 4, 4, 4],
    fingers: [1, 3, 4, 1, 1, 1],
    startFret: 4,
    barre: { fret: 4, fromString: 0, toString: 5 },
    difficulty: 'barre',
  },
  'Am': {
    frets: [-1, 0, 2, 2, 1, 0],
    fingers: [0, 0, 2, 3, 1, 0],
    startFret: 1,
    difficulty: 'open',
  },
  'A#m': {
    frets: [-1, 1, 3, 3, 2, 1],
    fingers: [0, 1, 3, 4, 2, 1],
    startFret: 1,
    barre: { fret: 1, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },
  'Bm': {
    frets: [-1, 2, 4, 4, 3, 2],
    fingers: [0, 1, 3, 4, 2, 1],
    startFret: 2,
    barre: { fret: 2, fromString: 1, toString: 5 },
    difficulty: 'barre',
  },

  // 12 Diminished triads
  'Cdim': {
    frets: [-1, 3, 4, 5, 4, -1],
    fingers: [0, 1, 2, 4, 3, 0],
    startFret: 3,
    difficulty: 'barre',
  },
  'C#dim': {
    frets: [-1, 4, 5, 6, 5, -1],
    fingers: [0, 1, 2, 4, 3, 0],
    startFret: 4,
    difficulty: 'barre',
  },
  'Ddim': {
    frets: [-1, -1, 0, 1, 3, 1],
    fingers: [0, 0, 0, 1, 4, 2],
    startFret: 1,
    difficulty: 'open',
  },
  'D#dim': {
    frets: [-1, 6, 7, 8, 7, -1],
    fingers: [0, 1, 2, 4, 3, 0],
    startFret: 6,
    difficulty: 'barre',
  },
  'Edim': {
    frets: [0, 1, 2, 0, -1, -1],
    fingers: [0, 1, 2, 0, 0, 0],
    startFret: 1,
    difficulty: 'open',
  },
  'Fdim': {
    frets: [-1, -1, 3, 1, 0, 1],
    fingers: [0, 0, 3, 1, 0, 2],
    startFret: 1,
    difficulty: 'open',
  },
  'F#dim': {
    frets: [-1, -1, 4, 2, 1, 2],
    fingers: [0, 0, 4, 2, 1, 3],
    startFret: 1,
    difficulty: 'barre',
  },
  'Gdim': {
    frets: [3, 4, 5, 3, -1, -1],
    fingers: [1, 3, 4, 2, 0, 0],
    startFret: 3,
    difficulty: 'barre',
  },
  'G#dim': {
    frets: [4, 5, 6, 4, -1, -1],
    fingers: [1, 3, 4, 2, 0, 0],
    startFret: 4,
    difficulty: 'barre',
  },
  'Adim': {
    frets: [-1, 0, 1, 2, 1, -1],
    fingers: [0, 0, 1, 3, 2, 0],
    startFret: 1,
    difficulty: 'open',
  },
  'A#dim': {
    frets: [-1, 1, 2, 3, 2, -1],
    fingers: [0, 1, 2, 4, 3, 0],
    startFret: 1,
    difficulty: 'barre',
  },
  'Bdim': {
    frets: [-1, 2, 3, 4, 3, -1],
    fingers: [0, 1, 2, 4, 3, 0],
    startFret: 1,
    difficulty: 'barre',
  },
};

function canonicalizeChordKey(symbol: string): string {
  const trimmed = symbol.trim();
  const match = trimmed.match(/^([A-G][#b]?)(m|dim)?$/);
  if (!match) {
    return trimmed;
  }

  const root = match[1];
  const suffix = match[2] ?? '';
  const canonicalRoot = ENHARMONIC_ROOT_TO_SHARP[root] ?? root;
  return `${canonicalRoot}${suffix}`;
}

export function getGuitarChord(symbol: string): GuitarChordVoicing {
  const key = canonicalizeChordKey(symbol);
  const raw = RAW_CHORDS[key];

  if (!raw) {
    // Graceful fallback if an unrecognized symbol is ever requested
    return makeVoicing(symbol, 'C', RAW_CHORDS['C']);
  }

  return makeVoicing(symbol, key, raw);
}

export const ALL_CANONICAL_CHORD_KEYS = Object.keys(RAW_CHORDS);
