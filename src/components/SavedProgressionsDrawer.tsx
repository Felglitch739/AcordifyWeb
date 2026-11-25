import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, BookmarkPlus, Cloud, LogOut, Play, Trash2, X } from 'lucide-react';
import type { AuthUserSummary } from '../lib/neonAuth';
import type { SavedProgression } from '../storage';
import { MOOD_OPTIONS } from '../theory';

interface SavedProgressionsDrawerProps {
  isOpen: boolean;
  items: SavedProgression[];
  defaultSaveName?: string;
  storageMode?: 'local' | 'cloud';
  isAuthConfigured?: boolean;
  authUser?: AuthUserSummary | null;
  onOpenAuth?: () => void;
  onSignOut?: () => void;
  onQuickSave?: (name: string) => void;
  onClose: () => void;
  onLoad: (item: SavedProgression) => void;
  onDelete: (id: string) => void;
}

function formatSavedDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const SavedProgressionsDrawer: React.FC<SavedProgressionsDrawerProps> = ({
  isOpen,
  items,
  defaultSaveName = '',
  storageMode = 'local',
  isAuthConfigured = false,
  authUser = null,
  onOpenAuth,
  onSignOut,
  onQuickSave,
  onClose,
  onLoad,
  onDelete,
}) => {
  const [quickName, setQuickName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="saved-drawer-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex justify-end bg-[var(--color-backdrop)] backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-drawer-title"
        >
          <motion.div
            key="saved-drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md border-l border-[var(--color-border)] bg-[var(--color-surface)] p-6 flex flex-col shadow-[0_24px_60px_-20px_rgba(17,17,17,0.3)]"
          >
        <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              {storageMode === 'cloud' ? (
                <>
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Sincronizado en la nube</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Libreta en este navegador</span>
                </>
              )}
            </p>
            <h2
              id="saved-drawer-title"
              className="text-2xl font-medium text-[var(--color-ink)] mt-1"
            >
              Progresiones guardadas
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cerrar</span>
          </button>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {onQuickSave && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const targetName = quickName.trim() || defaultSaveName || 'Progresión guardada';
                onQuickSave(targetName);
                setQuickName('');
              }}
              className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-3 space-y-2"
            >
              <label
                htmlFor="drawer-quick-save-name"
                className="block font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]"
              >
                Guardar progresión actual
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="drawer-quick-save-name"
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder={defaultSaveName || 'Ej. Balada en Sol'}
                  className="flex-1 min-w-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:outline-none"
                />
                <button type="submit" className="btn-primary px-3 py-1.5 text-xs shrink-0">
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
              </div>
            </form>
          )}

          {items.length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface-board)] p-6 text-center">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                Todavía no guardas ninguna progresión.
              </p>
              <p className="text-sm text-[var(--color-ink-secondary)] mt-2 leading-relaxed">
                Arma una combinación que te guste y pulsa &ldquo;Guardar&rdquo; abajo para retomarla después.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const moodLabel = MOOD_OPTIONS.find((m) => m.id === item.mood)?.label ?? item.mood;
              return (
                <div
                  key={item.id}
                  className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-medium text-[var(--color-ink)]">
                        {item.name}
                      </h3>
                      <p className="text-xs text-[var(--color-ink-secondary)] mt-0.5">
                        {item.keyRoot} {item.mode === 'major' ? 'Mayor' : 'Menor'} · {moodLabel} · {item.bpm} BPM
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
                      {formatSavedDate(item.savedAt)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {item.chordSymbols.map((chord, idx) => (
                      <span key={`${item.id}-${idx}`} className="chord-chip">
                        {chord}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onLoad(item)}
                      className="btn-primary flex-1 px-3 py-2 text-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Cargar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      aria-label={`Eliminar ${item.name}`}
                      className="btn-secondary px-3 py-2 text-xs text-[var(--color-ink-secondary)] hover:text-[var(--color-accent)]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Discreet Optional Cloud Sync Footer inside Libreta */}
        {isAuthConfigured && (
          <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex items-center justify-between gap-2 text-xs">
            {authUser ? (
              <>
                <span className="text-[var(--color-ink-secondary)] truncate">
                  Cuenta: <span className="text-[var(--color-ink)] font-medium">{authUser.name || authUser.email}</span>
                </span>
                {onSignOut && (
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="btn-secondary px-2.5 py-1 text-xs shrink-0"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Salir</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <span className="text-[var(--color-ink-muted)]">
                  Guardado local
                </span>
                {onOpenAuth && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="text-xs font-medium text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-accent)] transition-colors cursor-pointer shrink-0"
                  >
                    Sincronizar con Google
                  </button>
                )}
              </>
            )}
          </div>
        )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
