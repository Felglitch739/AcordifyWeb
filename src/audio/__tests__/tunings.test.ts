import { beforeEach, describe, expect, it } from 'vitest';
import {
  STANDARD_MIDIS,
  TUNING_PRESETS,
  buildTuningStrings,
  deleteCustomTuning,
  detectPitchYin,
  formatSemitoneShift,
  frequencyToTuningReading,
  listSavedCustomTunings,
  saveCustomTuning,
} from '../index';

function generateWave(freq: number, sampleRate: number, length: number): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    buffer[i] =
      0.5 * Math.sin(2 * Math.PI * freq * t) +
      0.25 * Math.sin(2 * Math.PI * freq * 2 * t);
  }
  return buffer;
}

describe('guitar tuning presets, transpose, and custom builder', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds all presets with 6 accurate strings and expected intervals', () => {
    for (const preset of TUNING_PRESETS) {
      const strings = buildTuningStrings(preset.midis, 0, preset.preferFlats);
      expect(strings).toHaveLength(6);
      expect(strings.map((s) => s.stringNumber)).toEqual([6, 5, 4, 3, 2, 1]);
      for (const s of strings) {
        expect(s.frequency).toBeGreaterThan(50);
        expect(s.frequency).toBeLessThan(600);
      }
    }

    const dadgad = TUNING_PRESETS.find((p) => p.id === 'dadgad')!;
    const dadgadStrings = buildTuningStrings(dadgad.midis);
    expect(dadgadStrings.map((s) => `${s.noteName}${s.octave}`)).toEqual([
      'D2',
      'A2',
      'D3',
      'G3',
      'A3',
      'D4',
    ]);

    const dropD = TUNING_PRESETS.find((p) => p.id === 'drop-d')!;
    const dropDStrings = buildTuningStrings(dropD.midis);
    expect(dropDStrings.map((s) => `${s.noteName}${s.octave}`)).toEqual([
      'D2',
      'A2',
      'D3',
      'G3',
      'B3',
      'E4',
    ]);

    const dropC = TUNING_PRESETS.find((p) => p.id === 'drop-c')!;
    const dropCStrings = buildTuningStrings(dropC.midis);
    expect(dropCStrings.map((s) => `${s.noteName}${s.octave}`)).toEqual([
      'C2',
      'G2',
      'C3',
      'F3',
      'A3',
      'D4',
    ]);
  });

  it('transposes standard tuning cleanly by semitones', () => {
    const downHalf = buildTuningStrings(STANDARD_MIDIS, -1);
    expect(downHalf.map((s) => `${s.noteName}${s.octave}`)).toEqual([
      'Eb2',
      'Ab2',
      'Db3',
      'Gb3',
      'Bb3',
      'Eb4',
    ]);

    const upHalf = buildTuningStrings(STANDARD_MIDIS, 1);
    expect(upHalf.map((s) => `${s.noteName}${s.octave}`)).toEqual([
      'F2',
      'A#2',
      'D#3',
      'G#3',
      'C4',
      'F4',
    ]);

    expect(formatSemitoneShift(0)).toBe('0');
    expect(formatSemitoneShift(-1)).toBe('−½ tono');
    expect(formatSemitoneShift(-2)).toBe('−1 tono');
    expect(formatSemitoneShift(1)).toBe('+½ tono');
  });

  it('matches Auto-mode frequencies against alternate tunings like DADGAD and Drop C', () => {
    const dadgad = TUNING_PRESETS.find((p) => p.id === 'dadgad')!;
    const dadgadStrings = buildTuningStrings(dadgad.midis);

    const lowD = frequencyToTuningReading(73.42, null, dadgadStrings);
    expect(lowD.targetString.stringNumber).toBe(6);
    expect(lowD.status).toBe('in-tune');

    const secondStringA3 = frequencyToTuningReading(220.0, null, dadgadStrings);
    expect(secondStringA3.targetString.stringNumber).toBe(2);
    expect(secondStringA3.status).toBe('in-tune');

    const dropC = TUNING_PRESETS.find((p) => p.id === 'drop-c')!;
    const dropCStrings = buildTuningStrings(dropC.midis);
    const lowC = frequencyToTuningReading(65.41, null, dropCStrings);
    expect(lowC.targetString.stringNumber).toBe(6);
    expect(lowC.status).toBe('in-tune');
  });

  it('detects low C2 (65.41 Hz) and B1 (61.74 Hz) accurately with YIN minFreq 48', () => {
    const sampleRate = 48000;
    const length = 4096;

    const c2Result = detectPitchYin(generateWave(65.41, sampleRate, length), sampleRate, {
      minFreq: 48,
      maxFreq: 720,
    });
    expect(c2Result).not.toBeNull();
    if (c2Result) {
      expect(Math.abs(1200 * Math.log2(c2Result.frequency / 65.41))).toBeLessThan(6);
    }

    const b1Result = detectPitchYin(generateWave(61.74, sampleRate, length), sampleRate, {
      minFreq: 48,
      maxFreq: 720,
    });
    expect(b1Result).not.toBeNull();
    if (b1Result) {
      expect(Math.abs(1200 * Math.log2(b1Result.frequency / 61.74))).toBeLessThan(6);
    }
  });

  it('saves, lists, and deletes custom tunings in localStorage', () => {
    expect(listSavedCustomTunings()).toEqual([]);

    const saved = saveCustomTuning('Acústica abierta', [38, 45, 50, 54, 57, 62]);
    const list = listSavedCustomTunings();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(saved.id);
    expect(list[0].name).toBe('Acústica abierta');
    expect(list[0].midis).toEqual([38, 45, 50, 54, 57, 62]);

    const afterDelete = deleteCustomTuning(saved.id);
    expect(afterDelete).toEqual([]);
  });
});
