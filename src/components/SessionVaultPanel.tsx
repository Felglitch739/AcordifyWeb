import React, { useRef } from 'react';
import type { SavedSessionSummary } from '../services/storageService';
import { TactileButton } from './TactileButton';

interface SessionVaultPanelProps {
  sessions: SavedSessionSummary[];
  isLoading: boolean;
  error: string | null;
  onSaveCurrent: () => void;
  onLoadSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onRefresh: () => void;
}

export const SessionVaultPanel: React.FC<SessionVaultPanelProps> = ({
  sessions,
  isLoading,
  error,
  onSaveCurrent,
  onLoadSession,
  onDeleteSession,
  onExportBackup,
  onImportBackup,
  onRefresh,
}) => {
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    void onImportBackup(file);
  };

  return (
    <div className="border border-zinc-700 bg-zinc-800 p-4 rounded-sm shadow-md select-none flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
        <span className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
          [VAULT] // SESSION STORAGE
        </span>
        <span className="text-[9px] font-mono text-zinc-600 uppercase">
          {sessions.length} SAVED
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <TactileButton variant="green" onClick={onSaveCurrent} className="px-3! py-2! text-2xs!">
          SAVE SESSION
        </TactileButton>
        <TactileButton variant="zinc" onClick={onRefresh} className="px-3! py-2! text-2xs!">
          REFRESH
        </TactileButton>
        <TactileButton variant="zinc" onClick={onExportBackup} className="px-3! py-2! text-2xs!">
          EXPORT BACKUP
        </TactileButton>
        <TactileButton variant="zinc" onClick={handleImportClick} className="px-3! py-2! text-2xs!">
          IMPORT BACKUP
        </TactileButton>
      </div>

      <input
        ref={importInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={handleFileChange}
      />

      {error ? (
        <div className="border border-red-900/60 bg-zinc-950 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-red-400">
          ERR // {error}
        </div>
      ) : null}

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <div className="border border-zinc-800 bg-zinc-950 px-3 py-3 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">
            No stored sessions yet.
          </div>
        ) : (
          sessions.map((session) => (
            <div key={session.id} className="border border-zinc-800 bg-zinc-950 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-stone-200">{session.name}</div>
                  <div className="text-zinc-600">
                    {session.mood} // {session.bpm} BPM
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onLoadSession(session.id)}
                    disabled={isLoading}
                    className="border border-zinc-700 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-emerald-400 disabled:opacity-50"
                  >
                    LOAD
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteSession(session.id)}
                    disabled={isLoading}
                    className="border border-zinc-700 px-2 py-1 text-[9px] uppercase tracking-[0.16em] text-red-400 disabled:opacity-50"
                  >
                    DEL
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};