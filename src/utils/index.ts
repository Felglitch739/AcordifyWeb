// Utilities barrel export
// Re-export all pure helper functions from this directory
export { playClickSound } from './audio';
export { transposeChord } from './transposer';
export { getChordData, getChordVariationsCount, CHORD_DICTIONARY } from './chordDictionary';
export { getScaleData } from './scaleDictionary';
export {
  parseChord,
  getDiatonicChords,
  validateChord,
  validateProgression,
  detectKey,
} from './harmonicValidator';
export {
  buildSessionSnapshot,
  parseSessionSnapshot,
  serializeSessionSnapshot,
} from './sessionExporter';
export {
  buildChordSchedule,
  beatToBarAndPosition,
  getActiveChordAtBeat,
  getTotalBeats,
} from './liveSessionUtils';
export type {
  NoteName,
  ChordQuality,
  ScaleMode,
  ParsedChord,
  ValidationResult,
  ProgressionValidationResult,
} from './harmonicValidator';
export type {
  SessionSnapshot,
  SessionMetadata,
  SessionMusic,
  SessionLyrics,
  SessionPlayer,
} from './sessionExporter';
export type {
  ChordSlot,
  LiveSessionConfig,
  LiveSessionState,
} from './liveSessionUtils';
export {
  applyTheme,
  getThemeById,
  getThemeList,
  isLightTheme,
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
} from './themeEngine';
export type { ThemeId, ThemeDefinition } from './themeEngine';
