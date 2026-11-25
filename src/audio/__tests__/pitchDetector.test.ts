import { describe, expect, it } from 'vitest';
import {
  GUITAR_STRINGS,
  computeRms,
  detectPitchYin,
  frequencyToTuningReading,
  median,
} from '../pitchDetector';

function generateWave(
  freq: number,
  sampleRate: number,
  length: number,
  harmonicAmp = 0,
): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    buffer[i] =
      0.5 * Math.sin(2 * Math.PI * freq * t) +
      harmonicAmp * Math.sin(2 * Math.PI * (freq * 2) * t) +
      harmonicAmp * 0.4 * Math.sin(2 * Math.PI * (freq * 3) * t);
  }
  return buffer;
}

describe('YIN guitar pitch detector', () => {
  const sampleRate = 48000;
  const bufferSize = 4096;

  it('returns null for silence or sub-threshold signal', () => {
    const silence = new Float32Array(bufferSize);
    expect(computeRms(silence)).toBe(0);
    expect(detectPitchYin(silence, sampleRate)).toBeNull();

    const quietNoise = new Float32Array(bufferSize).fill(0.001);
    expect(detectPitchYin(quietNoise, sampleRate)).toBeNull();
  });

  it('detects all 6 standard guitar string frequencies accurately on pure sine waves', () => {
    for (const guitarString of GUITAR_STRINGS) {
      const buffer = generateWave(guitarString.frequency, sampleRate, bufferSize);
      const result = detectPitchYin(buffer, sampleRate);

      expect(result).not.toBeNull();
      if (result) {
        const centsError = Math.abs(1200 * Math.log2(result.frequency / guitarString.frequency));
        expect(centsError).toBeLessThan(5);
        expect(result.clarity).toBeGreaterThan(0.85);
      }
    }
  });

  it('avoids octave-doubling errors on harmonic-rich signals (fundamental + strong 2nd/3rd harmonics)', () => {
    for (const guitarString of GUITAR_STRINGS) {
      const buffer = generateWave(guitarString.frequency, sampleRate, bufferSize, 0.45);
      const result = detectPitchYin(buffer, sampleRate);

      expect(result).not.toBeNull();
      if (result) {
        const centsError = Math.abs(1200 * Math.log2(result.frequency / guitarString.frequency));
        expect(centsError).toBeLessThan(5);
      }
    }
  });

  it('computes flat, in-tune, and sharp tuning readings accurately', () => {
    const aString = GUITAR_STRINGS[1]; // A2 = 110 Hz
    const inTune = frequencyToTuningReading(110.1);
    expect(inTune.targetString.stringNumber).toBe(5);
    expect(inTune.status).toBe('in-tune');
    expect(Math.abs(inTune.cents)).toBeLessThanOrEqual(5);

    const flat = frequencyToTuningReading(108.0); // ~ -32 cents
    expect(flat.targetString.stringNumber).toBe(5);
    expect(flat.status).toBe('flat');
    expect(flat.cents).toBeLessThan(-5);

    const sharp = frequencyToTuningReading(112.0, aString); // ~ +31 cents
    expect(sharp.targetString.stringNumber).toBe(5);
    expect(sharp.status).toBe('sharp');
    expect(sharp.cents).toBeGreaterThan(5);
  });

  it('computes median cleanly for smoothing readings', () => {
    expect(median([112, 110, 220, 109, 110])).toBe(110);
    expect(median([100, 120])).toBe(110);
    expect(median([])).toBe(0);
  });
});
