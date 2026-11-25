import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookmarkPlus,
  Check,
  Link2,
  Play,
  Square,
  Timer,
  Volume2,
  X,
} from 'lucide-react';

interface TransportBarProps {
  isPlaying: boolean;
  bpm: number;
  activeBeat: number;
  countInBeat: number | null;
  metronomeEnabled: boolean;
  countInEnabled: boolean;
  defaultSaveName: string;
  onTogglePlay: () => void;
  onChangeBpm: (bpm: number) => void;
  onToggleMetronome: () => void;
  onToggleCountIn: () => void;
  onShare: () => void;
  onSave: (name: string) => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  bpm,
  activeBeat,
  countInBeat,
  metronomeEnabled,
  countInEnabled,
  defaultSaveName,
  onTogglePlay,
  onChangeBpm,
  onToggleMetronome,
  onToggleCountIn,
  onShare,
  onSave,
}) => {
  const [isSavingInline, setIsSavingInline] = useState(false);
  const [saveName, setSaveName] = useState('');
  const tapTimesRef = useRef<number[]>([]);

  const openSavePrompt = () => {
    setSaveName(defaultSaveName);
    setIsSavingInline(true);
  };

  const handleConfirmSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(saveName.trim() || defaultSaveName);
    setIsSavingInline(false);
  };

  const nudgeBpm = (delta: number) => {
    onChangeBpm(Math.max(50, Math.min(160, bpm + delta)));
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 2000);
    const updated = [...recent, now].slice(-5);
    tapTimesRef.current = updated;

    if (updated.length >= 2) {
      let sumIntervals = 0;
      for (let i = 1; i < updated.length; i++) {
        sumIntervals += updated[i] - updated[i - 1];
      }
      const avgMs = sumIntervals / (updated.length - 1);
      if (avgMs > 0) {
        const tappedBpm = Math.round(60000 / avgMs);
        onChangeBpm(Math.max(50, Math.min(160, tappedBpm)));
      }
    }
  };

  return (
    <div className="sticky bottom-3 sm:bottom-4 z-30 w-full">
      <div className="surface-card bg-white/92 backdrop-blur-md p-3.5 sm:p-4 shadow-[0_12px_32px_-14px_rgba(17,17,17,0.16)]">
        {/* Inline Save Form cleanly inside bar */}
        <AnimatePresence initial={false}>
          {isSavingInline && (
            <motion.form
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16 }}
              onSubmit={handleConfirmSave}
              className="mb-3 pb-3 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
            <label
              htmlFor="save-prog-name"
              className="text-xs font-medium text-[var(--color-ink-secondary)] shrink-0"
            >
              Nombre:
            </label>
            <input
              id="save-prog-name"
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Ej. Vuelta tranquila en Sol"
              autoFocus
              className="flex-1 min-w-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-board)] px-3.5 py-1.5 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button type="submit" className="btn-primary px-4 py-1.5 text-xs">
                <Check className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
              <button
                type="button"
                onClick={() => setIsSavingInline(false)}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>
            </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Flex-wrap guarantees nothing ever overflows container width at 1920px or 390px */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* Group A: Playback + Beat Dots + Tempo */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onTogglePlay}
              className={`rounded-full px-4 py-2 text-xs font-medium inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                isPlaying
                  ? 'bg-[var(--color-accent)] text-white hover:opacity-90'
                  : 'bg-[var(--color-ink)] text-white hover:opacity-88'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Detener</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Escuchar loop</span>
                </>
              )}
            </button>

            {/* 4-Beat Indicator */}
            <div
              className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-board)] px-3 py-2.5"
              aria-label="Pulso del compás"
            >
              {countInBeat !== null ? (
                <span className="font-mono text-xs font-medium text-[var(--color-accent)] px-1">
                  Cuenta · {countInBeat}
                </span>
              ) : (
                [0, 1, 2, 3].map((beatIdx) => {
                  const isLit = isPlaying && activeBeat === beatIdx;
                  return (
                    <motion.span
                      key={beatIdx}
                      initial={false}
                      animate={{ scale: isLit ? 1.25 : 1 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 24 }}
                      className="h-2 w-2 rounded-full transition-colors duration-150"
                      style={{
                        backgroundColor: isLit
                          ? beatIdx === 0
                            ? 'var(--color-accent)'
                            : 'var(--color-ink)'
                          : 'var(--color-border)',
                      }}
                    />
                  );
                })
              )}
            </div>

            {/* Tempo Fader + Tap */}
            <div className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-board)] px-2.5 py-1">
              <button
                type="button"
                onClick={() => nudgeBpm(-5)}
                aria-label="Bajar 5 BPM"
                className="rounded-full px-1.5 py-1 font-mono text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
              >
                -5
              </button>
              <input
                id="bpm-slider"
                type="range"
                min={50}
                max={160}
                step={1}
                value={bpm}
                onChange={(e) => onChangeBpm(Number(e.target.value))}
                aria-label="Tempo en BPM"
                className="studio-slider w-16 sm:w-20"
              />
              <button
                type="button"
                onClick={() => nudgeBpm(5)}
                aria-label="Subir 5 BPM"
                className="rounded-full px-1.5 py-1 font-mono text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
              >
                +5
              </button>
              <span className="font-mono text-xs font-medium text-[var(--color-ink)] num-tabular pl-1.5 border-l border-[var(--color-border)] whitespace-nowrap">
                {bpm} <span className="text-[var(--color-ink-muted)]">BPM</span>
              </span>
              <button
                type="button"
                onClick={handleTapTempo}
                title="Marca el ritmo haciendo clic varias veces"
                className="ml-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 font-mono text-[11px] uppercase text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors cursor-pointer"
              >
                Tap
              </button>
            </div>
          </div>

          {/* Group B: Practice Controls + Share & Save */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={onToggleMetronome}
              aria-pressed={metronomeEnabled}
              className={`rounded-full border px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                metronomeEnabled
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                  : 'border-[var(--color-border)] bg-transparent text-[var(--color-ink)] hover:border-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Metrónomo</span>
            </button>

            <button
              type="button"
              onClick={onToggleCountIn}
              aria-pressed={countInEnabled}
              className={`rounded-full border px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                countInEnabled
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                  : 'border-[var(--color-border)] bg-transparent text-[var(--color-ink)] hover:border-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)]'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Cuenta 1-4</span>
            </button>

            <button
              type="button"
              onClick={onShare}
              className="btn-secondary px-3 py-2 text-xs whitespace-nowrap"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Compartir</span>
            </button>

            {!isSavingInline && (
              <button
                type="button"
                onClick={openSavePrompt}
                className="btn-secondary px-3.5 py-2 text-xs whitespace-nowrap border-[var(--color-ink)]"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Guardar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
