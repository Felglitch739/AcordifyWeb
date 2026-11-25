export type Mode = 'major' | 'minor';

export type MoodId = 'calm' | 'melancholic' | 'nostalgic' | 'bright' | 'energetic';

export type HarmonicFunction = 'rest' | 'movement' | 'tension' | 'return';

export type ChordQuality = 'maj' | 'min' | 'dim';

export interface DiatonicChord {
  degree: number; // 1..7
  roman: string;
  symbol: string;
  root: string;
  quality: ChordQuality;
  notes: [string, string, string];
  harmonicFunction: HarmonicFunction;
  functionLabel: string;
  explanation: string;
}

export interface ProgressionSlot {
  slotIndex: number; // 0..3
  chord: DiatonicChord;
  roleHint: string;
}

export interface GeneratedProgression {
  keyRoot: string;
  mode: Mode;
  mood: MoodId;
  templateName: string;
  degrees: number[];
  slots: ProgressionSlot[];
  scaleNotes: string[];
  suggestedBpm: number;
}

export interface ReplacementSuggestion {
  chord: DiatonicChord;
  moodEffect: string;
  isRecommended: boolean;
}

export interface MoodOption {
  id: MoodId;
  label: string;
  description: string;
  defaultBpm: number;
}

export interface KeyOption {
  root: string;
  solfege: string;
  label: string;
}
