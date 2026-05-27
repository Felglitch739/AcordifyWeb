import { parseChord } from '../utils';

export interface LyricsParams {
  activeChords: string[];
  keyRoot: string;
  mode: 'major' | 'minor';
  bpm: number;
  mood: string;
  genre: string;
  rhymeScheme: 'ABAB' | 'AABB' | 'ABBA' | 'free';
  emotionalMood: number;
  narrativePerson: '1ra' | '2da' | '3ra';
  metaphorDensity: 'literal' | 'balanced' | 'poetic';
  thematicConcept: string;
  language: 'es' | 'en';
  linesToGenerate: 4 | 8;
}

export interface LyricsLine {
  text: string;
  chord: string;
  syllableCount: number;
  rhymeLabel: string;
}

export interface LyricsResult {
  lines: LyricsLine[];
  detectedScheme: string;
  emotionalTag: string;
  chordProOutput: string;
}

const SYSTEM_PROMPT = `You are a senior lyric co-writer for Acordify, an AI music tool for songwriters. Write lyrics that feel musical, fresh, emotionally coherent, and aligned to the requested genre.

OUTPUT RULES:
- Return ONLY valid JSON. No markdown fences. No explanation.
- Return exactly this schema: {"lines":[{"text":"string","chord":"string","syllableCount":number,"rhymeLabel":"string"}],"detectedScheme":"string","emotionalTag":"string","chordProOutput":"string"}
- Keep the requested language throughout the stanza.
- Never change narrative person mid-stanza.
- Avoid generic romantic clichés, filler syllables, and empty padding.
- Map lines to the active chord progression in order, cycling through activeChords as needed.
- Maintain syllabic consistency according to the tempo feel.
- chordProOutput must be ready to paste into a ChordPro notebook using [Chord]lyric lines.

CREATIVE RULES:
- Match the requested rhyme scheme unless the user selected free.
- Make the emotional tone match the mood descriptor.
- Keep imagery and diction aligned with the metaphor density descriptor.
- Use the supplied chord progression as the harmonic backbone; do not invent new chords.`;

const USER_PROMPT_TEMPLATE = `=== MUSICAL CONTEXT ===
Mood: {{MOOD}}
Genre: {{GENRE}}
Key: {{KEY_ROOT}} {{MODE}}
BPM: {{BPM}}
Active chords: {{ACTIVE_CHORDS}}

=== CREATIVE CONTROLS ===
Rhyme scheme: {{RHYME_SCHEME}}
Emotional mood: {{EMOTIONAL_DESCRIPTOR}}
Narrative person: {{NARRATIVE_PERSON}}
Metaphor density: {{METAPHOR_DESCRIPTOR}}
Thematic concept: {{THEMATIC_CONCEPT}}
Language: {{LANGUAGE}}
Lines to generate: {{LINES_TO_GENERATE}}

=== THEMATIC ANCHOR RULES ===
The thematic concept is the primary topic of the stanza.
- Base the semantic field, imagery, and verbs on the thematic concept.
- Every line must reinforce the theme directly or through closely related imagery.
- Avoid generic filler lines that could belong to any song.
- If the concept is specific, prefer concrete nouns and scene details over abstract phrasing.
- Do not drift into unrelated moods or topics even if the tone is emotional.

=== TEMPO HINT ===
{{BPM_HINT}}

=== TASK ===
Write exactly {{LINES_TO_GENERATE}} lines and assign each line a chord from activeChords in cyclic order. Return only the JSON object.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed.startsWith('```json')) {
    return trimmed.replace(/^```json\s*/, '').replace(/\s*```\s*$/, '').trim();
  }

  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```\s*/, '').replace(/\s*```\s*$/, '').trim();
  }

  return trimmed;
}

function extractJsonBlock(raw: string): string {
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return raw;
  }

  return raw.slice(firstBrace, lastBrace + 1);
}

function assertNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[LyricsService] Field '${fieldName}' must be a non-empty string.`);
  }

  return value;
}

function assertNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`[LyricsService] Field '${fieldName}' must be a valid number.`);
  }

  return value;
}

function emotionDescriptor(emotionalMood: number): string {
  if (emotionalMood <= 20) return 'profundamente melancólico, casi nihilista';
  if (emotionalMood <= 40) return 'melancólico con destellos de aceptación';
  if (emotionalMood <= 60) return 'ambivalente, entre la sombra y la luz';
  if (emotionalMood <= 80) return 'esperanzador pero realista';
  return 'luminoso, resolutivo, esperanza plena';
}

function metaphorDescriptor(metaphorDensity: LyricsParams['metaphorDensity']): string {
  if (metaphorDensity === 'literal') {
    return 'lenguaje directo, imágenes concretas, sin metáforas';
  }
  if (metaphorDensity === 'balanced') {
    return 'metáforas moderadas, imágenes vívidas pero accesibles';
  }
  return 'lenguaje altamente metafórico, simbolismo denso';
}

function bpmDescriptor(bpm: number): string {
  if (bpm < 70) {
    return 'tempo lento, sílabas largas, pocas palabras por línea';
  }

  if (bpm <= 100) {
    return 'tempo moderado, balance entre fluidez y peso';
  }

  return 'tempo rápido, líneas densas, ritmo interno marcado';
}

function languageLabel(language: LyricsParams['language']): string {
  return language === 'es' ? 'Spanish' : 'English';
}

function narrativePersonLabel(narrativePerson: LyricsParams['narrativePerson']): string {
  if (narrativePerson === '1ra') return 'first person';
  if (narrativePerson === '2da') return 'second person';
  return 'third person';
}

function buildChorusCycle(activeChords: string[]): string {
  return JSON.stringify(activeChords);
}

function estimateBpmHint(bpm: number): string {
  if (bpm < 70) {
    return 'Prefer short, spacious lines with restrained phrasing and fewer syllables per line.';
  }

  if (bpm <= 100) {
    return 'Keep a balanced cadence with steady phrasing and moderate syllable density.';
  }

  return 'Use denser lines with a stronger internal rhythm and crisp phrasing.';
}

function normalizeRhymeLabel(label: string, index: number): string {
  if (/^[A-Z]$/.test(label)) {
    return label;
  }

  return String.fromCharCode(65 + (index % 26));
}

function validateChordSymbol(symbol: string): void {
  if (!parseChord(symbol)) {
    throw new Error(`[LyricsService] Invalid chord symbol '${symbol}'.`);
  }
}

export function buildLyricsPrompt(params: LyricsParams): { systemPrompt: string; userPrompt: string } {
  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{MOOD}}', params.mood)
    .replace('{{GENRE}}', params.genre.trim() || 'none')
    .replace('{{KEY_ROOT}}', params.keyRoot)
    .replace('{{MODE}}', params.mode)
    .replace('{{BPM}}', String(params.bpm))
    .replace('{{ACTIVE_CHORDS}}', buildChorusCycle(params.activeChords))
    .replace('{{RHYME_SCHEME}}', params.rhymeScheme)
    .replace('{{EMOTIONAL_DESCRIPTOR}}', emotionDescriptor(params.emotionalMood))
    .replace('{{NARRATIVE_PERSON}}', narrativePersonLabel(params.narrativePerson))
    .replace('{{METAPHOR_DESCRIPTOR}}', metaphorDescriptor(params.metaphorDensity))
    .replace('{{THEMATIC_CONCEPT}}', params.thematicConcept.trim() || 'none')
    .replace('{{LANGUAGE}}', languageLabel(params.language))
    .replace('{{LINES_TO_GENERATE}}', String(params.linesToGenerate))
    .replace('{{BPM_HINT}}', `${bpmDescriptor(params.bpm)} ${estimateBpmHint(params.bpm)}`);

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}

export function parseLyricsResponse(raw: string, params: LyricsParams): LyricsResult {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('[LyricsService] Response is empty or not a string.');
  }

  const cleaned = extractJsonBlock(stripMarkdownFences(raw));

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('[LyricsService] Response is not valid JSON.');
  }

  if (!isRecord(parsed)) {
    throw new Error('[LyricsService] Parsed response must be a JSON object.');
  }

  const linesValue = parsed.lines;
  const detectedScheme = assertNonEmptyString(parsed.detectedScheme, 'detectedScheme');
  const emotionalTag = assertNonEmptyString(parsed.emotionalTag, 'emotionalTag');
  const rawChordProOutput = assertNonEmptyString(parsed.chordProOutput, 'chordProOutput');

  if (!Array.isArray(linesValue)) {
    throw new Error('[LyricsService] Missing or invalid "lines" array.');
  }

  if (linesValue.length !== params.linesToGenerate) {
    throw new Error(
      `[LyricsService] Expected ${params.linesToGenerate} lines, received ${linesValue.length}.`,
    );
  }

  if (params.activeChords.length === 0) {
    throw new Error('[LyricsService] activeChords cannot be empty.');
  }

  const lines: LyricsLine[] = linesValue.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`[LyricsService] lines[${index}] must be an object.`);
    }

    const text = assertNonEmptyString(entry.text, `lines[${index}].text`);
    const chord = assertNonEmptyString(entry.chord, `lines[${index}].chord`);
    const syllableCount = assertNumber(entry.syllableCount, `lines[${index}].syllableCount`);
    const rhymeLabel = assertNonEmptyString(entry.rhymeLabel, `lines[${index}].rhymeLabel`);

    if (!Number.isInteger(syllableCount) || syllableCount < 1) {
      throw new Error(`[LyricsService] lines[${index}].syllableCount must be a positive integer.`);
    }

    validateChordSymbol(chord);

    const expectedChord = params.activeChords[index % params.activeChords.length];
    if (chord !== expectedChord) {
      throw new Error(
        `[LyricsService] lines[${index}].chord must follow the active chord cycle. Expected '${expectedChord}', received '${chord}'.`,
      );
    }

    return {
      text,
      chord,
      syllableCount,
      rhymeLabel: normalizeRhymeLabel(rhymeLabel, index),
    };
  });

  const normalizedResult: LyricsResult = {
    lines,
    detectedScheme,
    emotionalTag,
    chordProOutput: toChordProFormat({
      lines,
      detectedScheme,
      emotionalTag,
      chordProOutput: rawChordProOutput,
    }),
  };

  return normalizedResult;
}

export function toChordProFormat(result: LyricsResult): string {
  return result.lines
    .map((line) => `[${line.chord}]${line.text}`)
    .join('\n');
}
