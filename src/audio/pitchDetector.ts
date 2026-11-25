export interface GuitarStringInfo {
  stringNumber: 1 | 2 | 3 | 4 | 5 | 6;
  midi?: number;
  label: string;
  spanishName: string;
  noteName: string;
  octave: number;
  frequency: number;
}

export interface YinOptions {
  minFreq?: number;
  maxFreq?: number;
  threshold?: number;
  minRms?: number;
}

export interface PitchDetectionResult {
  frequency: number;
  clarity: number;
}

export type TuningStatus = 'flat' | 'in-tune' | 'sharp';

export interface TuningReading {
  frequency: number;
  detectedNote: string;
  detectedOctave: number;
  targetString: GuitarStringInfo;
  cents: number;
  status: TuningStatus;
}

export const GUITAR_STRINGS: readonly GuitarStringInfo[] = [
  { stringNumber: 6, midi: 40, label: 'E', spanishName: '6ª · Mi grave', noteName: 'E', octave: 2, frequency: 82.41 },
  { stringNumber: 5, midi: 45, label: 'A', spanishName: '5ª · La', noteName: 'A', octave: 2, frequency: 110.0 },
  { stringNumber: 4, midi: 50, label: 'D', spanishName: '4ª · Re', noteName: 'D', octave: 3, frequency: 146.83 },
  { stringNumber: 3, midi: 55, label: 'G', spanishName: '3ª · Sol', noteName: 'G', octave: 3, frequency: 196.0 },
  { stringNumber: 2, midi: 59, label: 'B', spanishName: '2ª · Si', noteName: 'B', octave: 3, frequency: 246.94 },
  { stringNumber: 1, midi: 64, label: 'e', spanishName: '1ª · Mi aguda', noteName: 'E', octave: 4, frequency: 329.63 },
] as const;

const CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const CHROMATIC_NOTES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export function computeRms(buffer: Float32Array): number {
  if (buffer.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    const sample = buffer[i];
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / buffer.length);
}

/**
 * Detects fundamental pitch frequency using the YIN algorithm (difference
 * function + cumulative mean normalized difference + parabolic interpolation).
 */
export function detectPitchYin(
  buffer: Float32Array,
  sampleRate: number,
  options: YinOptions = {},
): PitchDetectionResult | null {
  const minFreq = options.minFreq ?? 48;
  const maxFreq = options.maxFreq ?? 1000;
  const threshold = options.threshold ?? 0.15;
  const minRms = options.minRms ?? 0.01;

  if (buffer.length < 32 || sampleRate <= 0) {
    return null;
  }

  const rms = computeRms(buffer);
  if (rms < minRms) {
    return null;
  }

  const halfSize = Math.floor(buffer.length / 2);
  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));
  const maxTau = Math.min(halfSize - 1, Math.ceil(sampleRate / minFreq));

  if (maxTau <= minTau) {
    return null;
  }

  const cmndf = new Float32Array(maxTau + 1);
  cmndf[0] = 1;

  let runningSum = 0;

  for (let tau = 1; tau <= maxTau; tau++) {
    let diff = 0;
    for (let j = 0; j < halfSize; j++) {
      const delta = buffer[j] - buffer[j + tau];
      diff += delta * delta;
    }

    runningSum += diff;
    cmndf[tau] = runningSum > 0 ? (diff * tau) / runningSum : 1;
  }

  let bestTau = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (cmndf[tau] < threshold) {
      while (tau + 1 <= maxTau && cmndf[tau + 1] < cmndf[tau]) {
        tau += 1;
      }
      bestTau = tau;
      break;
    }
  }

  if (bestTau === -1) {
    return null;
  }

  let refinedTau = bestTau;
  if (bestTau > 0 && bestTau < maxTau) {
    const s0 = cmndf[bestTau - 1];
    const s1 = cmndf[bestTau];
    const s2 = cmndf[bestTau + 1];
    const denominator = 2 * (s0 - 2 * s1 + s2);
    if (denominator !== 0) {
      const delta = (s0 - s2) / denominator;
      if (Number.isFinite(delta) && Math.abs(delta) < 1) {
        refinedTau = bestTau + delta;
      }
    }
  }

  if (refinedTau <= 0) {
    return null;
  }

  const frequency = sampleRate / refinedTau;
  const clarity = Math.max(0, Math.min(1, 1 - cmndf[bestTau]));

  return { frequency, clarity };
}

export function frequencyToTuningReading(
  frequency: number,
  lockedString?: GuitarStringInfo | null,
  candidateStrings: readonly GuitarStringInfo[] = GUITAR_STRINGS,
  preferFlats = false,
): TuningReading {
  const midiFloat = 69 + 12 * Math.log2(frequency / 440);
  const nearestMidi = Math.round(midiFloat);
  const notePool = preferFlats ? CHROMATIC_NOTES_FLAT : CHROMATIC_NOTES;
  const detectedNote = notePool[((nearestMidi % 12) + 12) % 12];
  const detectedOctave = Math.floor(nearestMidi / 12) - 1;

  const candidates = candidateStrings.length > 0 ? candidateStrings : GUITAR_STRINGS;
  let targetString: GuitarStringInfo;
  if (lockedString) {
    targetString = lockedString;
  } else {
    targetString = candidates[0];
    let bestAbsCents = Infinity;
    for (const candidate of candidates) {
      const absCents = Math.abs(1200 * Math.log2(frequency / candidate.frequency));
      if (absCents < bestAbsCents) {
        bestAbsCents = absCents;
        targetString = candidate;
      }
    }
  }

  const cents = Math.round(1200 * Math.log2(frequency / targetString.frequency));
  const status: TuningStatus =
    Math.abs(cents) <= 5 ? 'in-tune' : cents < 0 ? 'flat' : 'sharp';

  return {
    frequency,
    detectedNote,
    detectedOctave,
    targetString,
    cents,
    status,
  };
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}
