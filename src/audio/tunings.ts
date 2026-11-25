import type { GuitarStringInfo } from './pitchDetector';

export type TuningPresetId =
  | 'standard'
  | 'half-down'
  | 'full-down'
  | 'drop-d'
  | 'dadgad'
  | 'open-g'
  | 'open-d'
  | 'open-e'
  | 'drop-c'
  | 'custom';

export type SixStringMidis = readonly [number, number, number, number, number, number];

export interface TuningPreset {
  id: TuningPresetId;
  name: string;
  shortLabel: string;
  description: string;
  midis: SixStringMidis;
  preferFlats?: boolean;
}

export interface CustomTuningSaved {
  id: string;
  name: string;
  midis: [number, number, number, number, number, number];
  createdAt: string;
}

export const MIN_TUNING_SHIFT = -5;
export const MAX_TUNING_SHIFT = 4;
export const MIN_STRING_MIDI = 33; // A1 (55 Hz)
export const MAX_STRING_MIDI = 72; // C5 (523.25 Hz)

export const STANDARD_MIDIS: SixStringMidis = [40, 45, 50, 55, 59, 64] as const;

export const TUNING_PRESETS: readonly TuningPreset[] = [
  {
    id: 'standard',
    name: 'Estándar',
    shortLabel: 'E A D G B e',
    description: 'Afinación clásica de 6 cuerdas para cualquier género.',
    midis: [40, 45, 50, 55, 59, 64],
  },
  {
    id: 'half-down',
    name: '½ tono abajo (Eb)',
    shortLabel: 'Eb Ab Db Gb Bb eb',
    description: 'Más grave y suave para cantar sin forzar la voz.',
    midis: [39, 44, 49, 54, 58, 63],
    preferFlats: true,
  },
  {
    id: 'full-down',
    name: '1 tono abajo (D)',
    shortLabel: 'D G C F A d',
    description: 'Sonido más grueso y oscuro bajando todas las cuerdas un tono.',
    midis: [38, 43, 48, 53, 57, 62],
    preferFlats: true,
  },
  {
    id: 'drop-d',
    name: 'Drop D',
    shortLabel: 'D A D G B e',
    description: 'Solo baja la 6ª cuerda a Re para graves profundos.',
    midis: [38, 45, 50, 55, 59, 64],
  },
  {
    id: 'dadgad',
    name: 'DADGAD',
    shortLabel: 'D A D G A d',
    description: 'Modal abierto muy usado en folk, fingerstyle y acústico.',
    midis: [38, 45, 50, 55, 57, 62],
  },
  {
    id: 'open-g',
    name: 'Open G',
    shortLabel: 'D G D G B d',
    description: 'Al rasguear al aire suena Sol mayor completo.',
    midis: [38, 43, 50, 55, 59, 62],
  },
  {
    id: 'open-d',
    name: 'Open D',
    shortLabel: 'D A D F# A d',
    description: 'Acorde resonante de Re mayor al aire, ideal para slide y folk.',
    midis: [38, 45, 50, 54, 57, 62],
  },
  {
    id: 'open-e',
    name: 'Open E',
    shortLabel: 'E B E G# B e',
    description: 'Brillante en Mi mayor abierto sin perder tensión en agudos.',
    midis: [40, 47, 52, 56, 59, 64],
  },
  {
    id: 'drop-c',
    name: 'Drop C',
    shortLabel: 'C G C F A d',
    description: 'Afinación muy grave y potente con la 6ª en Do.',
    midis: [36, 43, 48, 53, 57, 62],
  },
  {
    id: 'custom',
    name: 'Personalizada',
    shortLabel: 'A medida',
    description: 'Ajusta cada cuerda nota por nota a tu gusto.',
    midis: [40, 45, 50, 55, 59, 64],
  },
] as const;

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const SPANISH_SHARP = [
  'Do',
  'Do#',
  'Re',
  'Re#',
  'Mi',
  'Fa',
  'Fa#',
  'Sol',
  'Sol#',
  'La',
  'La#',
  'Si',
] as const;

const SPANISH_FLAT = [
  'Do',
  'Reb',
  'Re',
  'Mib',
  'Mi',
  'Fa',
  'Solb',
  'Sol',
  'Lab',
  'La',
  'Sib',
  'Si',
] as const;

const STRING_NUMBERS = [6, 5, 4, 3, 2, 1] as const;
const CUSTOM_TUNINGS_STORAGE_KEY = 'acordify:custom-tunings:v1';

export function clampStringMidi(midi: number): number {
  return Math.max(MIN_STRING_MIDI, Math.min(MAX_STRING_MIDI, Math.round(midi)));
}

export function midiToFrequency(midi: number): number {
  return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));
}

export function midiToNoteParts(
  midi: number,
  preferFlats = false,
): { noteName: string; octave: number; spanishNote: string; frequency: number } {
  const safeMidi = clampStringMidi(midi);
  const index = ((safeMidi % 12) + 12) % 12;
  const octave = Math.floor(safeMidi / 12) - 1;
  const noteName = (preferFlats ? FLAT_NOTES : SHARP_NOTES)[index];
  const spanishNote = (preferFlats ? SPANISH_FLAT : SPANISH_SHARP)[index];
  return {
    noteName,
    octave,
    spanishNote,
    frequency: midiToFrequency(safeMidi),
  };
}

export function buildTuningStrings(
  midis: SixStringMidis,
  semitoneShift = 0,
  preferFlats?: boolean,
): GuitarStringInfo[] {
  const effectiveFlats = preferFlats ?? semitoneShift < 0;

  return STRING_NUMBERS.map((stringNumber, idx) => {
    const shiftedMidi = clampStringMidi(midis[idx] + semitoneShift);
    const { noteName, octave, spanishNote, frequency } = midiToNoteParts(
      shiftedMidi,
      effectiveFlats,
    );
    const isStandardFirstE = stringNumber === 1 && noteName === 'E' && octave === 4;
    const isStandardSixthE = stringNumber === 6 && noteName === 'E' && octave === 2;

    const label = isStandardFirstE ? 'e' : noteName;
    const spanishName = isStandardSixthE
      ? '6ª · Mi grave'
      : isStandardFirstE
        ? '1ª · Mi aguda'
        : `${stringNumber}ª · ${spanishNote} (${noteName}${octave})`;

    return {
      stringNumber,
      midi: shiftedMidi,
      label,
      spanishName,
      noteName,
      octave,
      frequency,
    };
  });
}

export function formatTuningSequence(strings: readonly GuitarStringInfo[]): string {
  return strings.map((s) => s.label).join(' ');
}

export function formatSemitoneShift(shift: number): string {
  if (shift === 0) return '0';
  const sign = shift > 0 ? '+' : '−';
  const abs = Math.abs(shift);
  if (abs === 1) return `${sign}½ tono`;
  if (abs === 2) return `${sign}1 tono`;
  if (abs === 3) return `${sign}1½ tonos`;
  if (abs === 4) return `${sign}2 tonos`;
  return `${sign}2½ tonos`;
}

function isValidSixMidis(val: unknown): val is [number, number, number, number, number, number] {
  return (
    Array.isArray(val) &&
    val.length === 6 &&
    val.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

export function listSavedCustomTunings(): CustomTuningSaved[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TUNINGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is CustomTuningSaved => {
      if (!item || typeof item !== 'object') return false;
      const obj = item as Partial<CustomTuningSaved>;
      return (
        typeof obj.id === 'string' &&
        typeof obj.name === 'string' &&
        isValidSixMidis(obj.midis) &&
        typeof obj.createdAt === 'string'
      );
    });
  } catch {
    return [];
  }
}

export function saveCustomTuning(
  name: string,
  midis: SixStringMidis,
): CustomTuningSaved {
  const cleanName = name.trim().slice(0, 48) || 'Mi afinación';
  const clampedMidis: [number, number, number, number, number, number] = [
    clampStringMidi(midis[0]),
    clampStringMidi(midis[1]),
    clampStringMidi(midis[2]),
    clampStringMidi(midis[3]),
    clampStringMidi(midis[4]),
    clampStringMidi(midis[5]),
  ];

  const entry: CustomTuningSaved = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    midis: clampedMidis,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const existing = listSavedCustomTunings().filter((item) => item.name !== cleanName);
      const next = [entry, ...existing].slice(0, 20);
      window.localStorage.setItem(CUSTOM_TUNINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota / restriction errors
    }
  }

  return entry;
}

export function deleteCustomTuning(id: string): CustomTuningSaved[] {
  const remaining = listSavedCustomTunings().filter((item) => item.id !== id);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CUSTOM_TUNINGS_STORAGE_KEY, JSON.stringify(remaining));
    } catch {
      // Ignore storage errors
    }
  }
  return remaining;
}
