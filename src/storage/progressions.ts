import { MAJOR_KEYS, MINOR_KEYS, MOOD_OPTIONS, type Mode, type MoodId } from '../theory';

const STORAGE_KEY = 'acordify_saved_progressions_v1';

export interface SavedProgression {
  id: string;
  name: string;
  keyRoot: string;
  mode: Mode;
  mood: MoodId;
  bpm: number;
  degrees: number[];
  chordSymbols: string[];
  savedAt: string;
}

export interface SaveProgressionInput {
  name: string;
  keyRoot: string;
  mode: Mode;
  mood: MoodId;
  bpm: number;
  degrees: number[];
  chordSymbols: string[];
}

export interface ShareableProgressionState {
  keyRoot: string;
  mode: Mode;
  mood: MoodId;
  bpm: number;
  degrees: number[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidMode(value: unknown): value is Mode {
  return value === 'major' || value === 'minor';
}

function isValidMood(value: unknown): value is MoodId {
  return typeof value === 'string' && MOOD_OPTIONS.some((m) => m.id === value);
}

function isValidKeyForMode(keyRoot: unknown, mode: Mode): keyRoot is string {
  if (typeof keyRoot !== 'string') return false;
  const validKeys = mode === 'major' ? MAJOR_KEYS : MINOR_KEYS;
  return validKeys.includes(keyRoot);
}

function isValidDegrees(degrees: unknown): degrees is number[] {
  return (
    Array.isArray(degrees) &&
    degrees.length === 4 &&
    degrees.every((d) => typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 7)
  );
}

function sanitizeSavedRecord(raw: unknown): SavedProgression | null {
  if (!isRecord(raw)) return null;
  if (
    typeof raw.id !== 'string' ||
    typeof raw.name !== 'string' ||
    typeof raw.savedAt !== 'string' ||
    typeof raw.bpm !== 'number' ||
    !Number.isFinite(raw.bpm) ||
    !isValidMode(raw.mode) ||
    !isValidMood(raw.mood) ||
    !isValidKeyForMode(raw.keyRoot, raw.mode) ||
    !isValidDegrees(raw.degrees) ||
    !Array.isArray(raw.chordSymbols) ||
    raw.chordSymbols.length !== 4 ||
    !raw.chordSymbols.every((s) => typeof s === 'string')
  ) {
    return null;
  }

  return {
    id: raw.id,
    name: raw.name,
    keyRoot: raw.keyRoot,
    mode: raw.mode,
    mood: raw.mood,
    bpm: Math.max(40, Math.min(220, Math.round(raw.bpm))),
    degrees: [...raw.degrees],
    chordSymbols: [...raw.chordSymbols],
    savedAt: raw.savedAt,
  };
}

function readStorageRaw(): SavedProgression[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeSavedRecord)
      .filter((item): item is SavedProgression => item !== null);
  } catch {
    return [];
  }
}

function writeStorageRaw(items: SavedProgression[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `prog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function listSavedProgressions(): SavedProgression[] {
  return readStorageRaw().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function saveProgression(input: SaveProgressionInput): SavedProgression {
  const existing = readStorageRaw();
  const cleanName = input.name.trim() || `${input.keyRoot} ${input.mode === 'major' ? 'Mayor' : 'Menor'}`;

  const record: SavedProgression = {
    id: generateId(),
    name: cleanName,
    keyRoot: input.keyRoot,
    mode: input.mode,
    mood: input.mood,
    bpm: Math.max(40, Math.min(220, Math.round(input.bpm))),
    degrees: input.degrees.slice(0, 4),
    chordSymbols: input.chordSymbols.slice(0, 4),
    savedAt: new Date().toISOString(),
  };

  writeStorageRaw([record, ...existing]);
  return record;
}

export function deleteProgression(id: string): SavedProgression[] {
  const next = readStorageRaw().filter((item) => item.id !== id);
  writeStorageRaw(next);
  return next.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function encodeProgressionToQuery(state: ShareableProgressionState): string {
  const params = new URLSearchParams();
  params.set('k', state.keyRoot);
  params.set('m', state.mode);
  params.set('mood', state.mood);
  params.set('bpm', String(Math.max(40, Math.min(220, Math.round(state.bpm)))));
  params.set('d', state.degrees.slice(0, 4).join(','));
  return `?${params.toString()}`;
}

export function decodeProgressionFromQuery(search: string): ShareableProgressionState | null {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    const k = params.get('k');
    const m = params.get('m');
    const mood = params.get('mood');
    const bpmRaw = params.get('bpm');
    const dRaw = params.get('d');

    if (!isValidMode(m) || !isValidKeyForMode(k, m) || !isValidMood(mood) || !dRaw) {
      return null;
    }

    const degrees = dRaw.split(',').map((part) => Number(part.trim()));
    if (!isValidDegrees(degrees)) {
      return null;
    }

    const parsedBpm = Number(bpmRaw);
    const defaultMoodBpm = MOOD_OPTIONS.find((opt) => opt.id === mood)?.defaultBpm ?? 80;
    const bpm = Number.isFinite(parsedBpm) && parsedBpm >= 40 && parsedBpm <= 220
      ? Math.round(parsedBpm)
      : defaultMoodBpm;

    return {
      keyRoot: k,
      mode: m,
      mood,
      bpm,
      degrees,
    };
  } catch {
    return null;
  }
}
