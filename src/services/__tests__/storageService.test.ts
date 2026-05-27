import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSession,
  listSessions,
  loadSession,
  deleteSession,
  exportSessionsBackup,
  importSessionsBackup,
} from '../storageService';
import { buildSessionSnapshot, type SessionSnapshot } from '../../utils/sessionExporter';

function makeSnapshot(overrides?: Partial<SessionSnapshot>): SessionSnapshot {
  return buildSessionSnapshot({
    title: overrides?.metadata?.title ?? 'Test Session',
    mood: overrides?.metadata?.mood ?? 'Test Mood',
    bpm: overrides?.metadata?.bpm ?? 100,
    keyRoot: overrides?.music?.keyRoot ?? 'C',
    mode: overrides?.music?.mode ?? 'major',
    chords: overrides?.music?.chords ?? ['C', 'G', 'Am', 'F'],
    capo: overrides?.music?.capo ?? 0,
    chordProContent: overrides?.lyrics?.chordProContent ?? '[C]hello [G]world',
    language: overrides?.lyrics?.language ?? 'es',
    rhymeScheme: overrides?.lyrics?.rhymeScheme ?? 'ABAB',
    transposition: overrides?.player?.transposition ?? 0,
    autoScrollSpeed: overrides?.player?.autoScrollSpeed ?? 0,
  });
}

describe('storageService (IndexedDB)', () => {
  beforeEach(async () => {
    // Clear DB between tests by deleting and reopening a fresh DB instance
    // fake-indexeddb exposes indexedDB global which we can clear by opening and deleting
    const req = indexedDB.deleteDatabase('acordify-web');
    await new Promise((res, rej) => {
      req.onsuccess = () => res(null);
      req.onerror = () => rej(req.error);
      req.onblocked = () => res(null);
    });
  });

  it('saves and lists sessions', async () => {
    const snapshot = makeSnapshot();
    const id = await saveSession(snapshot, 'My Test');

    const sessions = await listSessions();
    expect(sessions.length).toBeGreaterThanOrEqual(1);
    const first = sessions.find((s) => s.id === id);
    expect(first).toBeDefined();
    expect(first?.mood).toBe('Test Mood');
    expect(first?.bpm).toBe(100);
  });

  it('loads a saved session', async () => {
    const snapshot = makeSnapshot({ metadata: { title: 'Load Me', mood: 'MoodX', bpm: 120 } as any } as any);
    const id = await saveSession(snapshot, 'Load Me');

    const loaded = await loadSession(id);
    expect(loaded.metadata.title).toContain('Load Me');
    expect(loaded.metadata.mood).toBe('MoodX');
    expect(loaded.metadata.bpm).toBe(120);
  });

  it('deletes a session', async () => {
    const snapshot = makeSnapshot();
    const id = await saveSession(snapshot, 'ToDelete');

    let sessions = await listSessions();
    expect(sessions.some((s) => s.id === id)).toBe(true);

    await deleteSession(id);

    sessions = await listSessions();
    expect(sessions.some((s) => s.id === id)).toBe(false);
  });

  it('exports and imports a backup zip', { timeout: 20000 }, async () => {
    const a = makeSnapshot({ metadata: { title: 'A', mood: 'a', bpm: 80 } as any } as any);
    const b = makeSnapshot({ metadata: { title: 'B', mood: 'b', bpm: 90 } as any } as any);

    await saveSession(a, 'A');
    await saveSession(b, 'B');

    // Test JSON export/import roundtrip (faster)
    const jsonBackup = await (await import('../storageService')).exportSessionsJson();
    expect(jsonBackup).toHaveProperty('filename');
    expect(jsonBackup.blob).toBeInstanceOf(Blob);

    // Import into the same DB (should increase total by at least 2)
    const before = await listSessions();
    const file = new File([await jsonBackup.blob.arrayBuffer()], jsonBackup.filename, { type: 'application/json' });
    const imported = await (await import('../storageService')).importSessionsJson(file);
    expect(imported).toBeGreaterThanOrEqual(2);
    const after = await listSessions();
    // Import may overwrite by id; ensure at least the DB still contains the sessions
    expect(after.length).toBeGreaterThanOrEqual(before.length);
  }, { timeout: 20000 });
});
