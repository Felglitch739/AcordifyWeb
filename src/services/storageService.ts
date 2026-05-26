import JSZip from 'jszip';
import { parseSessionSnapshot, type SessionSnapshot } from '../utils';

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

function assertIndexedDbAvailable(): void {
  if (typeof indexedDB === 'undefined') {
    throw new Error('[StorageService] IndexedDB is not available in this environment.');
  }
}

function openDatabase(): Promise<IDBDatabase> {
  assertIndexedDbAvailable();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onerror = () => {
      reject(request.error ?? new Error('[StorageService] Failed to open IndexedDB.'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function withStore<T>(mode: IDBTransactionMode, runner: (store: IDBObjectStore) => T): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let resultPromise!: Promise<T>;
        try {
          resultPromise = Promise.resolve(runner(store));
        } catch (error) {
          db.close();
          reject(error);
          return;
        }

        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error('[StorageService] IndexedDB transaction failed.'));
        };

        transaction.oncomplete = () => {
          db.close();
          resultPromise.then(resolve).catch(reject);
        };
      }),
  );
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('[StorageService] IndexedDB request failed.'));
    request.onsuccess = () => resolve(request.result);
  });
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
  const record: SavedSessionRecord = {
    id: crypto.randomUUID(),
    name: name?.trim() || snapshot.metadata.title,
    savedAt: new Date().toISOString(),
    snapshot,
  };

  await withStore('readwrite', (store) => store.put(record));
  return record.id;
}

export async function upsertSession(record: SavedSessionRecord): Promise<void> {
  await withStore('readwrite', (store) => store.put(record));
}

export async function listSessions(): Promise<SavedSessionSummary[]> {
  const records = await withStore('readonly', (store) => requestToPromise(store.getAll()));
  return records.map(ensureSessionRecord).sort((left, right) => right.savedAt.localeCompare(left.savedAt)).map(toSummary);
}

export async function loadSession(id: string): Promise<SessionSnapshot> {
  const record = await withStore('readonly', (store) => requestToPromise(store.get(id)));

  if (!record) {
    throw new Error(`[StorageService] Session '${id}' was not found.`);
  }

  return ensureSessionRecord(record).snapshot;
}

export async function deleteSession(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id));
}

export async function exportSessionsBackup(): Promise<BackupExportResult> {
  const records = await withStore('readonly', (store) => requestToPromise(store.getAll()));
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

  for (const entry of sessionFiles) {
    const raw = await entry.async('string');
    const record = ensureSessionRecord(JSON.parse(raw));
    await upsertSession(record);
    importedCount += 1;
  }

  return importedCount;
}