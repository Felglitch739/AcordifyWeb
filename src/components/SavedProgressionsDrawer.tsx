import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Cloud, Play, Trash2, X } from 'lucide-react';
import type { SavedProgression } from '../storage';
import { useStudioStyle } from '../styles/useStudioStyle';
import { MOOD_OPTIONS } from '../theory';

interface SavedProgressionsDrawerProps {
  isOpen: boolean;
  items: SavedProgression[];
  storageMode?: 'local' | 'cloud';
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
  storageMode = 'local',
  onClose,
  onLoad,
  onDelete,
}) => {
  const { studioStyle } = useStudioStyle();
  const isApple = studioStyle === 'apple';
  const isVinyl = studioStyle === 'vinyl';

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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex justify-end bg-[var(--backdrop-scrim)] backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-drawer-title"
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className={`h-full w-full max-w-md border-l border-[var(--border-strong)] bg-[var(--bg-surface)] p-6 flex flex-col shadow-2xl ${
              isApple ? 'backdrop-blur-2xl' : ''
            }`}
          >
            <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
              <div>
                <p className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--mood-accent)] font-semibold">
                  {storageMode === 'cloud' ? (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Sincronizado en Neon</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Tu libreta local</span>
                    </>
                  )}
                </p>
                <h2
                  id="saved-drawer-title"
                  className={`text-2xl sm:text-3xl text-[var(--text-primary)] mt-1 ${
                    isVinyl
                      ? 'font-poster font-bold'
                      : isApple
                        ? 'font-semibold tracking-[-0.025em]'
                        : 'font-serif-editorial'
                  }`}
                >
                  Ideas guardadas
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
              {items.length === 0 ? (
                <div className="studio-recessed rounded-2xl border-dashed p-6 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Todavía no guardas ninguna progresión.
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                    Arma una combinación que te guste y presiona &ldquo;Guardar&rdquo; en la consola inferior para retomarla cuando quieras.
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const moodLabel = MOOD_OPTIONS.find((m) => m.id === item.mood)?.label ?? item.mood;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 flex flex-col gap-3 transition-colors ${
                        isVinyl
                          ? 'vinyl-brutal-card'
                          : isApple
                            ? 'rounded-2xl border border-black/[0.06] bg-[var(--bg-recessed)]/75'
                            : 'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-semibold text-[var(--text-primary)]">
                            {item.name}
                          </h3>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                            {item.keyRoot} {item.mode === 'major' ? 'Mayor' : 'Menor'} · {moodLabel} · {item.bpm} BPM
                          </p>
                        </div>
                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
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
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 bg-[var(--mood-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)] hover:brightness-110 transition cursor-pointer ${
                            isVinyl ? 'rounded border border-[#141210]' : isApple ? 'rounded-full' : 'rounded-lg'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Cargar para ensayar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(item.id)}
                          aria-label={`Eliminar ${item.name}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-rose-500 hover:border-rose-500/50 hover:bg-rose-500/10 transition cursor-pointer"
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
