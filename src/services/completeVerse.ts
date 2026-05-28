// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// completeVerse.ts — "Completar Verso" AI co-writing module
// Prompt engineering + TypeScript integration for Acordify
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { recordTokenUsage } from './tokenTracker';

// ─────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────

/** Parameters the caller passes to build the AI prompt pair. */
export interface CompleteVerseParams {
  userLines: string[];
  activeChords: string[];
  keyRoot: string;
  mode: 'major' | 'minor';
  bpm: number;
  mood: string;
  language: 'es' | 'en';
  rhymeScheme: 'auto' | 'ABAB' | 'AABB' | 'ABBA' | 'free';
  linesToComplete: 2 | 4;
  styleHint?: string;
}

/** A single AI-generated lyric line with chord mapping metadata. */
export interface CompletedLine {
  text: string;
  chord: string;
  syllableCount: number;
  rhymeLabel: string;
}

/** The full parsed + validated result from the AI response. */
export interface CompleteVerseResult {
  userLines: string[];
  completedLines: CompletedLine[];
  detectedRhymeScheme: string;
  moodAlignment: string;
  alternativeEnding: string[];
}

// ─────────────────────────────────────────────────────────────────────
// [1] SYSTEM PROMPT  (~650 tokens)
// ─────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a lyric co-writer AI. You COMPLETE stanzas — you never rewrite, replace, or alter the user's existing lines.

RULES:
1. SYLLABIC CONSISTENCY: Count syllables in the user's lines. Every generated line must be within ±2 syllables of the user's average.
2. RHYME SCHEME: If rhymeScheme is "auto", detect the scheme from the user's lines and continue it. Otherwise follow the given scheme exactly (ABAB, AABB, ABBA, or free).
3. CHORD MAPPING: Assign one chord from activeChords to each generated line:
   - Lines expressing tension, conflict, or movement → non-tonic chords (degrees ii, V, vii, etc.)
   - Lines expressing resolution, calm, or arrival → tonic or subdominant chords (I, IV)
4. VOICE PRESERVATION: Match the person (1st/2nd/3rd), tone, register, and imagery of the user's lines exactly.
5. PROHIBITED:
   - Clichés: "amor eterno", "corazón roto", "sin ti no soy", "broken heart", "forever love"
   - Filler/padding words used only to hit syllable count
   - Changing grammatical person or tense from the user's lines
6. OUTPUT: Return ONLY valid JSON, no prose, no markdown fences, no explanation.

JSON SCHEMA:
{"userLines":string[],"completedLines":[{"text":"string","chord":"string","syllableCount":number,"rhymeLabel":"string"}],"detectedRhymeScheme":"string","moodAlignment":"string","alternativeEnding":string[]}

NEGATIVE EXAMPLES (NEVER do this):
Bad #1 — Syllabic mismatch:
User line: "Bajo la luz del neón apagado," (12 syllables)
Generated: "Llueve." (2 syllables) ← WRONG, breaks meter entirely.

Bad #2 — Broken rhyme:
User lines rhyme scheme ABAB with endings: "-ado", "-ido", "-ado", "?"
Generated line for B position ends in "-ento" ← WRONG, must rhyme with "-ido".

POSITIVE EXAMPLES:
Good #1 — Jazz Melancólico, español, ABAB:
User: "Bajo la luz del neón apagado,"
Completed: {"text":"busco acordes que no hagan ruido.","chord":"Am9","syllableCount":11,"rhymeLabel":"B"}

Good #2 — Indie Rock, english, free verse:
User: "Static hums through the dashboard speakers,"
Completed: {"text":"and the highway stretches like a sigh.","chord":"Em","syllableCount":11,"rhymeLabel":"A"}`;

// ─────────────────────────────────────────────────────────────────────
// [2] USER PROMPT TEMPLATE  (~300 tokens when populated)
// ─────────────────────────────────────────────────────────────────────

const USER_PROMPT_TEMPLATE = `=== USER INPUT — DO NOT MODIFY ===
{{USER_LINES}}

=== MUSICAL CONTEXT ===
Active chords: {{ACTIVE_CHORDS}}
Key: {{KEY_ROOT}} {{MODE}}
BPM: {{BPM}}
Mood: {{MOOD}}
Language: {{LANGUAGE}}
Rhyme scheme: {{RHYME_SCHEME}}
Lines to complete: {{LINES_TO_COMPLETE}}{{STYLE_HINT_BLOCK}}

=== TASK ===
Complete the stanza by generating exactly {{LINES_TO_COMPLETE}} new lines.
For each line, map it to a chord from the active chords list.
Return the result as a single JSON object matching the schema from your instructions.`;

// ─────────────────────────────────────────────────────────────────────
// [3] TYPESCRIPT INTEGRATION — buildCompleteVersePrompt
// ─────────────────────────────────────────────────────────────────────

/**
 * Builds the system + user prompt pair for the "Completar Verso" feature.
 * All template variables are interpolated from the given params.
 *
 * @param params - The complete set of runtime parameters.
 * @returns An object with `systemPrompt` and `userPrompt` strings
 *          ready to be sent to Gemini / Azure OpenAI.
 */
export function buildCompleteVersePrompt(params: CompleteVerseParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const userLinesBlock = params.userLines
    .map((line, i) => `${i + 1}. ${line}`)
    .join('\n');

  const styleHintBlock = params.styleHint
    ? `\nStyle hint: ${params.styleHint}`
    : '';

  const languageLabel = params.language === 'es' ? 'Spanish' : 'English';

  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{USER_LINES}}', userLinesBlock)
    .replace('{{ACTIVE_CHORDS}}', JSON.stringify(params.activeChords))
    .replace('{{KEY_ROOT}}', params.keyRoot)
    .replace('{{MODE}}', params.mode)
    .replace('{{BPM}}', String(params.bpm))
    .replace('{{MOOD}}', params.mood)
    .replace('{{LANGUAGE}}', languageLabel)
    .replace('{{RHYME_SCHEME}}', params.rhymeScheme)
    .replace(/\{\{LINES_TO_COMPLETE\}\}/g, String(params.linesToComplete))
    .replace('{{STYLE_HINT_BLOCK}}', styleHintBlock);

  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
  };
}

// ─────────────────────────────────────────────────────────────────────
// [4] PARSING + VALIDATION HELPER
// ─────────────────────────────────────────────────────────────────────

/**
 * Estimates the syllable count of a line of text.
 * Uses a simple heuristic: counts vowel groups for Spanish,
 * and a modified English algorithm for English text.
 * Not perfect, but sufficient for ±2 tolerance checks.
 */
function estimateSyllables(text: string): number {
  const cleaned = text
    .toLowerCase()
    .replace(/[^a-záéíóúüñ]/g, ' ')
    .trim();

  if (!cleaned) return 0;

  const words = cleaned.split(/\s+/).filter(Boolean);
  let total = 0;

  for (const word of words) {
    // Count vowel groups (works well for Spanish; decent for English)
    const vowelGroups = word.match(/[aeioáéíóúüu]+/gi);
    const count = vowelGroups ? vowelGroups.length : 1;
    total += Math.max(count, 1);
  }

  return total;
}

/**
 * Parses and strictly validates the raw JSON string returned by the AI.
 *
 * Checks:
 * - Valid JSON structure matching `CompleteVerseResult` schema
 * - Each `completedLines[].syllableCount` is within ±2 of the user's
 *   lines average syllable count
 * - Each `completedLines[].chord` exists in the `activeChords` array
 *
 * @param raw          - The raw string response from the AI.
 * @param userLines    - The original user lines (for syllable baseline).
 * @param activeChords - The chord progression (for chord validation).
 * @returns A validated `CompleteVerseResult`.
 * @throws A descriptive `Error` if validation fails at any step.
 */
export function parseCompleteVerseResponse(
  raw: string,
  userLines: string[],
  activeChords: string[],
): CompleteVerseResult {
  // ── Step 1: Strip accidental markdown fences ──
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  // ── Step 2: Parse JSON ──
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(
      `[CompleteVerse] AI response is not valid JSON. Raw (first 200 chars): "${cleaned.slice(0, 200)}"`,
    );
  }

  // ── Step 3: Structural validation ──
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('[CompleteVerse] Parsed response is not an object.');
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.userLines)) {
    throw new Error('[CompleteVerse] Missing or invalid "userLines" array.');
  }
  if (!Array.isArray(obj.completedLines)) {
    throw new Error('[CompleteVerse] Missing or invalid "completedLines" array.');
  }
  if (typeof obj.detectedRhymeScheme !== 'string') {
    throw new Error('[CompleteVerse] Missing or invalid "detectedRhymeScheme" string.');
  }
  if (typeof obj.moodAlignment !== 'string') {
    throw new Error('[CompleteVerse] Missing or invalid "moodAlignment" string.');
  }
  if (!Array.isArray(obj.alternativeEnding)) {
    throw new Error('[CompleteVerse] Missing or invalid "alternativeEnding" array.');
  }

  // ── Step 4: Validate each completed line ──
  const completedLines: CompletedLine[] = [];
  const chordsLower = activeChords.map((c) => c.toLowerCase());

  // Calculate user's average syllable count for the ±2 check
  const userSyllableCounts = userLines.map((line) => estimateSyllables(line));
  const avgUserSyllables =
    userSyllableCounts.length > 0
      ? userSyllableCounts.reduce((sum, n) => sum + n, 0) / userSyllableCounts.length
      : 10; // fallback default

  for (let i = 0; i < (obj.completedLines as unknown[]).length; i++) {
    const entry = (obj.completedLines as unknown[])[i];
    if (typeof entry !== 'object' || entry === null) {
      throw new Error(`[CompleteVerse] completedLines[${i}] is not an object.`);
    }

    const line = entry as Record<string, unknown>;

    if (typeof line.text !== 'string' || !line.text.trim()) {
      throw new Error(`[CompleteVerse] completedLines[${i}].text is missing or empty.`);
    }
    if (typeof line.chord !== 'string' || !line.chord.trim()) {
      throw new Error(`[CompleteVerse] completedLines[${i}].chord is missing or empty.`);
    }
    if (typeof line.syllableCount !== 'number' || line.syllableCount < 1) {
      throw new Error(
        `[CompleteVerse] completedLines[${i}].syllableCount is missing or invalid (got ${line.syllableCount}).`,
      );
    }
    if (typeof line.rhymeLabel !== 'string') {
      throw new Error(`[CompleteVerse] completedLines[${i}].rhymeLabel is missing.`);
    }

    // ── Chord existence check ──
    if (!chordsLower.includes(line.chord.toLowerCase())) {
      throw new Error(
        `[CompleteVerse] completedLines[${i}].chord "${line.chord}" is not in activeChords [${activeChords.join(', ')}].`,
      );
    }

    // ── Syllable tolerance check ──
    const diff = Math.abs(line.syllableCount - avgUserSyllables);
    if (diff > 2) {
      throw new Error(
        `[CompleteVerse] completedLines[${i}].syllableCount (${line.syllableCount}) ` +
        `deviates more than ±2 from user's average (${avgUserSyllables.toFixed(1)}). ` +
        `Line: "${line.text}"`,
      );
    }

    completedLines.push({
      text: line.text as string,
      chord: line.chord as string,
      syllableCount: line.syllableCount as number,
      rhymeLabel: line.rhymeLabel as string,
    });
  }

  return {
    userLines: obj.userLines as string[],
    completedLines,
    detectedRhymeScheme: obj.detectedRhymeScheme as string,
    moodAlignment: obj.moodAlignment as string,
    alternativeEnding: obj.alternativeEnding as string[],
  };
}

// ─────────────────────────────────────────────────────────────────────
// [5] CHORDPRO FORMATTER
// ─────────────────────────────────────────────────────────────────────

/**
 * Converts a `CompleteVerseResult` into ChordPro notation,
 * ready to be appended to the existing ChordPro Notebook content.
 *
 * The output includes both the original user lines (if they already
 * have chord annotations they are preserved; otherwise no chord is
 * prepended) and the AI-generated lines with `[Chord]` prefixes.
 *
 * @example
 * ```
 * [Cmaj7]Bajo la luz del neón apagado,
 * [Am9]busco acordes que no hagan ruido.
 * ```
 *
 * @param result - The validated `CompleteVerseResult`.
 * @returns A multi-line ChordPro string.
 */
export function toChordProFormat(result: CompleteVerseResult): string {
  const lines: string[] = [];

  // Include the user's original lines as-is.
  // If a user line already starts with a [Chord] bracket, preserve it;
  // otherwise output plain text (user didn't annotate these lines).
  for (const userLine of result.userLines) {
    lines.push(userLine);
  }

  // Append each completed line with its chord in ChordPro bracket notation.
  for (const completed of result.completedLines) {
    lines.push(`[${completed.chord}]${completed.text}`);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────
// [6] END-TO-END SERVICE CALL  (convenience wrapper)
// ─────────────────────────────────────────────────────────────────────

/**
 * Calls the Azure OpenAI / Gemini-compatible endpoint to complete a
 * verse, then parses and validates the response.
 *
 * @param params - The full set of CompleteVerseParams.
 * @returns A validated `CompleteVerseResult`.
 * @throws On network errors, invalid API responses, or validation failures.
 */
export async function completeVerse(
  params: CompleteVerseParams,
): Promise<CompleteVerseResult> {
  const apiKey = import.meta.env.VITE_AZURE_API_KEY;
  const endpoint = import.meta.env.VITE_AZURE_ENDPOINT;

  if (!apiKey || !endpoint) {
    throw new Error(
      'Azure API Key or Endpoint is missing in .env.local. ' +
      'Please set VITE_AZURE_API_KEY and VITE_AZURE_ENDPOINT.',
    );
  }

  const { systemPrompt, userPrompt } = buildCompleteVersePrompt(params);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Azure API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  // Track token usage
  if (data.usage) {
    recordTokenUsage('completeVerse', 'gpt-4o-mini', data.usage);
  }

  const rawContent: string = data.choices[0].message.content.trim();

  return parseCompleteVerseResponse(rawContent, params.userLines, params.activeChords);
}
