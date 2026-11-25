import { describe, expect, it } from 'vitest';
import { noteToSemitone } from '../notes';
import {
  PRACTICE_SCALES,
  SCALE_ROOTS,
  buildScaleBoxes,
  getScaleCompatibleChords,
} from '../scales';

describe('Scale Practice 5-Box Engine (Pentatonic & Blues)', () => {
  it('computes A minor pentatonic Caja 1 at fret 5 with exact 1-4/1-3 fingering and ascending order', () => {
    const boxes = buildScaleBoxes('A', 'minor-pentatonic');
    expect(boxes).toHaveLength(5);

    const box1 = boxes[0];
    expect(box1.startFret).toBe(5);
    expect(box1.endFret).toBe(8);
    expect(box1.rootString).toBe(6);
    expect(box1.rootFret).toBe(5);
    expect(box1.startInstruction).toContain('empieza en el traste 5');
    expect(box1.ascendingSteps).toHaveLength(12);
    expect(box1.ascendingSteps.map((n) => n.finger)).toEqual([
      1, 4, 1, 3, 1, 3, 1, 3, 1, 4, 1, 4,
    ]);

    for (let i = 1; i < box1.ascendingSteps.length; i++) {
      expect(box1.ascendingSteps[i].midi).toBeGreaterThanOrEqual(
        box1.ascendingSteps[i - 1].midi,
      );
      expect(box1.ascendingSteps[i].order).toBe(i + 1);
    }
  });

  it('produces valid scale pitch classes, frets (0..17), fingers (0..4), and roots across all 12 roots x 3 scales x 5 boxes', () => {
    for (const scale of PRACTICE_SCALES) {
      for (const root of SCALE_ROOTS) {
        const rootSemi = noteToSemitone(root);
        const allowedPitchClasses = new Set(scale.intervals.map((iv) => (rootSemi + iv) % 12));
        const boxes = buildScaleBoxes(root, scale.id);
        expect(boxes).toHaveLength(5);

        for (const box of boxes) {
          expect(box.notes.length).toBeGreaterThanOrEqual(12);
          expect(box.notes.some((n) => n.isRoot)).toBe(true);

          for (const note of box.notes) {
            expect(note.fret).toBeGreaterThanOrEqual(0);
            expect(note.fret).toBeLessThanOrEqual(17);
            expect(note.finger).toBeGreaterThanOrEqual(0);
            expect(note.finger).toBeLessThanOrEqual(4);
            expect(allowedPitchClasses.has(note.midi % 12)).toBe(true);
          }
        }
      }
    }
  });

  it('adds b5 blue notes cleanly in minor-blues', () => {
    const bluesBoxes = buildScaleBoxes('A', 'minor-blues');
    const blueNotes = bluesBoxes[0].notes.filter((n) => n.isBlueNote);
    expect(blueNotes.length).toBeGreaterThanOrEqual(2);
    expect(blueNotes.every((n) => n.degreeLabel === 'b5')).toBe(true);
  });

  it('aligns C major pentatonic notes with A minor pentatonic while marking C as root', () => {
    const cMajBoxes = buildScaleBoxes('C', 'major-pentatonic');
    const aMinBoxes = buildScaleBoxes('A', 'minor-pentatonic');

    expect(cMajBoxes[0].startFret).toBe(aMinBoxes[0].startFret);
    const cRoots = cMajBoxes[0].notes.filter((n) => n.isRoot);
    expect(cRoots.length).toBeGreaterThanOrEqual(2);
    expect(cRoots.every((n) => n.noteName === 'C')).toBe(true);

    const compatible = getScaleCompatibleChords('C', 'major-pentatonic');
    expect(compatible[0].symbol).toBe('C');
  });
});
