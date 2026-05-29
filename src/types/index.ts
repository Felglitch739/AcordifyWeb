export interface SongConcept {
  mood: string;
  chords: string[];
  scale: string;
  lyrics: string;
  hasContinued: boolean;
}

export type ChordGenerationMode = 'major' | 'minor';
export type ChordGenerationComplexity = 'basic' | 'intermediate' | 'advanced';

export interface GeneratedChord {
  symbol: string;
  durationBars: 1 | 2;
  rationale: string;
}

export interface ChordGenerationResponse {
  key: string;
  mode: ChordGenerationMode;
  bpm: number;
  chords: GeneratedChord[];
  moodTag: string;
  noveltyScore: number;
}
