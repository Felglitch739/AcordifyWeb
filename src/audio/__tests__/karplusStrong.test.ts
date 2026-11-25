import { describe, expect, it } from 'vitest';
import { noteNameToFrequency, synthesizePluckedStringBuffer } from '../karplusStrong';
import { computeRms } from '../pitchDetector';

describe('noteNameToFrequency', () => {
  it('converts standard reference pitches accurately', () => {
    expect(noteNameToFrequency('A4')).toBeCloseTo(440, 2);
    expect(noteNameToFrequency('E2')).toBeCloseTo(82.41, 1);
    expect(noteNameToFrequency('C4')).toBeCloseTo(261.63, 1);
    expect(noteNameToFrequency('F#3')).toBeCloseTo(185.0, 1);
    expect(noteNameToFrequency('Bb3')).toBeCloseTo(233.08, 1);
  });

  it('throws on malformed note names', () => {
    expect(() => noteNameToFrequency('H4')).toThrow();
    expect(() => noteNameToFrequency('')).toThrow();
  });
});

describe('synthesizePluckedStringBuffer', () => {
  it.each(['nylon', 'steel'] as const)(
    'produces finite bounded samples with natural decay for %s tone',
    (tone) => {
      const sampleRate = 44100;
      const durationSec = 1.2;
      const buffer = synthesizePluckedStringBuffer(sampleRate, 110, durationSec, tone, 0.85);

      expect(buffer.length).toBe(Math.round(sampleRate * durationSec));

      for (let i = 0; i < buffer.length; i++) {
        expect(Number.isFinite(buffer[i])).toBe(true);
        expect(Math.abs(buffer[i])).toBeLessThanOrEqual(1);
      }

      const headSlice = buffer.subarray(0, Math.floor(sampleRate * 0.2));
      const tailSlice = buffer.subarray(Math.floor(sampleRate * 0.8));
      const headRms = computeRms(headSlice);
      const tailRms = computeRms(tailSlice);

      expect(headRms).toBeGreaterThan(0.05);
      expect(tailRms).toBeLessThan(headRms);
    },
  );
});
