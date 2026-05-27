import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildLyricsPrompt, parseLyricsResponse, type LyricsParams, type LyricsResult } from '../services';

export interface UseLyricsControlsOptions {
  activeChords: string[];
  keyRoot: string;
  mode: 'major' | 'minor';
  bpm: number;
  mood: string;
  initialValues?: Partial<Pick<LyricsParams, 'rhymeScheme' | 'emotionalMood' | 'narrativePerson' | 'metaphorDensity' | 'thematicConcept' | 'language' | 'linesToGenerate' | 'genre'>>;
}

export interface UseLyricsControlsResult {
  lyricsParams: LyricsParams;
  rhymeScheme: LyricsParams['rhymeScheme'];
  emotionalMood: number;
  narrativePerson: LyricsParams['narrativePerson'];
  metaphorDensity: LyricsParams['metaphorDensity'];
  thematicConcept: string;
  genre: string;
  language: LyricsParams['language'];
  linesToGenerate: LyricsParams['linesToGenerate'];
  isGenerating: boolean;
  error: string | null;
  result: LyricsResult | null;
  setRhymeScheme: (value: LyricsParams['rhymeScheme']) => void;
  setEmotionalMood: (value: number) => void;
  setNarrativePerson: (value: LyricsParams['narrativePerson']) => void;
  setMetaphorDensity: (value: LyricsParams['metaphorDensity']) => void;
  setThematicConcept: (value: string) => void;
  setGenre: (value: string) => void;
  setLanguage: (value: LyricsParams['language']) => void;
  setLinesToGenerate: (value: LyricsParams['linesToGenerate']) => void;
  generateLyrics: () => Promise<LyricsResult>;
  resetResult: () => void;
}

const DEFAULT_INITIALS = {
  rhymeScheme: 'ABAB' as const,
  emotionalMood: 50,
  narrativePerson: '1ra' as const,
  metaphorDensity: 'balanced' as const,
  thematicConcept: '',
  genre: '',
  language: 'es' as const,
  linesToGenerate: 4 as const,
};

function clampMood(value: number): number {
  if (Number.isNaN(value)) return DEFAULT_INITIALS.emotionalMood;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function clampConcept(value: string): string {
  return value.slice(0, 60);
}

function clampGenre(value: string): string {
  return value.slice(0, 40);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractAssistantContent(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new Error('AI response payload is not an object.');
  }

  const { choices } = payload;
  if (Array.isArray(choices) && choices.length > 0) {
    const [firstChoice] = choices;
    if (isRecord(firstChoice)) {
      const { message } = firstChoice;
      if (isRecord(message) && typeof message.content === 'string') {
        return message.content;
      }
    }
  }

  throw new Error('AI response does not contain assistant content.');
}

function cleanAssistantContent(text: string): string {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}

export function useLyricsControls(options: UseLyricsControlsOptions): UseLyricsControlsResult {
  const [rhymeScheme, setRhymeScheme] = useState<LyricsParams['rhymeScheme']>(options.initialValues?.rhymeScheme ?? DEFAULT_INITIALS.rhymeScheme);
  const [emotionalMood, setEmotionalMoodState] = useState<number>(options.initialValues?.emotionalMood ?? DEFAULT_INITIALS.emotionalMood);
  const [narrativePerson, setNarrativePerson] = useState<LyricsParams['narrativePerson']>(options.initialValues?.narrativePerson ?? DEFAULT_INITIALS.narrativePerson);
  const [metaphorDensity, setMetaphorDensity] = useState<LyricsParams['metaphorDensity']>(options.initialValues?.metaphorDensity ?? DEFAULT_INITIALS.metaphorDensity);
  const [thematicConcept, setThematicConceptState] = useState<string>(options.initialValues?.thematicConcept ?? DEFAULT_INITIALS.thematicConcept);
  const [genre, setGenreState] = useState<string>(options.initialValues?.genre ?? DEFAULT_INITIALS.genre);
  const [language, setLanguage] = useState<LyricsParams['language']>(options.initialValues?.language ?? DEFAULT_INITIALS.language);
  const [linesToGenerate, setLinesToGenerate] = useState<LyricsParams['linesToGenerate']>(options.initialValues?.linesToGenerate ?? DEFAULT_INITIALS.linesToGenerate);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LyricsResult | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const setEmotionalMood = useCallback((value: number) => {
    setEmotionalMoodState(clampMood(value));
  }, []);

  const setThematicConcept = useCallback((value: string) => {
    setThematicConceptState(clampConcept(value));
  }, []);

  const setGenre = useCallback((value: string) => {
    setGenreState(clampGenre(value));
  }, []);

  const lyricsParams: LyricsParams = useMemo(() => ({
    activeChords: options.activeChords,
    keyRoot: options.keyRoot,
    mode: options.mode,
    bpm: options.bpm,
    mood: options.mood,
    genre: clampGenre(genre),
    rhymeScheme,
    emotionalMood,
    narrativePerson,
    metaphorDensity,
    thematicConcept: clampConcept(thematicConcept),
    language,
    linesToGenerate,
  }), [
    options.activeChords,
    options.keyRoot,
    options.mode,
    options.bpm,
    options.mood,
    rhymeScheme,
    emotionalMood,
    narrativePerson,
    metaphorDensity,
    thematicConcept,
    genre,
    language,
    linesToGenerate,
  ]);

  const generateLyrics = useCallback(async () => {
    // If active chords contain placeholders (e.g., during mood-change), substitute a safe fallback
    const hasPlaceholders = lyricsParams.activeChords.some((c) => /LOAD|ERR|SYS_ERR/i.test(c));

    const fallbackChords = ['C', 'G', 'Am', 'F'];
    const paramsToUse = hasPlaceholders
      ? { ...lyricsParams, activeChords: fallbackChords }
      : lyricsParams;

    if (hasPlaceholders) {
      console.warn(
        '[useLyricsControls] activeChords contained placeholders; using fallback progression:',
        fallbackChords,
      );
    }

    setIsGenerating(true);
    console.log('[useLyricsControls] generateLyrics START');
    setError(null);

    try {
      const { systemPrompt, userPrompt } = buildLyricsPrompt(paramsToUse);
      const apiKey = import.meta.env.VITE_AZURE_API_KEY;
      const endpoint = import.meta.env.VITE_AZURE_ENDPOINT;

      if (!apiKey || !endpoint) {
        throw new Error('Azure API Key or Endpoint is missing in .env.local. Please set VITE_AZURE_API_KEY and VITE_AZURE_ENDPOINT.');
      }

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
          temperature: 0.75,
          max_tokens: 700,
        }),
      });

      if (!response.ok) {
        throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
      }

      const payload: unknown = await response.json();
      console.log('[useLyricsControls] raw response:', payload);
      const content = extractAssistantContent(payload);
      const clean = cleanAssistantContent(content);
      const parsed = parseLyricsResponse(clean, paramsToUse);

      console.log('[useLyricsControls] parsed result:', parsed);

      if (mountedRef.current) {
        setResult(parsed);
      }

      return parsed;
    } catch (caughtError) {
      console.error(caughtError);
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown lyrics generation error.';

      if (mountedRef.current) {
        setError(message);
      }

      throw caughtError;
    } finally {
      setIsGenerating(false);
      console.log('[useLyricsControls] generateLyrics END - isGenerating set to false');
    }
  }, [lyricsParams]);

  const resetResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    lyricsParams,
    rhymeScheme,
    emotionalMood,
    narrativePerson,
    metaphorDensity,
    thematicConcept,
    genre,
    language,
    linesToGenerate,
    isGenerating,
    error,
    result,
    setRhymeScheme,
    setEmotionalMood,
    setNarrativePerson,
    setMetaphorDensity,
    setThematicConcept,
    setGenre,
    setLanguage,
    setLinesToGenerate,
    generateLyrics,
    resetResult,
  };
}
