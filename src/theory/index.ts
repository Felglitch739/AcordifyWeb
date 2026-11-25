export type {
  ChordQuality,
  DiatonicChord,
  GeneratedProgression,
  HarmonicFunction,
  KeyOption,
  Mode,
  MoodId,
  MoodOption,
  ProgressionSlot,
  ReplacementSuggestion,
} from './types';

export {
  MAJOR_KEYS,
  MINOR_KEYS,
  NOTE_SOLFEGE,
  buildScaleNotes,
  formatNoteLabel,
  getKeyOptions,
  noteToSemitone,
  normalizeToSharp,
} from './notes';

export { getDiatonicChords } from './diatonic';

export {
  MOOD_OPTIONS,
  buildProgressionFromDegrees,
  generateProgression,
  getReplacementSuggestions,
} from './progressions';

export {
  CIRCLE_POSITIONS,
  compareCircleKeys,
  getCirclePositionForKey,
  getDiatonicTetrads,
  getHarmonicNeighbors,
  type CirclePosition,
  type DiatonicTetrad,
  type HarmonicNeighbors,
  type KeyComparison,
  type SharedChordLink,
  type TransformedChordInfo,
} from './circle';

export {
  PRACTICE_SCALES,
  SCALE_ROOTS,
  buildScaleBoxes,
  getScaleCompatibleChords,
  type PracticeScaleDefinition,
  type PracticeScaleId,
  type ScaleBox,
  type ScaleBoxNote,
} from './scales';
