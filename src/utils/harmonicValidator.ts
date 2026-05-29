// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// harmonicValidator.ts — Acordify post-generation harmonic validator
// Pure TypeScript · Zero dependencies · Functional approach
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────

/** All 12 chromatic pitch classes, including enharmonic equivalents. */
export type NoteName =
  | 'C' | 'C#' | 'Db'
  | 'D' | 'D#' | 'Eb'
  | 'E'
  | 'F' | 'F#' | 'Gb'
  | 'G' | 'G#' | 'Ab'
  | 'A' | 'A#' | 'Bb'
  | 'B';

/** Supported chord qualities for parsing and validation. */
export type ChordQuality =
  | 'maj' | 'min' | 'dim' | 'aug'
  | 'maj7' | 'm7' | 'dom7' | 'm7b5' | 'dim7'
  | 'sus2' | 'sus4'
  | 'add9' | 'maj9' | 'm9'
  | '6' | 'm6';

/** Diatonic scale modes. */
export type ScaleMode = 'major' | 'minor';

/** A chord decomposed into root, quality, and the original raw string. */
export interface ParsedChord {
  root: NoteName;
  quality: ChordQuality;
  raw: string;
}

/** Result of validating a single chord against a key. */
export interface ValidationResult {
  isValid: boolean;
  isDiatonic: boolean;
  isBorrowed: boolean;
  isSecondaryDominant: boolean;
  scaleDegree?: number;
  reason: string;
  suggestion?: string;
}

/** Result of validating an entire chord progression. */
export interface ProgressionValidationResult {
  chords: Array<{ chord: string; result: ValidationResult }>;
  overallCoherenceScore: number;
  keyConfidence: number;
  issues: string[];
  suggestions: string[];
}

// ─────────────────────────────────────────────────────────────────────
// INTERNAL CONSTANTS
// ─────────────────────────────────────────────────────────────────────

/** Canonical sharp spelling for each semitone value (0–11). */
const SEMITONE_TO_SHARP: readonly NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

/** Map every valid NoteName string to its semitone value (C = 0). */
const NOTE_TO_SEMITONE_MAP: Readonly<Record<string, number>> = {
  'C': 0,  'B#': 0,
  'C#': 1, 'Db': 1,
  'D': 2,
  'D#': 3, 'Eb': 3,
  'E': 4,  'Fb': 4,
  'F': 5,  'E#': 5,
  'F#': 6, 'Gb': 6,
  'G': 7,
  'G#': 8, 'Ab': 8,
  'A': 9,
  'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

/** Major scale interval pattern in semitones (W-W-H-W-W-W-H). */
const MAJOR_INTERVALS: readonly number[] = [0, 2, 4, 5, 7, 9, 11];

/** Natural minor scale interval pattern in semitones (W-H-W-W-H-W-W). */
const MINOR_INTERVALS: readonly number[] = [0, 2, 3, 5, 7, 8, 10];

/**
 * Diatonic chord qualities for each scale degree (1-indexed internally).
 * Major: I  ii  iii  IV  V   vi  vii°
 * Minor: i  ii° III  iv  v   VI  VII
 */
const MAJOR_DIATONIC_QUALITIES: readonly ChordQuality[] = [
  'maj', 'min', 'min', 'maj', 'dom7', 'min', 'dim',
];

const MINOR_DIATONIC_QUALITIES: readonly ChordQuality[] = [
  'min', 'dim', 'maj', 'min', 'min', 'maj', 'maj',
];

// ─────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS  (not exported)
// ─────────────────────────────────────────────────────────────────────

/**
 * Converts a note name to its semitone value (C = 0, C# = 1, … B = 11).
 * Returns -1 for unrecognisable input — callers must guard against this.
 */
function noteToSemitone(note: NoteName): number {
  const val = NOTE_TO_SEMITONE_MAP[note];
  return val !== undefined ? val : -1;
}

/**
 * Converts a semitone value (mod-12 safe) back to a NoteName,
 * always using the sharp-based spelling.
 */
function semitoneToNote(semitone: number): NoteName {
  return SEMITONE_TO_SHARP[((semitone % 12) + 12) % 12];
}

/**
 * Transposes a note up (or down) by the given number of semitones.
 */
function transposeNote(note: NoteName, semitones: number): NoteName {
  return semitoneToNote(noteToSemitone(note) + semitones);
}

/**
 * Normalises any enharmonic spelling to its sharp equivalent.
 * e.g.  Db → C#,  Bb → A#,  E → E  (passthrough)
 * Returns the sharp-normalised NoteName, or 'C' as absolute fallback.
 */
function normalizeEnharmonic(note: string): NoteName {
  const semitone = NOTE_TO_SEMITONE_MAP[note];
  if (semitone === undefined) return 'C';
  return SEMITONE_TO_SHARP[semitone];
}

/**
 * Builds the 7-note scale for the given root and mode,
 * returning each degree as a NoteName (sharp spelling).
 */
function buildScale(root: NoteName, mode: ScaleMode): NoteName[] {
  const rootSemitone = noteToSemitone(root);
  const intervals = mode === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
  return intervals.map((iv) => semitoneToNote(rootSemitone + iv));
}

/**
 * Checks whether two note names are enharmonically equal
 * (i.e. refer to the same pitch class).
 */
function enharmonicEqual(a: NoteName, b: NoteName): boolean {
  return noteToSemitone(a) === noteToSemitone(b);
}

/**
 * Returns the diatonic quality table for the given mode.
 */
function diatonicQualities(mode: ScaleMode): readonly ChordQuality[] {
  return mode === 'major' ? MAJOR_DIATONIC_QUALITIES : MINOR_DIATONIC_QUALITIES;
}

/**
 * Returns true when `quality` is compatible with (or a coloured extension of)
 * `baseQuality`. For instance, 'maj7' and 'add9' extend 'maj'; 'm7' extends 'min'.
 * dom7 extensions like '13' are considered compatible with 'dom7'.
 */
function qualityMatchesDiatonic(quality: ChordQuality, baseQuality: ChordQuality): boolean {
  if (quality === baseQuality) return true;

  // Group: major-family
  const majorFamily: ChordQuality[] = ['maj', 'maj7', 'maj9', 'add9', '6', 'sus2', 'sus4'];
  // Group: minor-family
  const minorFamily: ChordQuality[] = ['min', 'm7', 'm9', 'm6'];
  // Group: dominant-family (built on the 5th degree)
  const domFamily: ChordQuality[] = ['dom7', 'maj', 'sus4', 'sus2'];
  // Group: diminished-family
  const dimFamily: ChordQuality[] = ['dim', 'm7b5', 'dim7'];

  if (baseQuality === 'maj' && majorFamily.includes(quality)) return true;
  if (baseQuality === 'min' && minorFamily.includes(quality)) return true;
  if (baseQuality === 'dom7' && domFamily.includes(quality)) return true;
  if (baseQuality === 'dim' && dimFamily.includes(quality)) return true;

  return false;
}

// ─────────────────────────────────────────────────────────────────────
// EXPORTED FUNCTIONS
// ─────────────────────────────────────────────────────────────────────

/**
 * Parses a raw chord string into its constituent root note and quality.
 *
 * Handles formats such as: `Cmaj7`, `Am`, `D#m7`, `Bbsus4`, `F#7`,
 * `Gdim`, `Ebmaj9`, `Cadd9`, `Am9`, `G13`, `D#m7b5`.
 *
 * @param raw - The chord string to parse.
 * @returns A `ParsedChord` on success, or `null` for unrecognisable input.
 *          Never throws.
 */
export function parseChord(raw: string): ParsedChord | null {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  /*
   * Regex breakdown:
   *
   *   ^                     → start of string
   *   ([A-G])               → capture group 1: root letter (A-G)
   *   ([#b]?)               → capture group 2: optional accidental (# or b)
   *   (                     → capture group 3: quality / suffix
   *     m7b5 | dim7 | dim   → half-diminished or diminished variants
   *     | aug               → augmented triad
   *     | maj7 | maj9       → major seventh / ninth
   *     | m7 | m9 | m6      → minor seventh / ninth / sixth
   *     | m(?!aj)            → plain minor (negative lookahead avoids matching "maj")
   *     | sus2 | sus4        → suspended chords
   *     | add9               → added ninth
   *     | dom7               → explicit dominant seventh (rare notation)
   *     | 13 | 11 | 9 | 7   → dominant-family extensions (G7, G9, G11, G13)
   *     | 6                  → major sixth
   *   )?                    → quality is optional — bare root = major
   *   $                     → end of string
   */
  const CHORD_REGEX =
    /^([A-G])([#b]?)(m7b5|dim7|dim|aug|maj7|maj9|m7|m9|m6|m(?!aj)|sus2|sus4|add9|dom7|13|11|9|7|6)?$/;

  const match = trimmed.match(CHORD_REGEX);
  if (!match) return null;

  const rootLetter = match[1] as string;
  const accidental = match[2] || '';
  const suffix = match[3] || '';

  const rootStr = rootLetter + accidental;
  const root = normalizeEnharmonic(rootStr);

  // Map the parsed suffix to our ChordQuality union
  let quality: ChordQuality;
  switch (suffix) {
    case '':       quality = 'maj';   break;
    case 'm':      quality = 'min';   break;
    case 'dim':    quality = 'dim';   break;
    case 'aug':    quality = 'aug';   break;
    case 'maj7':   quality = 'maj7';  break;
    case 'm7':     quality = 'm7';    break;
    case '7':      quality = 'dom7';  break;
    case 'dom7':   quality = 'dom7';  break;
    case 'm7b5':   quality = 'm7b5';  break;
    case 'dim7':   quality = 'dim7';  break;
    case 'sus2':   quality = 'sus2';  break;
    case 'sus4':   quality = 'sus4';  break;
    case 'add9':   quality = 'add9';  break;
    case 'maj9':   quality = 'maj9';  break;
    case 'm9':     quality = 'm9';    break;
    case '6':      quality = '6';     break;
    case 'm6':     quality = 'm6';    break;
    // Dominant extensions beyond 7 → treat as dom7 family
    case '9':      quality = 'dom7';  break;
    case '11':     quality = 'dom7';  break;
    case '13':     quality = 'dom7';  break;
    default:       return null;
  }

  return { root, quality, raw: trimmed };
}

/**
 * Returns the seven diatonic chords (triads / dominant on V) for a key.
 *
 * @param root - Tonic note of the key.
 * @param mode - `'major'` or `'minor'`.
 * @returns An array of 7 `ParsedChord` objects, one per scale degree.
 */
export function getDiatonicChords(root: NoteName, mode: ScaleMode): ParsedChord[] {
  const scale = buildScale(root, mode);
  const qualities = diatonicQualities(mode);

  return scale.map((noteRoot, i) => {
    const quality = qualities[i];
    const raw = quality === 'maj'
      ? noteRoot
      : quality === 'min'
        ? `${noteRoot}m`
        : quality === 'dom7'
          ? `${noteRoot}7`
          : `${noteRoot}${quality}`;
    return { root: noteRoot, quality, raw };
  });
}

/**
 * Validates a single chord against a key/mode.
 *
 * The checker applies the following priority chain:
 * 1. **Diatonic** — chord root and quality match one of the 7 diatonic chords.
 * 2. **Borrowed** — chord is diatonic in the *parallel* key (modal interchange).
 * 3. **Secondary dominant** — chord functions as V7 of ii, IV, V, or vi.
 * 4. **Invalid** — none of the above; a suggestion is provided.
 *
 * @param chord   - Raw chord string (e.g. `"Am7"`).
 * @param keyRoot - Tonic note of the key.
 * @param mode    - `'major'` or `'minor'`.
 * @returns A `ValidationResult` describing how the chord relates to the key.
 */
export function validateChord(
  chord: string,
  keyRoot: NoteName,
  mode: ScaleMode,
): ValidationResult {
  const parsed = parseChord(chord);

  if (!parsed) {
    return {
      isValid: false,
      isDiatonic: false,
      isBorrowed: false,
      isSecondaryDominant: false,
      reason: `"${chord}" could not be parsed as a valid chord.`,
      suggestion: keyRoot, // suggest the tonic
    };
  }

  const normalizedRoot = normalizeEnharmonic(parsed.root);
  const diatonic = getDiatonicChords(normalizeEnharmonic(keyRoot), mode);

  // ── 1. Diatonic check ──────────────────────────────────────────────
  for (let i = 0; i < diatonic.length; i++) {
    if (
      enharmonicEqual(normalizedRoot, diatonic[i].root) &&
      qualityMatchesDiatonic(parsed.quality, diatonic[i].quality)
    ) {
      return {
        isValid: true,
        isDiatonic: true,
        isBorrowed: false,
        isSecondaryDominant: false,
        scaleDegree: i + 1,
        reason: `Diatonic chord — scale degree ${i + 1} in ${keyRoot} ${mode}.`,
      };
    }
  }

  // ── 2. Borrowed chord (modal interchange from parallel key) ────────
  const parallelMode: ScaleMode = mode === 'major' ? 'minor' : 'major';
  const parallelDiatonic = getDiatonicChords(normalizeEnharmonic(keyRoot), parallelMode);

  for (let i = 0; i < parallelDiatonic.length; i++) {
    if (
      enharmonicEqual(normalizedRoot, parallelDiatonic[i].root) &&
      qualityMatchesDiatonic(parsed.quality, parallelDiatonic[i].quality)
    ) {
      return {
        isValid: true,
        isDiatonic: false,
        isBorrowed: true,
        isSecondaryDominant: false,
        scaleDegree: i + 1,
        reason: `Borrowed chord from the parallel ${parallelMode} key (degree ${i + 1}).`,
      };
    }
  }

  // ── 3. Secondary dominant check (V7/ii, V7/IV, V7/V, V7/vi) ──────
  //    A secondary dominant is a dom7-family chord whose root sits a
  //    perfect fifth (7 semitones) above a target diatonic chord.
  //    We check targets: ii (degree 2), IV (degree 4), V (degree 5), vi (degree 6).
  const secondaryTargetDegrees = [1, 3, 4, 5]; // 0-indexed: ii=1, IV=3, V=4, vi=5
  const isDom = (
    parsed.quality === 'dom7' ||
    parsed.quality === 'maj'  // dominant chord sometimes notated without 7
  );

  if (isDom) {
    for (const targetIdx of secondaryTargetDegrees) {
      const targetRoot = diatonic[targetIdx].root;
      const expectedDomRoot = transposeNote(targetRoot, 7); // V of target = +7 semitones
      if (enharmonicEqual(normalizedRoot, expectedDomRoot)) {
        const degreeLabels = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
        return {
          isValid: true,
          isDiatonic: false,
          isBorrowed: false,
          isSecondaryDominant: true,
          reason: `Secondary dominant — V7/${degreeLabels[targetIdx]} in ${keyRoot} ${mode}.`,
        };
      }
    }
  }

  // ── 4. Invalid — provide suggestion ────────────────────────────────
  //    Find the diatonic chord whose root is closest in semitones.
  let bestSuggestion = diatonic[0];
  let bestDistance = 12;
  for (const dc of diatonic) {
    const dist = Math.abs(noteToSemitone(normalizedRoot) - noteToSemitone(dc.root));
    const minDist = Math.min(dist, 12 - dist); // wrap-around distance
    if (minDist < bestDistance) {
      bestDistance = minDist;
      bestSuggestion = dc;
    }
  }

  return {
    isValid: false,
    isDiatonic: false,
    isBorrowed: false,
    isSecondaryDominant: false,
    reason: `"${chord}" is not diatonic, borrowed, or a secondary dominant in ${keyRoot} ${mode}.`,
    suggestion: bestSuggestion.raw,
  };
}

/**
 * Validates a full chord progression against a key/mode.
 *
 * Computes per-chord validation, an overall coherence score (0–100),
 * a key-confidence percentage, and produces contextual issues &
 * suggestions.
 *
 * @param chords  - Array of raw chord strings.
 * @param keyRoot - Tonic note of the key.
 * @param mode    - `'major'` or `'minor'`.
 * @returns A `ProgressionValidationResult`.
 */
export function validateProgression(
  chords: string[],
  keyRoot: NoteName,
  mode: ScaleMode,
): ProgressionValidationResult {
  if (chords.length === 0) {
    return {
      chords: [],
      overallCoherenceScore: 0,
      keyConfidence: 0,
      issues: ['Empty progression — no chords to validate.'],
      suggestions: [],
    };
  }

  const results: Array<{ chord: string; result: ValidationResult }> = [];
  const issues: string[] = [];
  const suggestions: string[] = [];

  let totalPoints = 0;
  let validOrBorrowedCount = 0;

  for (let i = 0; i < chords.length; i++) {
    const chord = chords[i];
    const result = validateChord(chord, keyRoot, mode);
    results.push({ chord, result });

    // ── Scoring ──
    if (result.isDiatonic) {
      totalPoints += 100;
    } else if (result.isSecondaryDominant) {
      totalPoints += 80;
    } else if (result.isBorrowed) {
      totalPoints += 75;
    } else {
      totalPoints += 0;
    }

    // ── Key confidence tracking ──
    if (result.isValid) {
      validOrBorrowedCount++;
    }

    // ── Repeated consecutive chords ──
    if (i > 0 && chords[i] === chords[i - 1]) {
      issues.push(`Chords ${i} and ${i + 1} are identical ("${chord}"). Consider variation.`);
    }
  }

  // ── Ending on non-tonic ──
  const lastResult = results[results.length - 1];
  if (lastResult) {
    const lastParsed = parseChord(lastResult.chord);
    const tonicSemitone = noteToSemitone(normalizeEnharmonic(keyRoot));

    if (lastParsed) {
      const lastRootSemitone = noteToSemitone(normalizeEnharmonic(lastParsed.root));
      if (lastRootSemitone !== tonicSemitone) {
        suggestions.push(
          `Progression ends on "${lastResult.chord}" instead of the tonic (${keyRoot}). ` +
          `Ending on the tonic provides stronger resolution.`,
        );
      }
    }
  }

  // ── Collect per-chord suggestions for invalid chords ──
  for (const entry of results) {
    if (!entry.result.isValid && entry.result.suggestion) {
      suggestions.push(
        `Consider replacing "${entry.chord}" with "${entry.result.suggestion}".`,
      );
    }
  }

  const overallCoherenceScore = Math.round(totalPoints / chords.length);
  const keyConfidence = Math.round((validOrBorrowedCount / chords.length) * 100);

  return {
    chords: results,
    overallCoherenceScore,
    keyConfidence,
    issues,
    suggestions,
  };
}

/**
 * Infers the most likely key of a chord progression by brute-force
 * testing all 24 major/minor keys and picking the one that maximises
 * diatonic matches.
 *
 * @param chords - Array of raw chord strings.
 * @returns An object with the best-guess `root`, `mode`, and a
 *          `confidence` score (0–100).
 */
export function detectKey(
  chords: string[],
): { root: NoteName; mode: ScaleMode; confidence: number } {
  let bestRoot: NoteName = 'C';
  let bestMode: ScaleMode = 'major';
  let bestScore = -1;

  const modes: ScaleMode[] = ['major', 'minor'];

  for (const candidateRoot of SEMITONE_TO_SHARP) {
    for (const candidateMode of modes) {
      let matchCount = 0;
      for (const chord of chords) {
        const result = validateChord(chord, candidateRoot, candidateMode);
        if (result.isValid) matchCount++;
      }
      if (matchCount > bestScore) {
        bestScore = matchCount;
        bestRoot = candidateRoot;
        bestMode = candidateMode;
      }
    }
  }

  const confidence = chords.length > 0
    ? Math.round((bestScore / chords.length) * 100)
    : 0;

  return { root: bestRoot, mode: bestMode, confidence };
}
