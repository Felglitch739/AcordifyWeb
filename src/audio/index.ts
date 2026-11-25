export {
  GUITAR_STRINGS,
  computeRms,
  detectPitchYin,
  frequencyToTuningReading,
  median,
} from './pitchDetector';

export type {
  GuitarStringInfo,
  PitchDetectionResult,
  TuningReading,
  TuningStatus,
  YinOptions,
} from './pitchDetector';

export {
  STRUM_PATTERN_OPTIONS,
  type StrumPatternId,
  type StrumPatternOption,
} from './guitarEngine';

export {
  createAcousticBodyBus,
  noteNameToFrequency,
  synthesizePluckedStringBuffer,
  type GuitarTone,
} from './karplusStrong';

export {
  MAX_STRING_MIDI,
  MAX_TUNING_SHIFT,
  MIN_STRING_MIDI,
  MIN_TUNING_SHIFT,
  STANDARD_MIDIS,
  TUNING_PRESETS,
  buildTuningStrings,
  clampStringMidi,
  deleteCustomTuning,
  formatSemitoneShift,
  formatTuningSequence,
  listSavedCustomTunings,
  midiToFrequency,
  midiToNoteParts,
  saveCustomTuning,
  type CustomTuningSaved,
  type SixStringMidis,
  type TuningPreset,
  type TuningPresetId,
} from './tunings';

export { useProgressionPlayer } from './useProgressionPlayer';
export type {
  UseProgressionPlayerParams,
  UseProgressionPlayerResult,
} from './useProgressionPlayer';
