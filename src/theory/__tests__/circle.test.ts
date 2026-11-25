import { describe, expect, it } from 'vitest';
import {
  CIRCLE_POSITIONS,
  compareCircleKeys,
  getCirclePositionForKey,
  getDiatonicTetrads,
  getHarmonicNeighbors,
} from '../circle';

describe('Circle of Fifths harmonic engine', () => {
  it('resolves all 12 clockwise positions in major and minor', () => {
    expect(CIRCLE_POSITIONS).toHaveLength(12);
    for (const pos of CIRCLE_POSITIONS) {
      expect(getCirclePositionForKey(pos.majorRoot, 'major').index).toBe(pos.index);
      expect(getCirclePositionForKey(pos.minorRoot, 'minor').index).toBe(pos.index);
    }
    expect(getCirclePositionForKey('Gb', 'major').index).toBe(6);
  });

  it('finds exact 4 shared chords and F -> F# change between C Major and G Major', () => {
    const cmp = compareCircleKeys('C', 'major', 'G', 'major');
    expect(cmp.sharedChords.map((c) => c.fromSymbol)).toEqual(['C', 'Em', 'G', 'Am']);
    expect(cmp.changedNotes).toEqual([{ removed: 'F', added: 'F#' }]);
    expect(cmp.suggestedPivot).not.toBeNull();
    expect(cmp.summary).toContain('Comparten 4 acordes');
    expect(cmp.summary).toContain('F → F#');
  });

  it('explains G Major -> D Major shift and C -> C#dim transformation', () => {
    const neighbors = getHarmonicNeighbors('G', 'major');
    expect(neighbors.dominant.root).toBe('D');
    expect(neighbors.subdominant.root).toBe('C');
    expect(neighbors.relative.root).toBe('E');
    expect(neighbors.relative.mode).toBe('minor');

    const domCmp = neighbors.dominant.comparison;
    expect(domCmp.changedNotes).toEqual([{ removed: 'C', added: 'C#' }]);
    expect(domCmp.sharedChords.map((c) => c.fromSymbol)).toEqual(['G', 'Bm', 'D', 'Em']);
    expect(domCmp.transformedChords.some((t) => t.fromSymbol === 'C' && t.toSymbol === 'C#dim')).toBe(
      true,
    );
  });

  it('shares all 7 chords with the relative minor key', () => {
    const cmp = compareCircleKeys('C', 'major', 'A', 'minor');
    expect(cmp.sharedChords).toHaveLength(7);
    expect(cmp.changedNotes).toEqual([]);
  });

  it('builds diatonic tetrads matching 7th chord harmonies', () => {
    const tetrads = getDiatonicTetrads('C', 'major');
    expect(tetrads.map((t) => t.symbol)).toEqual([
      'Cmaj7',
      'Dm7',
      'Em7',
      'Fmaj7',
      'G7',
      'Am7',
      'Bm7b5',
    ]);
    expect(tetrads.map((t) => t.roman)).toEqual([
      'IM7',
      'iim7',
      'iiim7',
      'IVM7',
      'V7',
      'vim7',
      'viim7b5',
    ]);
  });
});
