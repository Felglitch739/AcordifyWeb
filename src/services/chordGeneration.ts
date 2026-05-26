import { validateProgression, type ProgressionValidationResult, parseChord } from '../utils';

export type ChordMode = 'major' | 'minor';
export type ChordComplexity = 'basic' | 'intermediate' | 'advanced';

export interface ChordGenerationParams {
  mood: string;
  keyRoot: string;
  mode: ChordMode;
  bpm: number;
  complexity: ChordComplexity;
  prevChords: string[];
  bars: number;
}

export interface GeneratedChord {
  symbol: string;
  durationBars: 1 | 2;
  rationale: string;
}

export interface ChordGenerationResponse {
  key: string;
  mode: ChordMode;
  bpm: number;
  chords: GeneratedChord[];
  moodTag: string;
  noveltyScore: number;
}

export interface GeneratedChordProgression {
  progression: ChordGenerationResponse;
  validation: ProgressionValidationResult;
}

const SYSTEM_PROMPT = `You are a music-theory expert and creative chord architect for modern songwriting. Generate harmonically coherent, genre-accurate, non-cliche progressions with tension and resolution.

Return ONLY a single JSON object with this exact schema and no extra text:
{
  "key": "string",
  "mode": "string",
  "bpm": number,
  "chords": [{"symbol":"string","durationBars":number,"rationale":"string"}],
  "moodTag": "string",
  "noveltyScore": number
}

Rules: use the given key and mode; non-diatonic chords must be valid borrowed chords or secondary dominants. Never repeat PREV_CHORDS: at least 2 chords must differ and the order must not match. I-V-vi-IV is banned unless clearly disguised with extensions/substitutions/inversions. Include at least one tension chord that resolves later. One-sentence max rationale per chord. Use exactly the requested number of chords.

Never generate this:
1) {"key":"A","mode":"minor","bpm":90,"chords":[{"symbol":"Am","durationBars":1,"rationale":"tonic"},{"symbol":"F","durationBars":1,"rationale":"submediant"},{"symbol":"C","durationBars":1,"rationale":"relative major"},{"symbol":"G","durationBars":1,"rationale":"dominant"}],"moodTag":"generic","noveltyScore":1} Why: cliche and no tension.
2) {"key":"C","mode":"major","bpm":100,"chords":[{"symbol":"C","durationBars":1,"rationale":"tonic"},{"symbol":"C","durationBars":1,"rationale":"tonic"},{"symbol":"C","durationBars":1,"rationale":"tonic"},{"symbol":"C","durationBars":1,"rationale":"tonic"}],"moodTag":"flat","noveltyScore":0} Why: no movement.
3) {"key":"D","mode":"minor","bpm":80,"chords":[{"symbol":"Emaj7","durationBars":1,"rationale":"color"},{"symbol":"G#maj7","durationBars":1,"rationale":"color"},{"symbol":"C#maj7","durationBars":1,"rationale":"color"},{"symbol":"F#maj7","durationBars":1,"rationale":"color"}],"moodTag":"random","noveltyScore":3} Why: unrelated to key and mode.

Target quality examples:
A) {"key":"A","mode":"minor","bpm":88,"chords":[{"symbol":"Am9","durationBars":1,"rationale":"sets minor color"},{"symbol":"Dm9","durationBars":1,"rationale":"prepares ii-V motion"},{"symbol":"E7b9","durationBars":1,"rationale":"tension for resolution"},{"symbol":"Am6","durationBars":1,"rationale":"soft release"}],"moodTag":"melancholic jazz","noveltyScore":7}
B) {"key":"E","mode":"major","bpm":120,"chords":[{"symbol":"E5","durationBars":1,"rationale":"driving tonic power"},{"symbol":"Aadd9","durationBars":1,"rationale":"open lift"},{"symbol":"C#sus4","durationBars":1,"rationale":"pushes tension"},{"symbol":"D","durationBars":1,"rationale":"bVII surprise release"}],"moodTag":"energetic indie rock","noveltyScore":8}`;

const MOOD_HINTS: Record<string, string> = {
  'Jazzy Melancólico': 'minor extensions, tritone substitutions, ii-V-i, flat 9 tensions',
  'Jazz Melancólico': 'minor extensions, tritone substitutions, ii-V-i, flat 9 tensions',
  'Indie Rock Energético': 'power chords, sus4, bVII, bIII surprises',
  'Indie Rock Energetic': 'power chords, sus4, bVII, bIII surprises',
  'Pop Acústico Relajado': 'open voicings, add9, suspended resolutions',
  'Pop Acoustic Relaxed': 'open voicings, add9, suspended resolutions',
  'Neo-Soul Warm': 'maj9/min9, chromatic approach chords, gentle secondary dominants',
  'Cinematic Ambient': 'pedal tones, quartal voicings, modal interchange, slow release',
};

function stripMarkdownFences(content: string): string {
  const trimmed = content.trim();

  if (trimmed.startsWith('```json')) {
    return trimmed.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
  }

  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
  }

  return trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Field '${fieldName}' must be a non-empty string.`);
  }

  return value;
}

function assertNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Field '${fieldName}' must be a valid number.`);
  }

  return value;
}

function validateChordSymbol(symbol: string): void {
  if (!parseChord(symbol)) {
    throw new Error(`Invalid chord symbol '${symbol}'.`);
  }
}

export function buildChordPrompt(params: ChordGenerationParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const systemPrompt = SYSTEM_PROMPT;
  const moodHint = MOOD_HINTS[params.mood] ?? 'keep the progression fresh, mood-driven, and harmonically coherent';

  const userPrompt = `Generate a chord progression.
Mood: ${params.mood}
Key: ${params.keyRoot} ${params.mode}
BPM: ${params.bpm}
Complexity: ${params.complexity}
Previous progression: ${JSON.stringify(params.prevChords)}
Bars: ${params.bars}

Mood hints: ${moodHint}.
Return only the JSON object.`;

  return { systemPrompt, userPrompt };
}

export function parseChordResponse(raw: string): ChordGenerationResponse {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('Chord response is empty or not a string.');
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(stripMarkdownFences(raw));
  } catch {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('Chord response is not valid JSON.');
    }

    try {
      parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1));
    } catch {
      throw new Error('Chord response contains malformed JSON.');
    }
  }

  if (!isRecord(parsed)) {
    throw new Error('Chord response must be a JSON object.');
  }

  const key = assertString(parsed.key, 'key');
  const mode = assertString(parsed.mode, 'mode') as ChordMode;
  const bpm = assertNumber(parsed.bpm, 'bpm');
  const moodTag = assertString(parsed.moodTag, 'moodTag');
  const noveltyScore = assertNumber(parsed.noveltyScore, 'noveltyScore');

  if (mode !== 'major' && mode !== 'minor') {
    throw new Error("Field 'mode' must be either 'major' or 'minor'.");
  }

  if (!Array.isArray(parsed.chords) || parsed.chords.length === 0) {
    throw new Error("Field 'chords' must be a non-empty array.");
  }

  if (noveltyScore < 0 || noveltyScore > 10) {
    throw new Error("Field 'noveltyScore' must be between 0 and 10.");
  }

  const chords = parsed.chords.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Chord at index ${index} must be an object.`);
    }

    const symbol = assertString(entry.symbol, `chords[${index}].symbol`);
    const rationale = assertString(entry.rationale, `chords[${index}].rationale`);
    const durationBars = assertNumber(entry.durationBars, `chords[${index}].durationBars`);

    if (durationBars !== 1 && durationBars !== 2) {
      throw new Error(`Chord at index ${index} must use durationBars 1 or 2.`);
    }

    validateChordSymbol(symbol);

    return {
      symbol,
      durationBars: durationBars as 1 | 2,
      rationale,
    };
  });

  return {
    key,
    mode,
    bpm,
    chords,
    moodTag,
    noveltyScore,
  };
}

export async function generateChordProgression(
  params: ChordGenerationParams,
): Promise<GeneratedChordProgression> {
  const apiKey = import.meta.env.VITE_AZURE_API_KEY;
  const endpoint = import.meta.env.VITE_AZURE_ENDPOINT;

  if (!apiKey || !endpoint) {
    throw new Error('Azure API Key or Endpoint is missing in .env.local. Please set VITE_AZURE_API_KEY and VITE_AZURE_ENDPOINT.');
  }

  const { systemPrompt, userPrompt } = buildChordPrompt(params);

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
      max_tokens: 450,
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    throw new Error('Chord response is missing assistant content.');
  }

  const progression = parseChordResponse(content);
  const validation = validateProgression(
    progression.chords.map((chord) => chord.symbol),
    params.keyRoot as Parameters<typeof validateProgression>[1],
    params.mode,
  );

  return { progression, validation };
}