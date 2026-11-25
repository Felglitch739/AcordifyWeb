import { beforeEach, describe, expect, it } from 'vitest';
import {
  decodeProgressionFromQuery,
  deleteProgression,
  encodeProgressionToQuery,
  listSavedProgressions,
  saveProgression,
} from '../progressions';

describe('local progression storage and URL sharing', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves, lists in newest-first order, and deletes progressions cleanly', () => {
    expect(listSavedProgressions()).toEqual([]);

    const first = saveProgression({
      name: 'Canción de lluvia',
      keyRoot: 'G',
      mode: 'major',
      mood: 'calm',
      bpm: 76,
      degrees: [1, 5, 6, 4],
      chordSymbols: ['G', 'D', 'Em', 'C'],
    });

    const second = saveProgression({
      name: 'Noche en la menor',
      keyRoot: 'A',
      mode: 'minor',
      mood: 'melancholic',
      bpm: 72,
      degrees: [1, 6, 3, 7],
      chordSymbols: ['Am', 'F', 'C', 'G'],
    });

    const list = listSavedProgressions();
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.id)).toContain(first.id);
    expect(list.map((p) => p.id)).toContain(second.id);

    const afterDelete = deleteProgression(first.id);
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe(second.id);
  });

  it('ignores corrupted localStorage data safely', () => {
    window.localStorage.setItem('acordify_saved_progressions_v1', '{invalid-json');
    expect(listSavedProgressions()).toEqual([]);

    window.localStorage.setItem(
      'acordify_saved_progressions_v1',
      JSON.stringify([{ id: 'bad', name: 123 }]),
    );
    expect(listSavedProgressions()).toEqual([]);
  });

  it('encodes and decodes shareable URL query state accurately', () => {
    const state = {
      keyRoot: 'Bb',
      mode: 'major' as const,
      mood: 'nostalgic' as const,
      bpm: 84,
      degrees: [1, 6, 4, 5],
    };

    const query = encodeProgressionToQuery(state);
    const decoded = decodeProgressionFromQuery(query);
    expect(decoded).toEqual(state);
  });

  it('rejects invalid URL query parameters', () => {
    expect(decodeProgressionFromQuery('')).toBeNull();
    expect(decodeProgressionFromQuery('?k=H&m=major&mood=calm&bpm=80&d=1,5,6,4')).toBeNull();
    expect(decodeProgressionFromQuery('?k=C&m=dorian&mood=calm&bpm=80&d=1,5,6,4')).toBeNull();
    expect(decodeProgressionFromQuery('?k=C&m=major&mood=calm&bpm=80&d=1,8,6,4')).toBeNull();
  });
});
