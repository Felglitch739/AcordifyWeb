import { getDiatonicChords } from './diatonic';
import { buildScaleNotes, noteToSemitone } from './notes';
import type { ChordQuality, HarmonicFunction, Mode } from './types';

export interface CirclePosition {
  index: number;
  majorRoot: string;
  enharmonicMajor?: string;
  minorRoot: string;
  enharmonicMinor?: string;
  accidentals: number;
  signatureLabel: string;
  accidentalNotes: readonly string[];
}

export interface DiatonicTetrad {
  degree: number;
  roman: string;
  symbol: string;
  triadSymbol: string;
  notes: [string, string, string, string];
  harmonicFunction: HarmonicFunction;
  functionLabel: string;
}

export interface SharedChordLink {
  fromSymbol: string;
  toSymbol: string;
  fromRoman: string;
  toRoman: string;
}

export interface TransformedChordInfo {
  fromSymbol: string;
  toSymbol: string;
  explanation: string;
}

export interface KeyComparison {
  fromRoot: string;
  fromMode: Mode;
  toRoot: string;
  toMode: Mode;
  sharedChords: SharedChordLink[];
  changedNotes: Array<{ removed: string; added: string }>;
  transformedChords: TransformedChordInfo[];
  suggestedPivot: SharedChordLink | null;
  summary: string;
}

export interface HarmonicNeighbors {
  dominant: {
    root: string;
    mode: Mode;
    positionIndex: number;
    comparison: KeyComparison;
  };
  subdominant: {
    root: string;
    mode: Mode;
    positionIndex: number;
    comparison: KeyComparison;
  };
  relative: {
    root: string;
    mode: Mode;
    positionIndex: number;
    comparison: KeyComparison;
  };
}

export const CIRCLE_POSITIONS: readonly CirclePosition[] = [
  {
    index: 0,
    majorRoot: 'C',
    minorRoot: 'A',
    accidentals: 0,
    signatureLabel: '0 · Sin alteraciones',
    accidentalNotes: [],
  },
  {
    index: 1,
    majorRoot: 'G',
    minorRoot: 'E',
    accidentals: 1,
    signatureLabel: '1♯ · F#',
    accidentalNotes: ['F#'],
  },
  {
    index: 2,
    majorRoot: 'D',
    minorRoot: 'B',
    accidentals: 2,
    signatureLabel: '2♯ · F#, C#',
    accidentalNotes: ['F#', 'C#'],
  },
  {
    index: 3,
    majorRoot: 'A',
    minorRoot: 'F#',
    accidentals: 3,
    signatureLabel: '3♯ · F#, C#, G#',
    accidentalNotes: ['F#', 'C#', 'G#'],
  },
  {
    index: 4,
    majorRoot: 'E',
    minorRoot: 'C#',
    accidentals: 4,
    signatureLabel: '4♯ · F#, C#, G#, D#',
    accidentalNotes: ['F#', 'C#', 'G#', 'D#'],
  },
  {
    index: 5,
    majorRoot: 'B',
    minorRoot: 'G#',
    accidentals: 5,
    signatureLabel: '5♯ · F#, C#, G#, D#, A#',
    accidentalNotes: ['F#', 'C#', 'G#', 'D#', 'A#'],
  },
  {
    index: 6,
    majorRoot: 'F#',
    enharmonicMajor: 'Gb',
    minorRoot: 'Eb',
    enharmonicMinor: 'D#',
    accidentals: 6,
    signatureLabel: '6♯ / 6♭ · F# o Gb',
    accidentalNotes: ['F#', 'C#', 'G#', 'D#', 'A#', 'E#'],
  },
  {
    index: 7,
    majorRoot: 'Db',
    enharmonicMajor: 'C#',
    minorRoot: 'Bb',
    accidentals: -5,
    signatureLabel: '5♭ · Bb, Eb, Ab, Db, Gb',
    accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db', 'Gb'],
  },
  {
    index: 8,
    majorRoot: 'Ab',
    minorRoot: 'F',
    accidentals: -4,
    signatureLabel: '4♭ · Bb, Eb, Ab, Db',
    accidentalNotes: ['Bb', 'Eb', 'Ab', 'Db'],
  },
  {
    index: 9,
    majorRoot: 'Eb',
    minorRoot: 'C',
    accidentals: -3,
    signatureLabel: '3♭ · Bb, Eb, Ab',
    accidentalNotes: ['Bb', 'Eb', 'Ab'],
  },
  {
    index: 10,
    majorRoot: 'Bb',
    minorRoot: 'G',
    accidentals: -2,
    signatureLabel: '2♭ · Bb, Eb',
    accidentalNotes: ['Bb', 'Eb'],
  },
  {
    index: 11,
    majorRoot: 'F',
    minorRoot: 'D',
    accidentals: -1,
    signatureLabel: '1♭ · Bb',
    accidentalNotes: ['Bb'],
  },
] as const;

const MAJOR_TETRAD_ROMANS = ['IM7', 'iim7', 'iiim7', 'IVM7', 'V7', 'vim7', 'viim7b5'] as const;
const MAJOR_TETRAD_SUFFIXES = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'] as const;

const MINOR_TETRAD_ROMANS = ['im7', 'iim7b5', 'IIIM7', 'ivm7', 'vm7', 'VIM7', 'VII7'] as const;
const MINOR_TETRAD_SUFFIXES = ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'] as const;

export function getCirclePositionForKey(root: string, mode: Mode): CirclePosition {
  const targetSemitone = noteToSemitone(root);
  const match = CIRCLE_POSITIONS.find((pos) => {
    const candidate = mode === 'major' ? pos.majorRoot : pos.minorRoot;
    return noteToSemitone(candidate) === targetSemitone;
  });
  return match ?? CIRCLE_POSITIONS[0];
}

export function getDiatonicTetrads(root: string, mode: Mode): DiatonicTetrad[] {
  const diatonic = getDiatonicChords(root, mode);
  const scale = buildScaleNotes(root, mode);
  const romans = mode === 'major' ? MAJOR_TETRAD_ROMANS : MINOR_TETRAD_ROMANS;
  const suffixes = mode === 'major' ? MAJOR_TETRAD_SUFFIXES : MINOR_TETRAD_SUFFIXES;

  return diatonic.map((chord, idx) => ({
    degree: chord.degree,
    roman: romans[idx],
    symbol: `${chord.root}${suffixes[idx]}`,
    triadSymbol: chord.symbol,
    notes: [
      scale[idx],
      scale[(idx + 2) % 7],
      scale[(idx + 4) % 7],
      scale[(idx + 6) % 7],
    ],
    harmonicFunction: chord.harmonicFunction,
    functionLabel: chord.functionLabel,
  }));
}

function qualityLabel(quality: ChordQuality): string {
  if (quality === 'maj') return 'mayor';
  if (quality === 'min') return 'menor';
  return 'disminuido';
}

export function compareCircleKeys(
  fromRoot: string,
  fromMode: Mode,
  toRoot: string,
  toMode: Mode,
): KeyComparison {
  const fromScale = buildScaleNotes(fromRoot, fromMode);
  const toScale = buildScaleNotes(toRoot, toMode);

  const fromSemis = fromScale.map((n) => noteToSemitone(n));
  const toSemis = toScale.map((n) => noteToSemitone(n));

  const removedNotes = fromScale.filter((_, idx) => !toSemis.includes(fromSemis[idx]));
  const addedNotes = toScale.filter((_, idx) => !fromSemis.includes(toSemis[idx]));

  const changedNotes: Array<{ removed: string; added: string }> = [];
  const usedAdded = new Set<number>();

  for (const rem of removedNotes) {
    const matchIdx = addedNotes.findIndex(
      (add, idx) => !usedAdded.has(idx) && add.charAt(0) === rem.charAt(0),
    );
    if (matchIdx !== -1) {
      usedAdded.add(matchIdx);
      changedNotes.push({ removed: rem, added: addedNotes[matchIdx] });
    } else {
      const fallbackIdx = addedNotes.findIndex((_, idx) => !usedAdded.has(idx));
      if (fallbackIdx !== -1) {
        usedAdded.add(fallbackIdx);
        changedNotes.push({ removed: rem, added: addedNotes[fallbackIdx] });
      }
    }
  }

  const fromChords = getDiatonicChords(fromRoot, fromMode);
  const toChords = getDiatonicChords(toRoot, toMode);

  const sharedChords: SharedChordLink[] = [];
  const sharedFromDegrees = new Set<number>();

  for (const cFrom of fromChords) {
    const cFromSemi = noteToSemitone(cFrom.root);
    const match = toChords.find(
      (cTo) => noteToSemitone(cTo.root) === cFromSemi && cTo.quality === cFrom.quality,
    );
    if (match) {
      sharedFromDegrees.add(cFrom.degree);
      sharedChords.push({
        fromSymbol: cFrom.symbol,
        toSymbol: match.symbol,
        fromRoman: cFrom.roman,
        toRoman: match.roman,
      });
    }
  }

  const transformedChords: TransformedChordInfo[] = [];
  for (const cFrom of fromChords) {
    if (sharedFromDegrees.has(cFrom.degree)) continue;

    const cFromSemi = noteToSemitone(cFrom.root);
    const sameRootDifferentQuality = toChords.find(
      (cTo) => noteToSemitone(cTo.root) === cFromSemi,
    );
    const sameLetterShifted = toChords.find(
      (cTo) => cTo.root.charAt(0) === cFrom.root.charAt(0),
    );
    const target = sameRootDifferentQuality ?? sameLetterShifted;
    if (target) {
      transformedChords.push({
        fromSymbol: cFrom.symbol,
        toSymbol: target.symbol,
        explanation:
          cFrom.root === target.root
            ? `${cFrom.symbol} (${qualityLabel(cFrom.quality)}) cambia a ${target.symbol} (${qualityLabel(target.quality)}).`
            : `${cFrom.symbol} se vuelve ${target.symbol} por el cambio de nota en la escala.`,
      });
    }
  }

  const pivotCandidate =
    sharedChords.find((_, idx) => {
      const chord = fromChords.find((c) => c.symbol === sharedChords[idx]?.fromSymbol);
      return (
        chord &&
        chord.quality !== 'dim' &&
        (chord.harmonicFunction === 'return' || chord.harmonicFunction === 'movement')
      );
    }) ??
    sharedChords[0] ??
    null;

  const sharedNames = sharedChords.map((c) => c.fromSymbol).join(', ');
  let summary: string;
  if (changedNotes.length === 0) {
    summary = `Relativa: comparten las 7 notas y todos los acordes (${sharedNames}).`;
  } else if (changedNotes.length === 1) {
    summary = `Comparten ${sharedChords.length} acordes (${sharedNames}). Solo cambia ${changedNotes[0].removed} → ${changedNotes[0].added}.`;
  } else {
    summary = `Comparten ${sharedChords.length} acordes (${sharedNames}). Cambian ${changedNotes
      .map((n) => `${n.removed}→${n.added}`)
      .join(', ')}.`;
  }

  return {
    fromRoot,
    fromMode,
    toRoot,
    toMode,
    sharedChords,
    changedNotes,
    transformedChords,
    suggestedPivot: pivotCandidate,
    summary,
  };
}

export function getHarmonicNeighbors(root: string, mode: Mode): HarmonicNeighbors {
  const pos = getCirclePositionForKey(root, mode);
  const domPos = CIRCLE_POSITIONS[(pos.index + 1) % 12];
  const subPos = CIRCLE_POSITIONS[(pos.index + 11) % 12];

  const domRoot = mode === 'major' ? domPos.majorRoot : domPos.minorRoot;
  const subRoot = mode === 'major' ? subPos.majorRoot : subPos.minorRoot;
  const relMode: Mode = mode === 'major' ? 'minor' : 'major';
  const relRoot = mode === 'major' ? pos.minorRoot : pos.majorRoot;

  return {
    dominant: {
      root: domRoot,
      mode,
      positionIndex: domPos.index,
      comparison: compareCircleKeys(root, mode, domRoot, mode),
    },
    subdominant: {
      root: subRoot,
      mode,
      positionIndex: subPos.index,
      comparison: compareCircleKeys(root, mode, subRoot, mode),
    },
    relative: {
      root: relRoot,
      mode: relMode,
      positionIndex: pos.index,
      comparison: compareCircleKeys(root, mode, relRoot, relMode),
    },
  };
}
