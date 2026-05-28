export interface ChordInfo {
  frets: number[];
  midiNotes: string[];
  startFret?: number;
  variations?: Omit<ChordInfo, 'variations'>[];
}

const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#', 
  'Eb': 'D#', 
  'Gb': 'F#', 
  'Ab': 'G#', 
  'Bb': 'A#'
};

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const midiToNote = (midi: number): string => {
  const noteName = NOTES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${noteName}${octave}`;
};

// Root fret lookups for procedural power chord positioning
const ROOT_FRETS_S6: Record<string, number> = {
  'E': 0, 'F': 1, 'F#': 2, 'G': 3, 'G#': 4, 'A': 5, 'A#': 6, 'B': 7, 'C': 8, 'C#': 9, 'D': 10, 'D#': 11
};

const ROOT_FRETS_S5: Record<string, number> = {
  'A': 0, 'A#': 1, 'B': 2, 'C': 3, 'C#': 4, 'D': 5, 'D#': 6, 'E': 7, 'F': 8, 'F#': 9, 'G': 10, 'G#': 11
};

export const CHORD_DICTIONARY: Record<string, ChordInfo> = {
  // Standard Major Chords
  'C': { 
    frets: [-1, 3, 2, 0, 1, 0], 
    midiNotes: ['C3', 'E3', 'G3', 'C4', 'E4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 3, 5, 5, 5, 3], midiNotes: ['C3', 'G3', 'C4', 'E4', 'G4'], startFret: 3 },
      { frets: [8, 10, 10, 9, 8, 8], midiNotes: ['C2', 'G2', 'C3', 'E3', 'G3', 'C4'], startFret: 8 }
    ]
  },
  'D': { 
    frets: [-1, -1, 0, 2, 3, 2], 
    midiNotes: ['D3', 'A3', 'D4', 'F#4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 5, 7, 7, 7, 5], midiNotes: ['D3', 'A3', 'D4', 'F#4', 'A4'], startFret: 5 },
      { frets: [10, 12, 12, 11, 10, 10], midiNotes: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], startFret: 10 }
    ]
  },
  'E': { 
    frets: [0, 2, 2, 1, 0, 0], 
    midiNotes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 7, 9, 9, 9, 7], midiNotes: ['E3', 'B3', 'E4', 'G#4', 'B4'], startFret: 7 },
      { frets: [12, 14, 14, 13, 12, 12], midiNotes: ['E3', 'B3', 'E4', 'G#4', 'B4', 'E5'], startFret: 12 }
    ]
  },
  'F': { 
    frets: [1, 3, 3, 2, 1, 1], 
    midiNotes: ['F2', 'C3', 'F3', 'A3', 'C4', 'F4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 8, 10, 10, 10, 8], midiNotes: ['F3', 'C4', 'F4', 'A4', 'C5'], startFret: 8 }
    ]
  },
  'G': { 
    frets: [3, 2, 0, 0, 0, 3], 
    midiNotes: ['G2', 'B2', 'D3', 'G3', 'B3', 'G4'], 
    startFret: 1,
    variations: [
      { frets: [3, 5, 5, 4, 3, 3], midiNotes: ['G2', 'D3', 'G3', 'B3', 'D4', 'G4'], startFret: 3 },
      { frets: [-1, 10, 12, 12, 12, 10], midiNotes: ['G3', 'D4', 'G4', 'B4', 'D5'], startFret: 10 }
    ]
  },
  'A': { 
    frets: [-1, 0, 2, 2, 2, 0], 
    midiNotes: ['A2', 'E3', 'A3', 'C#4', 'E4'], 
    startFret: 1,
    variations: [
      { frets: [5, 7, 7, 6, 5, 5], midiNotes: ['A2', 'E3', 'A3', 'C#4', 'E4', 'A4'], startFret: 5 },
      { frets: [-1, 12, 14, 14, 14, 12], midiNotes: ['A3', 'E4', 'A4', 'C#5', 'E5'], startFret: 12 }
    ]
  },
  'B': { 
    frets: [-1, 2, 4, 4, 4, 2], 
    midiNotes: ['B2', 'F#3', 'B3', 'D#4', 'F#4'], 
    startFret: 2,
    variations: [
      { frets: [7, 9, 9, 8, 7, 7], midiNotes: ['B2', 'F#3', 'B3', 'D#4', 'F#4', 'B4'], startFret: 7 }
    ]
  },

  // Standard Minor Chords
  'Am': { 
    frets: [-1, 0, 2, 2, 1, 0], 
    midiNotes: ['A2', 'E3', 'A3', 'C4', 'E4'], 
    startFret: 1,
    variations: [
      { frets: [5, 7, 7, 5, 5, 5], midiNotes: ['A2', 'E3', 'A3', 'C4', 'E4', 'A4'], startFret: 5 },
      { frets: [-1, 12, 14, 14, 13, 12], midiNotes: ['A3', 'E4', 'A4', 'C5', 'E5'], startFret: 12 }
    ]
  },
  'Bm': { 
    frets: [-1, 2, 4, 4, 3, 2], 
    midiNotes: ['B2', 'F#3', 'B3', 'D4', 'F#4'], 
    startFret: 2,
    variations: [
      { frets: [7, 9, 9, 7, 7, 7], midiNotes: ['B2', 'F#3', 'B3', 'D4', 'F#4', 'B4'], startFret: 7 }
    ]
  },
  'Cm': { 
    frets: [-1, 3, 5, 5, 4, 3], 
    midiNotes: ['C3', 'G3', 'C4', 'D#4', 'G4'], 
    startFret: 3,
    variations: [
      { frets: [8, 10, 10, 8, 8, 8], midiNotes: ['C2', 'G2', 'C3', 'D#3', 'G3', 'C4'], startFret: 8 }
    ]
  },
  'Dm': { 
    frets: [-1, -1, 0, 2, 3, 1], 
    midiNotes: ['D3', 'A3', 'D4', 'F4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 5, 7, 7, 6, 5], midiNotes: ['D3', 'A3', 'D4', 'F4', 'A4'], startFret: 5 },
      { frets: [10, 12, 12, 10, 10, 10], midiNotes: ['D2', 'A2', 'D3', 'F3', 'A3', 'D4'], startFret: 10 }
    ]
  },
  'Em': { 
    frets: [0, 2, 2, 0, 0, 0], 
    midiNotes: ['E2', 'B2', 'E3', 'G3', 'B3', 'E4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 7, 9, 9, 8, 7], midiNotes: ['E3', 'B3', 'E4', 'G4', 'B4'], startFret: 7 }
    ]
  },
  'Fm': { 
    frets: [1, 3, 3, 1, 1, 1], 
    midiNotes: ['F2', 'C3', 'F3', 'G#3', 'C4', 'F4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 8, 10, 10, 9, 8], midiNotes: ['F3', 'C4', 'F4', 'G#4', 'C5'], startFret: 8 }
    ]
  },
  'Gm': { 
    frets: [3, 5, 5, 3, 3, 3], 
    midiNotes: ['G2', 'D3', 'G3', 'A#3', 'D4', 'G4'], 
    startFret: 3,
    variations: [
      { frets: [-1, 10, 12, 12, 11, 10], midiNotes: ['G3', 'D4', 'G4', 'A#4', 'D5'], startFret: 10 }
    ]
  },

  // Power Chords (MVP requested values)
  'E5': { frets: [0, 2, 2, -1, -1, -1], midiNotes: ['E2', 'B2', 'E3'], startFret: 1 },
  'B5': { frets: [-1, 2, 4, 4, -1, -1], midiNotes: ['B2', 'F#3', 'B3'], startFret: 1 }, // root on string 5
  'C#5': { frets: [-1, 4, 6, 6, -1, -1], midiNotes: ['C#3', 'G#3', 'C#4'], startFret: 3 }, // root on string 5
  'A5': { frets: [5, 7, 7, -1, -1, -1], midiNotes: ['A2', 'E3', 'A3'], startFret: 5 }, // root on string 6

  // Jazzy Melancólico Progression Chords
  'Cmaj7': { 
    frets: [-1, 3, 2, 0, 0, 0], 
    midiNotes: ['C3', 'E3', 'G3', 'B3', 'E4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 3, 5, 4, 5, 3], midiNotes: ['C3', 'G3', 'B3', 'E4'], startFret: 3 },
      { frets: [8, -1, 9, 9, 8, -1], midiNotes: ['C3', 'B3', 'E4', 'G4'], startFret: 8 }
    ]
  },
  'Am9': { frets: [5, -1, 5, 5, 5, 7], midiNotes: ['A2', 'G3', 'B3', 'C4', 'E4'], startFret: 4 },
  'Dm7': { 
    frets: [-1, -1, 0, 2, 1, 1], 
    midiNotes: ['D3', 'F3', 'A3', 'C4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 5, 7, 5, 6, 5], midiNotes: ['D3', 'A3', 'C4', 'F4', 'A4'], startFret: 5 }
    ]
  },
  'G13': { frets: [3, -1, 3, 4, 5, -1], midiNotes: ['G2', 'F3', 'B3', 'E4'], startFret: 2 },

  // Pop Acústico Progression Chords
  'D/F#': { frets: [2, 0, 0, 2, 3, 2], midiNotes: ['F#2', 'D3', 'A3', 'D4', 'F#4'], startFret: 1 },
  'Em7': { 
    frets: [0, 2, 2, 0, 3, 3], 
    midiNotes: ['E2', 'B2', 'D3', 'G3', 'D4', 'G4'], 
    startFret: 1,
    variations: [
      { frets: [-1, 7, 9, 7, 8, 7], midiNotes: ['E3', 'B3', 'D4', 'G4', 'B4'], startFret: 7 }
    ]
  },
  'Cadd9': { frets: [-1, 3, 2, 0, 3, 3], midiNotes: ['C3', 'E3', 'G3', 'D4', 'G4'], startFret: 1 }
};

/**
 * Returns the base chord data dictionary entry without variation logic.
 */
function getChordDataBase(chordName: string): ChordInfo {
  if (!chordName || chordName === 'LOAD' || chordName === 'ERR' || chordName === 'SYS_ERR') {
    return {
      frets: [-1, -1, -1, -1, -1, -1],
      midiNotes: [],
      startFret: 1
    };
  }

  // 1. Direct Lookup
  if (CHORD_DICTIONARY[chordName]) {
    return CHORD_DICTIONARY[chordName];
  }

  // 2. Parse root and extension
  const match = chordName.match(/^([A-G][#b]?)(.*)$/);
  if (!match) {
    return {
      frets: [0, 2, 2, 1, 0, 0], // Fallback E major shape
      midiNotes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
      startFret: 1
    };
  }

  let root = match[1];
  const suffix = match[2];

  if (FLAT_TO_SHARP[root]) {
    root = FLAT_TO_SHARP[root];
  }

  const rootIndex = NOTES.indexOf(root);
  if (rootIndex === -1) {
    return {
      frets: [0, 2, 2, 1, 0, 0],
      midiNotes: ['E2', 'B2', 'E3', 'G#3', 'B3', 'E4'],
      startFret: 1
    };
  }

  // 3. Try simplified chord lookup (e.g. Am9 -> Am, Cadd9 -> C)
  const isMinor = suffix.startsWith('m') && !suffix.startsWith('maj');
  const simplifiedName = isMinor ? `${root}m` : root;
  if (CHORD_DICTIONARY[simplifiedName]) {
    return CHORD_DICTIONARY[simplifiedName];
  }

  // 4. Procedural Power Chord generation if ends with 5 (to prevent crashes on transposition)
  if (suffix.includes('5')) {
    // Prefer string 6 for lower roots, string 5 for higher roots
    const s6Roots = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#'];
    const rootMidiVal = 36 + rootIndex; // Octave 2 range
    
    if (s6Roots.includes(root)) {
      const fret = ROOT_FRETS_S6[root];
      return {
        frets: [fret, fret + 2, fret + 2, -1, -1, -1],
        midiNotes: [midiToNote(rootMidiVal), midiToNote(rootMidiVal + 7), midiToNote(rootMidiVal + 12)],
        startFret: fret > 0 ? fret : 1
      };
    } else {
      const fret = ROOT_FRETS_S5[root];
      const adjustedRootMidi = root === 'B' ? 47 : (36 + rootIndex);
      return {
        frets: [-1, fret, fret + 2, fret + 2, -1, -1],
        midiNotes: [midiToNote(adjustedRootMidi), midiToNote(adjustedRootMidi + 7), midiToNote(adjustedRootMidi + 12)],
        startFret: fret > 0 ? fret : 1
      };
    }
  }

  // 5. Ultimate Fallback: Triad on Octave 3
  const rootMidi = 48 + rootIndex;
  const thirdOffset = isMinor ? 3 : 4;
  return {
    frets: [-1, -1, -1, -1, -1, -1], // Return mute indicator for custom shape
    midiNotes: [
      midiToNote(rootMidi),
      midiToNote(rootMidi + thirdOffset),
      midiToNote(rootMidi + 7)
    ],
    startFret: 1
  };
}

/**
 * Returns the exact fret positions and midi notes for a given chord name and variation index.
 */
export function getChordData(chordName: string, variationIndex = 0): ChordInfo {
  const baseData = getChordDataBase(chordName);

  if (variationIndex > 0 && baseData.variations && baseData.variations.length >= variationIndex) {
    const variant = baseData.variations[variationIndex - 1];
    return {
      frets: variant.frets,
      midiNotes: variant.midiNotes,
      startFret: variant.startFret ?? baseData.startFret
    };
  }

  return baseData;
}

/**
 * Returns the total number of shape variations available for a chord.
 */
export function getChordVariationsCount(chordName: string): number {
  const baseData = getChordDataBase(chordName);
  return 1 + (baseData.variations?.length || 0);
}
