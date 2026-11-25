import { getDiatonicChords } from './diatonic';
import { noteToSemitone } from './notes';
import type { DiatonicChord, Mode } from './types';

export type PracticeScaleId = 'minor-pentatonic' | 'major-pentatonic' | 'minor-blues';

export interface PracticeScaleDefinition {
  id: PracticeScaleId;
  name: string;
  shortLabel: string;
  intervals: readonly number[];
  degreeLabels: readonly string[];
  description: string;
  compatibleMode: Mode;
}

export interface ScaleBoxNote {
  id: string;
  stringNumber: 6 | 5 | 4 | 3 | 2 | 1;
  fret: number;
  midi: number;
  noteName: string;
  scientificNote: string;
  degreeLabel: string;
  finger: 0 | 1 | 2 | 3 | 4;
  order: number;
  isRoot: boolean;
  isBlueNote: boolean;
}

export interface ScaleBox {
  boxNumber: 1 | 2 | 3 | 4 | 5;
  startFret: number;
  endFret: number;
  rootString: number;
  rootFret: number;
  startInstruction: string;
  notes: ScaleBoxNote[];
  ascendingSteps: ScaleBoxNote[];
}

export const SCALE_ROOTS: readonly string[] = [
  'A',
  'E',
  'D',
  'G',
  'C',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
] as const;

export const PRACTICE_SCALES: readonly PracticeScaleDefinition[] = [
  {
    id: 'minor-pentatonic',
    name: 'Pentatónica menor',
    shortLabel: 'Menor pentatónica',
    intervals: [0, 3, 5, 7, 10],
    degreeLabels: ['R', 'b3', '4', '5', 'b7'],
    description: '5 notas sin choques armónicos. Base directa para rock, pop y blues.',
    compatibleMode: 'minor',
  },
  {
    id: 'major-pentatonic',
    name: 'Pentatónica mayor',
    shortLabel: 'Mayor pentatónica',
    intervals: [0, 2, 4, 7, 9],
    degreeLabels: ['R', '2', '3', '5', '6'],
    description: 'Sonido abierto y luminoso ideal para folk, country y baladas acústicas.',
    compatibleMode: 'major',
  },
  {
    id: 'minor-blues',
    name: 'Blues menor',
    shortLabel: 'Blues menor',
    intervals: [0, 3, 5, 6, 7, 10],
    degreeLabels: ['R', 'b3', '4', 'b5', '5', 'b7'],
    description: 'La pentatónica menor más la nota azul (b5) de paso entre los grados 4 y 5.',
    compatibleMode: 'minor',
  },
] as const;

const OPEN_STRING_MIDIS = [40, 45, 50, 55, 59, 64] as const; // 6ª..1ª (E2..E4)
const STRING_NUMBERS = [6, 5, 4, 3, 2, 1] as const;

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const FLAT_PREFERRED_ROOTS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'D', 'G', 'C']);

interface BoxTemplate {
  boxNumber: 1 | 2 | 3 | 4 | 5;
  fingerBaseOffset: number;
  // Relative offsets per string [6ª..1ª] from minor pentatonic Caja 1 anchor fret
  stringOffsets: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ];
}

const PENTATONIC_BOX_TEMPLATES: readonly BoxTemplate[] = [
  {
    boxNumber: 1,
    fingerBaseOffset: 0,
    stringOffsets: [
      [0, 3],
      [0, 2],
      [0, 2],
      [0, 2],
      [0, 3],
      [0, 3],
    ],
  },
  {
    boxNumber: 2,
    fingerBaseOffset: 2,
    stringOffsets: [
      [3, 5],
      [2, 5],
      [2, 5],
      [2, 4],
      [3, 5],
      [3, 5],
    ],
  },
  {
    boxNumber: 3,
    fingerBaseOffset: 5,
    stringOffsets: [
      [5, 7],
      [5, 7],
      [5, 7],
      [4, 7],
      [5, 8],
      [5, 7],
    ],
  },
  {
    boxNumber: 4,
    fingerBaseOffset: 7,
    stringOffsets: [
      [7, 10],
      [7, 10],
      [7, 9],
      [7, 9],
      [8, 10],
      [7, 10],
    ],
  },
  {
    boxNumber: 5,
    fingerBaseOffset: 9,
    stringOffsets: [
      [10, 12],
      [10, 12],
      [9, 12],
      [9, 12],
      [10, 12],
      [10, 12],
    ],
  },
] as const;

function intervalToDegreeLabel(semitoneDiff: number, scaleDef: PracticeScaleDefinition): string {
  const idx = scaleDef.intervals.indexOf(semitoneDiff);
  if (idx !== -1) {
    return scaleDef.degreeLabels[idx];
  }
  return '';
}

function getNoteSpelling(midi: number, root: string): { noteName: string; scientificNote: string } {
  const useFlats = root.includes('b') || FLAT_PREFERRED_ROOTS.has(root);
  const index = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const noteName = (useFlats ? FLAT_NOTES : SHARP_NOTES)[index];
  return {
    noteName,
    scientificNote: `${noteName}${octave}`,
  };
}

export function buildScaleBoxes(root: string, scaleId: PracticeScaleId): ScaleBox[] {
  const scaleDef = PRACTICE_SCALES.find((s) => s.id === scaleId) ?? PRACTICE_SCALES[0];
  const rootSemitone = noteToSemitone(root);

  // Align CAGED 5 shapes smoothly: Major pentatonic shares exact neck geometry of its relative minor (root - 3 semitones)
  const minorShapeRootSemitone =
    scaleId === 'major-pentatonic' ? (rootSemitone + 9) % 12 : rootSemitone;

  // 6th string open is E (semitone 4)
  const anchorFret = (minorShapeRootSemitone - 4 + 12) % 12;

  return PENTATONIC_BOX_TEMPLATES.map((template) => {
    const rawFretsFlat: number[] = [];
    for (const pair of template.stringOffsets) {
      rawFretsFlat.push(anchorFret + pair[0], anchorFret + pair[1]);
    }
    const rawMin = Math.min(...rawFretsFlat);
    const octaveShift = rawMin >= 12 ? -12 : rawMin < 0 ? 12 : 0;

    const minFret = Math.min(...rawFretsFlat.map((f) => f + octaveShift));
    const maxFret = Math.max(...rawFretsFlat.map((f) => f + octaveShift));
    const handPosition = Math.max(1, template.fingerBaseOffset + anchorFret + octaveShift);

    const rawNotes: Array<Omit<ScaleBoxNote, 'order'>> = [];

    for (let strIdx = 0; strIdx < 6; strIdx++) {
      const stringNumber = STRING_NUMBERS[strIdx];
      const openMidi = OPEN_STRING_MIDIS[strIdx];
      const pair = template.stringOffsets[strIdx];
      const stringFrets = [
        anchorFret + pair[0] + octaveShift,
        anchorFret + pair[1] + octaveShift,
      ];

      if (scaleId === 'minor-blues') {
        for (let f = minFret; f <= maxFret; f++) {
          const midi = openMidi + f;
          const diff = ((midi - rootSemitone) % 12 + 12) % 12;
          if (diff === 6 && !stringFrets.includes(f)) {
            stringFrets.push(f);
          }
        }
        stringFrets.sort((a, b) => a - b);
      }

      for (const fret of stringFrets) {
        const midi = openMidi + fret;
        const diff = ((midi - rootSemitone) % 12 + 12) % 12;
        const degreeLabel = intervalToDegreeLabel(diff, scaleDef);
        const finger: 0 | 1 | 2 | 3 | 4 =
          fret === 0
            ? 0
            : (Math.max(1, Math.min(4, fret - handPosition + 1)) as 1 | 2 | 3 | 4);
        const { noteName, scientificNote } = getNoteSpelling(midi, root);

        rawNotes.push({
          id: `b${template.boxNumber}-s${stringNumber}-f${fret}`,
          stringNumber,
          fret,
          midi,
          noteName,
          scientificNote,
          degreeLabel,
          finger,
          isRoot: diff === 0,
          isBlueNote: scaleId === 'minor-blues' && diff === 6,
        });
      }
    }

    // Order strictly ascending in pitch (and string 6 -> 1 for any tie)
    const sortedAsc = [...rawNotes].sort((a, b) => {
      if (a.midi !== b.midi) return a.midi - b.midi;
      return b.stringNumber - a.stringNumber;
    });

    const orderById = new Map<string, number>();
    sortedAsc.forEach((n, idx) => {
      orderById.set(n.id, idx + 1);
    });

    const notes: ScaleBoxNote[] = rawNotes.map((n) => ({
      ...n,
      order: orderById.get(n.id) ?? 1,
    }));

    const ascendingSteps: ScaleBoxNote[] = sortedAsc.map((n, idx) => ({
      ...n,
      order: idx + 1,
    }));

    const firstRoot = ascendingSteps.find((n) => n.isRoot) ?? ascendingSteps[0];
    const modeTag =
      scaleId === 'major-pentatonic'
        ? 'mayor'
        : scaleId === 'minor-blues'
          ? 'blues'
          : 'menor';

    const rootPosText =
      firstRoot.fret === 0
        ? 'al aire'
        : `traste ${firstRoot.fret}, dedo ${firstRoot.finger}`;

    const startInstruction = `Caja ${template.boxNumber} · ${root} ${modeTag} · empieza en el traste ${minFret}, primera raíz en la ${firstRoot.stringNumber}ª cuerda (${rootPosText}).`;

    return {
      boxNumber: template.boxNumber,
      startFret: minFret,
      endFret: maxFret,
      rootString: firstRoot.stringNumber,
      rootFret: firstRoot.fret,
      startInstruction,
      notes,
      ascendingSteps,
    };
  });
}

export function getScaleCompatibleChords(
  root: string,
  scaleId: PracticeScaleId,
): DiatonicChord[] {
  const scaleDef = PRACTICE_SCALES.find((s) => s.id === scaleId) ?? PRACTICE_SCALES[0];
  return getDiatonicChords(root, scaleDef.compatibleMode);
}
