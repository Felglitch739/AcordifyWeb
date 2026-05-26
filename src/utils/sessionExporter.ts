import type { LyricsParams } from '../services';

export interface SessionMetadata {
  createdAt: string;
  title: string;
  mood: string;
  bpm: number;
}

export interface SessionMusic {
  keyRoot: string;
  mode: 'major' | 'minor';
  chords: string[];
  capo: number;
}

export interface SessionLyrics {
  chordProContent: string;
  language: LyricsParams['language'];
  rhymeScheme: LyricsParams['rhymeScheme'];
}

export interface SessionPlayer {
  bpm: number;
  transposition: number;
  autoScrollSpeed: number;
}

export interface SessionSnapshot {
  version: '1.0';
  metadata: SessionMetadata;
  music: SessionMusic;
  lyrics: SessionLyrics;
  player: SessionPlayer;
}

export interface BuildSessionSnapshotParams {
  title?: string;
  mood: string;
  bpm: number;
  keyRoot: string;
  mode: 'major' | 'minor';
  chords: string[];
  capo: number;
  chordProContent: string;
  language: LyricsParams['language'];
  rhymeScheme: LyricsParams['rhymeScheme'];
  transposition: number;
  autoScrollSpeed: number;
  createdAt?: string;
}

function assertRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function assertString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[SessionExporter] '${fieldName}' must be a non-empty string.`);
  }

  return value;
}

function assertNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`[SessionExporter] '${fieldName}' must be a valid number.`);
  }

  return value;
}

function assertStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`[SessionExporter] '${fieldName}' must be an array of strings.`);
  }

  return value;
}

export function buildSessionSnapshot(params: BuildSessionSnapshotParams): SessionSnapshot {
  return {
    version: '1.0',
    metadata: {
      createdAt: params.createdAt ?? new Date().toISOString(),
      title: params.title?.trim() || `${params.mood} Session`,
      mood: params.mood,
      bpm: params.bpm,
    },
    music: {
      keyRoot: params.keyRoot,
      mode: params.mode,
      chords: params.chords,
      capo: params.capo,
    },
    lyrics: {
      chordProContent: params.chordProContent,
      language: params.language,
      rhymeScheme: params.rhymeScheme,
    },
    player: {
      bpm: params.bpm,
      transposition: params.transposition,
      autoScrollSpeed: params.autoScrollSpeed,
    },
  };
}

export function serializeSessionSnapshot(snapshot: SessionSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}

export function parseSessionSnapshot(raw: string): SessionSnapshot {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('[SessionExporter] Session payload is empty or invalid.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('[SessionExporter] Session payload is not valid JSON.');
  }

  if (!assertRecord(parsed)) {
    throw new Error('[SessionExporter] Parsed payload must be an object.');
  }

  const version = assertString(parsed.version, 'version');
  if (version !== '1.0') {
    throw new Error(`[SessionExporter] Unsupported session version '${version}'.`);
  }

  if (!assertRecord(parsed.metadata) || !assertRecord(parsed.music) || !assertRecord(parsed.lyrics) || !assertRecord(parsed.player)) {
    throw new Error('[SessionExporter] Session payload is missing required sections.');
  }

  const metadata = parsed.metadata;
  const music = parsed.music;
  const lyrics = parsed.lyrics;
  const player = parsed.player;

  const snapshot: SessionSnapshot = {
    version: '1.0',
    metadata: {
      createdAt: assertString(metadata.createdAt, 'metadata.createdAt'),
      title: assertString(metadata.title, 'metadata.title'),
      mood: assertString(metadata.mood, 'metadata.mood'),
      bpm: assertNumber(metadata.bpm, 'metadata.bpm'),
    },
    music: {
      keyRoot: assertString(music.keyRoot, 'music.keyRoot'),
      mode: music.mode === 'minor' ? 'minor' : 'major',
      chords: assertStringArray(music.chords, 'music.chords'),
      capo: assertNumber(music.capo, 'music.capo'),
    },
    lyrics: {
      chordProContent: assertString(lyrics.chordProContent, 'lyrics.chordProContent'),
      language: lyrics.language === 'en' ? 'en' : 'es',
      rhymeScheme: lyrics.rhymeScheme === 'AABB' || lyrics.rhymeScheme === 'ABBA' || lyrics.rhymeScheme === 'free' ? lyrics.rhymeScheme : 'ABAB',
    },
    player: {
      bpm: assertNumber(player.bpm, 'player.bpm'),
      transposition: assertNumber(player.transposition, 'player.transposition'),
      autoScrollSpeed: assertNumber(player.autoScrollSpeed, 'player.autoScrollSpeed'),
    },
  };

  return snapshot;
}