import { useCallback, useEffect, useState } from 'react';
import type { BackupExportResult, SavedSessionSummary } from '../services/storageService';
import {
  deleteSession as deleteStoredSession,
  exportSessionsBackup,
  importSessionsBackup,
  listSessions,
  loadSession as loadStoredSession,
  saveSession as saveStoredSession,
} from '../services/storageService';
import type { SessionSnapshot } from '../utils';

export interface UseStorageResult {
  sessions: SavedSessionSummary[];
  isLoading: boolean;
  error: string | null;
  refreshSessions: () => Promise<void>;
  saveSession: (snapshot: SessionSnapshot, name?: string) => Promise<string>;
  loadSession: (id: string) => Promise<SessionSnapshot>;
  deleteSession: (id: string) => Promise<void>;
  exportBackup: () => Promise<BackupExportResult>;
  importBackup: (file: File) => Promise<number>;
}

async function withStorageState<T>(setLoading: (value: boolean) => void, fn: () => Promise<T>): Promise<T> {
  setLoading(true);
  try {
    return await fn();
  } finally {
    setLoading(false);
  }
}

export function useStorage(): UseStorageResult {
  const [sessions, setSessions] = useState<SavedSessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    setError(null);
    try {
      const nextSessions = await withStorageState(setIsLoading, listSessions);
      setSessions(nextSessions);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown storage error.';
      setError(message);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshSessions();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshSessions]);

  const saveSession = useCallback(async (snapshot: SessionSnapshot, name?: string) => {
    setError(null);
    try {
      const id = await withStorageState(setIsLoading, () => saveStoredSession(snapshot, name));
      await refreshSessions();
      return id;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown storage error.';
      setError(message);
      throw caughtError;
    }
  }, [refreshSessions]);

  const loadSession = useCallback(async (id: string) => {
    setError(null);
    try {
      return await withStorageState(setIsLoading, () => loadStoredSession(id));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown storage error.';
      setError(message);
      throw caughtError;
    }
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    setError(null);
    try {
      await withStorageState(setIsLoading, () => deleteStoredSession(id));
      await refreshSessions();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown storage error.';
      setError(message);
      throw caughtError;
    }
  }, [refreshSessions]);

  const exportBackup = useCallback(async () => {
    setError(null);
    try {
      return await withStorageState(setIsLoading, exportSessionsBackup);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown storage error.';
      setError(message);
      throw caughtError;
    }
  }, []);

  const importBackup = useCallback(async (file: File) => {
    setError(null);
    try {
      const imported = await withStorageState(setIsLoading, () => importSessionsBackup(file));
      await refreshSessions();
      return imported;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown storage error.';
      setError(message);
      throw caughtError;
    }
  }, [refreshSessions]);

  return {
    sessions,
    isLoading,
    error,
    refreshSessions,
    saveSession,
    loadSession,
    deleteSession,
    exportBackup,
    importBackup,
  };
}