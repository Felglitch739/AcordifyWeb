import JSZip from 'jszip';
import { parseSessionSnapshot, type SessionSnapshot } from '../utils';
import { openDB } from 'idb';

const DB_NAME = 'acordify-web';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

export interface SavedSessionRecord {
  id: string;
  name: string;
  savedAt: string;
  snapshot: SessionSnapshot;
}

export interface SavedSessionSummary {
  id: string;
  name: string;
  savedAt: string;
  mood: string;
  bpm: number;
}

export interface BackupExportResult {
  filename: string;
  blob: Blob;
}

async function getDb() {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });

  return db;
}

function toSummary(record: SavedSessionRecord): SavedSessionSummary {
  return {
    id: record.id,
    name: record.name,
    savedAt: record.savedAt,
    mood: record.snapshot.metadata.mood,
    bpm: record.snapshot.metadata.bpm,
  };
}

function ensureSessionRecord(value: unknown): SavedSessionRecord {
  if (typeof value !== 'object' || value === null) {
    throw new Error('[StorageService] Invalid session record.');
  }

  const record = value as Partial<SavedSessionRecord>;

  if (
    typeof record.id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.savedAt !== 'string' ||
    typeof record.snapshot !== 'object' ||
    record.snapshot === null
  ) {
    throw new Error('[StorageService] Invalid session record shape.');
  }

  const snapshot = parseSessionSnapshot(JSON.stringify(record.snapshot));

  return {
    id: record.id,
    name: record.name,
    savedAt: record.savedAt,
    snapshot,
  };
}

export async function saveSession(snapshot: SessionSnapshot, name?: string): Promise<string> {
  const db = await getDb();

  const record: SavedSessionRecord = {
    id: crypto.randomUUID(),
    name: name?.trim() || snapshot.metadata.title,
    savedAt: new Date().toISOString(),
    snapshot,
  };

  await db.put(STORE_NAME, record);
  return record.id;
}

export async function upsertSession(record: SavedSessionRecord): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, record);
}

export async function listSessions(): Promise<SavedSessionSummary[]> {
  const db = await getDb();
  const records = await db.getAll(STORE_NAME);
  const normalized = records.map(ensureSessionRecord);
  return normalized.sort((a, b) => b.savedAt.localeCompare(a.savedAt)).map(toSummary);
}

export async function loadSession(id: string): Promise<SessionSnapshot> {
  const db = await getDb();
  const record = await db.get(STORE_NAME, id as any);
  if (!record) {
    throw new Error(`[StorageService] Session '${id}' was not found.`);
  }

  return ensureSessionRecord(record).snapshot;
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id as any);
}

export async function exportSessionsBackup(): Promise<BackupExportResult> {
  const db = await getDb();
  const records = await db.getAll(STORE_NAME);
  const zip = new JSZip();
  const normalizedRecords = records.map(ensureSessionRecord);

  zip.file(
    'manifest.json',
    JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        sessions: normalizedRecords.map((record) => ({
          id: record.id,
          name: record.name,
          savedAt: record.savedAt,
        })),
      },
      null,
      2,
    ),
  );

  normalizedRecords.forEach((record) => {
    zip.file(`sessions/${record.id}.json`, JSON.stringify(record, null, 2));
  });

  return {
    filename: `acordify-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`,
    blob: await zip.generateAsync({ type: 'blob' }),
  };
}

export async function importSessionsBackup(file: File): Promise<number> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sessionFiles = Object.values(zip.files).filter(
    (entry) => !entry.dir && entry.name.startsWith('sessions/') && entry.name.endsWith('.json'),
  );

  let importedCount = 0;
  const db = await getDb();

  for (const entry of sessionFiles) {
    const raw = await entry.async('string');
    const record = ensureSessionRecord(JSON.parse(raw));
    await db.put(STORE_NAME, record as any);
    importedCount += 1;
  }

  return importedCount;
}

// JSON export/import (single-file backup) — faster roundtrip and human-readable
export async function exportSessionsJson(): Promise<BackupExportResult> {
  const db = await getDb();
  const records = await db.getAll(STORE_NAME);
  const normalized = records.map(ensureSessionRecord);

  const payload = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    sessions: normalized,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });

  return {
    filename: `acordify-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.acordify-backup.json`,
    blob,
  };
}

export async function importSessionsJson(file: File): Promise<number> {
  const raw = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error('[StorageService] Invalid JSON backup file.');
  }

  if (typeof parsed !== 'object' || parsed === null || !Array.isArray((parsed as any).sessions)) {
    throw new Error('[StorageService] Backup JSON missing sessions array.');
  }

  const sessions = (parsed as any).sessions as unknown[];
  let imported = 0;
  const db = await getDb();
  for (const s of sessions) {
    const record = ensureSessionRecord(s);
    await db.put(STORE_NAME, record as any);
    imported += 1;
  }

  return imported;
}