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
  noteNameToFrequency,
  synthesizePluckedStringBuffer,
  type GuitarTone,
} from './karplusStrong';

export { useProgressionPlayer } from './useProgressionPlayer';
export type {
  UseProgressionPlayerParams,
  UseProgressionPlayerResult,
} from './useProgressionPlayer';
