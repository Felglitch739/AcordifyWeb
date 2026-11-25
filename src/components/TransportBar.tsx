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
import { useStudioStyle } from '../styles/useStudioStyle';

interface TransportBarProps {
  isPlaying: boolean;
  bpm: number;
  activeBeat: number;
  countInBeat: number | null;
  metronomeEnabled: boolean;
  countInEnabled: boolean;
  defaultSaveName: string;
  audioMode?: 'sampled' | 'physical';
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
  audioMode = 'sampled',
  onTogglePlay,
  onChangeBpm,
  onToggleMetronome,
  onToggleCountIn,
  onShare,
  onSave,
}) => {
  const { studioStyle } = useStudioStyle();
  const isApple = studioStyle === 'apple';
  const isOp1 = studioStyle === 'op1';
  const isVinyl = studioStyle === 'vinyl';

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

  const shellClass = isApple
    ? 'apple-liquid-glass mx-auto max-w-5xl rounded-3xl lg:rounded-full p-3 sm:px-5 sm:py-3'
    : isOp1
      ? 'op1-chassis rounded-2xl p-3.5 sm:p-4'
      : isVinyl
        ? 'vinyl-brutal-card p-3.5 sm:p-4'
        : 'rounded-2xl border border-[var(--border-strong)] bg-[#161411]/95 backdrop-blur-xl shadow-[0_24px_60px_-15px_rgba(0,0,0,0.88)] p-3.5 sm:p-4';

  const secondaryBtnClass = (active: boolean) => {
    if (isVinyl) {
      return `border-2 border-[#141210] rounded px-2.5 py-2 text-xs font-mono font-bold uppercase inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
        active
          ? 'bg-[var(--mood-accent)] text-[var(--accent-ink)]'
          : 'bg-[#FFFDF7] text-[#141210] hover:bg-[#D4F350]'
      }`;
    }
    if (isOp1) {
      return `op1-keycap rounded-xl px-2.5 py-2 text-xs font-mono font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
        active ? 'ring-2 ring-[#FF5722] text-[#18191B]' : 'text-[#505258] hover:text-[#18191B]'
      }`;
    }
    if (isApple) {
      return `rounded-full px-3 py-2 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
        active
          ? 'bg-[var(--mood-accent)] text-[var(--accent-ink)] shadow-sm'
          : 'bg-black/[0.05] text-[var(--text-primary)] hover:bg-black/[0.09]'
      }`;
    }
    return `rounded-xl border px-2.5 py-2 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
      active
        ? 'border-[var(--mood-border)] bg-[var(--mood-tint)] text-[var(--text-primary)]'
        : 'border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
    }`;
  };

  return (
    <div className="sticky bottom-3 sm:bottom-4 z-30">
      <div className={shellClass}>
        {/* Inline Save Prompt */}
        <AnimatePresence>
          {isSavingInline && (
            <motion.form
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleConfirmSave}
              className="overflow-hidden border-b border-[var(--border-subtle)] pb-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <label htmlFor="save-prog-name" className="text-xs text-[var(--text-secondary)] shrink-0">
                Nombre de la idea:
              </label>
              <input
                id="save-prog-name"
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Ej. Arpegio acústico de domingo"
                autoFocus
                className="flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-recessed)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--mood-accent)] focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--mood-accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-ink)] hover:brightness-110 transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Guardar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSavingInline(false)}
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Left: Play/Stop + Beat LEDs + BPM & Tap */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onTogglePlay}
              className={
                isVinyl
                  ? `border-2 border-[#141210] rounded px-4 py-2 text-xs sm:text-sm font-mono font-bold uppercase inline-flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer whitespace-nowrap ${
                      isPlaying
                        ? 'bg-[#141210] text-[#FFFDF7]'
                        : 'bg-[#E8432D] text-[#FFFDF7] hover:bg-[#D4F350] hover:text-[#141210]'
                    }`
                  : isOp1
                    ? `rounded-full px-4 py-2 text-xs sm:text-sm font-mono font-bold inline-flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer whitespace-nowrap shadow-[0_3px_0_rgba(0,0,0,0.28)] ${
                        isPlaying
                          ? 'bg-[#18191B] text-[#FF784E]'
                          : 'bg-[#FF5722] text-white hover:brightness-105'
                      }`
                    : isApple
                      ? `rounded-full px-4 py-2 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition active:scale-[0.98] cursor-pointer whitespace-nowrap shadow-sm ${
                          isPlaying
                            ? 'bg-[#1D1D1F] text-white'
                            : 'bg-[var(--mood-accent)] text-[var(--accent-ink)] hover:brightness-110'
                        }`
                      : `rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition active:scale-[0.98] cursor-pointer whitespace-nowrap ${
                          isPlaying
                            ? 'border border-[#DE6B48]/70 bg-[#DE6B48]/18 text-[#FADBD1] hover:bg-[#DE6B48]/28'
                            : 'bg-[var(--mood-accent)] text-[var(--accent-ink)] hover:brightness-110'
                        }`
              }
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
              <kbd className="hidden xl:inline-block ml-0.5 rounded border border-current/25 px-1.5 py-0.5 text-[10px] font-mono opacity-75">
                Espacio
              </kbd>
            </button>

            {/* 4-Beat LEDs */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-2.5 ${
                isVinyl
                  ? 'border-2 border-[#141210] rounded bg-[#FFFDF7]'
                  : isOp1
                    ? 'op1-oled-screen rounded-xl'
                    : isApple
                      ? 'rounded-full bg-black/[0.05]'
                      : 'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)]'
              }`}
              aria-label="Pulso del compás"
            >
              {countInBeat !== null ? (
                <span className="text-xs font-mono font-bold text-[#E29552] px-1">
                  Cuenta · {countInBeat}
                </span>
              ) : (
                [0, 1, 2, 3].map((beatIdx) => {
                  const isLit = isPlaying && activeBeat === beatIdx;
                  const offColor = isOp1
                    ? 'rgba(255,255,255,0.18)'
                    : isVinyl || isApple
                      ? 'rgba(29,29,31,0.16)'
                      : 'rgba(245,239,230,0.15)';
                  return (
                    <span
                      key={beatIdx}
                      className="h-2 w-2 rounded-full transition-all duration-100"
                      style={{
                        backgroundColor: isLit
                          ? beatIdx === 0
                            ? isOp1
                              ? '#FF5722'
                              : 'var(--mood-accent)'
                            : isOp1
                              ? '#38BDF8'
                              : 'var(--text-primary)'
                          : offColor,
                        transform: isLit ? 'scale(1.25)' : 'scale(1)',
                      }}
                    />
                  );
                })
              )}
            </div>

            {/* Tempo Control + Tap */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 ${
                isVinyl
                  ? 'border-2 border-[#141210] rounded bg-[#FFFDF7]'
                  : isOp1
                    ? 'rounded-xl border border-black/15 bg-[#DBD7CE]'
                    : isApple
                      ? 'rounded-full bg-black/[0.05] px-3'
                      : 'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)]'
              }`}
            >
              <button
                type="button"
                onClick={() => nudgeBpm(-5)}
                aria-label="Bajar 5 BPM"
                className="rounded-lg px-1.5 py-1 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
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
                className="rounded-lg px-1.5 py-1 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                +5
              </button>
              <span
                className={`font-mono text-xs font-semibold num-tabular pl-1.5 border-l border-[var(--border-subtle)] whitespace-nowrap ${
                  isOp1
                    ? 'rounded bg-[#0D0F12] text-[#FACC15] px-2 py-0.5 border-none'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {bpm} <span className="text-[10px] font-normal opacity-70">BPM</span>
              </span>
              <button
                type="button"
                onClick={handleTapTempo}
                title="Marca el ritmo haciendo clic varias veces"
                className={`rounded-lg border px-2 py-1 text-[10px] font-mono uppercase tracking-wider active:scale-95 transition cursor-pointer ${
                  isVinyl
                    ? 'border-[#141210] bg-[#D4F350] text-[#141210] font-bold'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                }`}
              >
                Tap
              </button>
            </div>
          </div>

          {/* Right: Practice Toggles + Share & Save */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span
              className="hidden 2xl:inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-[var(--text-muted)] whitespace-nowrap"
              title={
                audioMode === 'sampled'
                  ? 'Motor acústico con muestras reales'
                  : 'Modelado físico de cuerda acústica'
              }
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: audioMode === 'sampled' ? '#10855B' : '#E29552',
                }}
              />
              {audioMode === 'sampled' ? 'Acústica real' : 'Modelado'}
            </span>

            <button
              type="button"
              onClick={onToggleMetronome}
              aria-pressed={metronomeEnabled}
              className={secondaryBtnClass(metronomeEnabled)}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Metrónomo</span>
            </button>

            <button
              type="button"
              onClick={onToggleCountIn}
              aria-pressed={countInEnabled}
              className={secondaryBtnClass(countInEnabled)}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Cuenta 1-4</span>
            </button>

            <button
              type="button"
              onClick={onShare}
              className={secondaryBtnClass(false)}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Compartir</span>
            </button>

            {!isSavingInline && (
              <button
                type="button"
                onClick={openSavePrompt}
                className={
                  isVinyl
                    ? 'border-2 border-[#141210] rounded bg-[#141210] text-[#FFFDF7] px-3 py-2 text-xs font-mono font-bold uppercase inline-flex items-center gap-1.5 hover:bg-[var(--mood-accent)] transition cursor-pointer whitespace-nowrap'
                    : isApple
                      ? 'rounded-full bg-[var(--mood-accent)] text-[var(--accent-ink)] px-3.5 py-2 text-xs font-semibold hover:brightness-110 inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shadow-sm'
                      : isOp1
                        ? 'op1-keycap rounded-xl bg-[#FAF8F4] px-3 py-2 text-xs font-mono font-bold text-[#18191B] ring-1 ring-[#FF5722]/40 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap'
                        : 'rounded-xl border border-[var(--mood-border)] bg-[var(--mood-tint)] px-3 py-2 text-xs font-semibold text-[var(--mood-accent)] hover:brightness-110 inline-flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap'
                }
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
