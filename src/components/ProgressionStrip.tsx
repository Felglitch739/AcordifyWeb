import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, Play, Volume2, X } from 'lucide-react';
import { getGuitarChord, type GuitarChordVoicing } from '../data/chords';
import { useStudioStyle } from '../styles/useStudioStyle';
import {
  getReplacementSuggestions,
  type DiatonicChord,
  type GeneratedProgression,
  type HarmonicFunction,
} from '../theory';
import { Fretboard } from './Fretboard';

interface ProgressionStripProps {
  progression: GeneratedProgression;
  activeChordIndex: number;
  activeBeat: number;
  editingSlotIndex: number | null;
  onToggleEditSlot: (slotIndex: number) => void;
  onReplaceChord: (slotIndex: number, newChord: DiatonicChord) => void;
  onPreviewChord: (symbol: string) => void;
  onPluckNote?: (noteName: string) => void;
}

const LUTHIER_PILL_STYLES: Readonly<Record<HarmonicFunction, string>> = {
  rest: 'border-[#8AB08F]/35 bg-[#8AB08F]/10 text-[#A7CCA9]',
  movement: 'border-[#7F96B5]/35 bg-[#7F96B5]/10 text-[#A8BEDB]',
  tension: 'border-[#E29552]/35 bg-[#E29552]/10 text-[#F0B47D]',
  return: 'border-[#DE6B48]/35 bg-[#DE6B48]/10 text-[#EC9579]',
};

const LIGHT_PILL_STYLES: Readonly<Record<HarmonicFunction, string>> = {
  rest: 'border-emerald-700/20 bg-emerald-500/12 text-emerald-800',
  movement: 'border-sky-700/20 bg-sky-500/12 text-sky-800',
  tension: 'border-amber-700/20 bg-amber-500/15 text-amber-900',
  return: 'border-rose-700/20 bg-rose-500/12 text-rose-800',
};

const VINYL_PILL_STYLES: Readonly<Record<HarmonicFunction, string>> = {
  rest: 'border-[#141210] bg-[#D4F350] text-[#141210]',
  movement: 'border-[#141210] bg-[#FFFDF7] text-[#141210]',
  tension: 'border-[#141210] bg-[#E8432D] text-[#FFFDF7]',
  return: 'border-[#141210] bg-[#141210] text-[#FFFDF7]',
};

function getNoteNameForStringIndex(
  voicing: GuitarChordVoicing,
  stringIndex: number,
): string | undefined {
  if (voicing.frets[stringIndex] < 0) return undefined;
  let playedIdx = 0;
  for (let i = 0; i < stringIndex; i++) {
    if (voicing.frets[i] >= 0) {
      playedIdx += 1;
    }
  }
  return voicing.midiNotes[playedIdx];
}

export const ProgressionStrip: React.FC<ProgressionStripProps> = ({
  progression,
  activeChordIndex,
  activeBeat,
  editingSlotIndex,
  onToggleEditSlot,
  onReplaceChord,
  onPreviewChord,
  onPluckNote,
}) => {
  const { studioStyle } = useStudioStyle();
  const [manualPluckTicks, setManualPluckTicks] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);

  const isApple = studioStyle === 'apple';
  const isOp1 = studioStyle === 'op1';
  const isVinyl = studioStyle === 'vinyl';

  const bumpPluckTick = (slotIndex: number) => {
    setManualPluckTicks((prev) => {
      const next: [number, number, number, number] = [...prev];
      next[slotIndex] += 1;
      return next;
    });
  };

  const handleChordPreview = (slotIndex: number, symbol: string) => {
    bumpPluckTick(slotIndex);
    onPreviewChord(symbol);
  };

  const handleSingleStringPluck = (
    slotIndex: number,
    voicing: GuitarChordVoicing,
    stringIndex: number,
  ) => {
    const note = getNoteNameForStringIndex(voicing, stringIndex);
    if (!note) return;
    bumpPluckTick(slotIndex);
    if (onPluckNote) {
      onPluckNote(note);
    } else {
      onPreviewChord(voicing.symbol);
    }
  };

  const suggestions =
    editingSlotIndex !== null
      ? getReplacementSuggestions(
          progression.keyRoot,
          progression.mode,
          progression.degrees,
          editingSlotIndex,
        )
      : [];

  return (
    <section aria-label="Progresión de 4 acordes y diagramas" className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {progression.slots.map((slot) => {
          const voicing = getGuitarChord(slot.chord.symbol);
          const isActive = activeChordIndex === slot.slotIndex;
          const isEditing = editingSlotIndex === slot.slotIndex;

          const cardClass = isVinyl
            ? `${isActive ? 'vinyl-brutal-card-active' : 'vinyl-brutal-card'} p-4 flex flex-col justify-between`
            : isOp1
              ? `op1-chassis rounded-2xl p-4 flex flex-col justify-between transition-all ${
                  isActive
                    ? 'ring-2 ring-[#FF5722] bg-[#FAF8F4]'
                    : isEditing
                      ? 'ring-1 ring-[#18191B]'
                      : ''
                }`
              : isApple
                ? `apple-ceramic-card rounded-3xl p-4 flex flex-col justify-between transition-all ${
                    isActive
                      ? 'ring-2 ring-[var(--mood-accent)]'
                      : isEditing
                        ? 'ring-1 ring-[var(--mood-border)]'
                        : ''
                  }`
                : `studio-surface rounded-2xl p-4 flex flex-col justify-between transition-colors duration-200 ${
                    isActive
                      ? 'border-[var(--mood-accent)] bg-[var(--bg-surface-elevated)]'
                      : isEditing
                        ? 'border-[var(--mood-border)]'
                        : 'hover:border-[var(--border-strong)]'
                  }`;

          const functionPillClass = isVinyl
            ? VINYL_PILL_STYLES[slot.chord.harmonicFunction]
            : isApple || isOp1
              ? LIGHT_PILL_STYLES[slot.chord.harmonicFunction]
              : LUTHIER_PILL_STYLES[slot.chord.harmonicFunction];

          const wellClass = isVinyl
            ? 'mt-3.5 rounded border-2 border-[#141210] bg-[#FAF6EC] py-3 px-2 flex flex-col items-center justify-center cursor-pointer hover:bg-[#FFFDF7] transition-colors'
            : isOp1
              ? 'op1-oled-screen mt-3.5 rounded-xl py-3 px-2 flex flex-col items-center justify-center cursor-pointer transition-colors'
              : isApple
                ? 'mt-3.5 rounded-2xl bg-[#1D1D1F] border border-black/10 py-3 px-2 flex flex-col items-center justify-center cursor-pointer shadow-inner transition-colors'
                : 'studio-recessed mt-3.5 rounded-xl py-3 px-2 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--border-strong)] transition-colors';

          return (
            <motion.article
              key={`slot-${slot.slotIndex}`}
              animate={{
                y: isActive ? (isVinyl ? -2 : -4) : 0,
                x: isActive && isVinyl ? -2 : 0,
              }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className={cardClass}
            >
              <div>
                {/* Top Metadata */}
                <div
                  className={`flex items-center justify-between gap-2 pb-2.5 border-b ${
                    isVinyl ? 'border-[#141210]' : 'border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {isOp1 && (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive
                            ? 'bg-[#FF5722] shadow-[0_0_6px_#FF5722]'
                            : 'bg-[#A1A5AE]'
                        }`}
                      />
                    )}
                    <span className="text-[var(--text-muted)] font-semibold">
                      {isOp1 ? `PAD 0${slot.slotIndex + 1}` : `0${slot.slotIndex + 1}`}
                    </span>
                    <span className="font-semibold text-[var(--text-secondary)]">
                      {slot.chord.roman}
                    </span>
                  </div>
                  <span
                    className={`border px-2 py-0.5 text-[10px] font-semibold ${
                      isVinyl ? 'rounded-[3px] font-mono uppercase' : 'rounded-full'
                    } ${functionPillClass}`}
                  >
                    {slot.chord.functionLabel}
                  </span>
                </div>

                {/* Chord Hero & Voicing Tag */}
                <div className="mt-3 flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleChordPreview(slot.slotIndex, slot.chord.symbol)}
                    className="group text-left cursor-pointer"
                    title={`Escuchar ${slot.chord.symbol}`}
                  >
                    <h3
                      className={`text-3xl sm:text-4xl tracking-tight group-hover:text-[var(--mood-accent)] transition-colors ${
                        isVinyl
                          ? 'font-poster font-extrabold text-[#141210]'
                          : isApple
                            ? 'font-semibold text-[#1D1D1F] tracking-[-0.03em]'
                            : 'font-mono font-semibold text-[var(--text-primary)]'
                      }`}
                    >
                      {slot.chord.symbol}
                    </h3>
                    <span className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                      <Volume2 className="w-3 h-3 text-[var(--mood-accent)]" />
                      Rasguear acorde
                    </span>
                  </button>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono border ${
                      isVinyl ? 'rounded-[3px] font-bold uppercase' : 'rounded-lg'
                    } ${
                      voicing.difficulty === 'open'
                        ? 'border-[var(--border-subtle)] bg-[var(--bg-recessed)] text-[var(--text-secondary)]'
                        : isVinyl
                          ? 'border-[#141210] bg-[#D4F350] text-[#141210]'
                          : 'border-amber-600/30 bg-amber-500/12 text-amber-700'
                    }`}
                  >
                    {voicing.difficulty === 'open' ? 'Abierto' : 'Cejilla'}
                  </span>
                </div>

                {/* Fretboard Well */}
                <div
                  onClick={() => handleChordPreview(slot.slotIndex, slot.chord.symbol)}
                  className={wellClass}
                >
                  <Fretboard
                    frets={voicing.frets}
                    startFret={voicing.startFret}
                    barre={voicing.barre}
                    isActive={isActive}
                    pluckTick={manualPluckTicks[slot.slotIndex] + (isActive ? 1 : 0)}
                    onPluckString={(stringIdx) =>
                      handleSingleStringPluck(slot.slotIndex, voicing, stringIdx)
                    }
                  />

                  {/* Synchronized 4-Beat Bar Indicator */}
                  <div className="mt-2 grid grid-cols-4 gap-1.5 w-full max-w-[144px] px-1">
                    {[0, 1, 2, 3].map((beat) => {
                      const lit = isActive && activeBeat >= beat;
                      const current = isActive && activeBeat === beat;
                      const activeBarColor = isOp1
                        ? '#FF5722'
                        : isVinyl
                          ? '#D83B26'
                          : 'var(--mood-accent)';
                      const idleBarColor = isVinyl
                        ? 'rgba(20, 18, 16, 0.16)'
                        : 'rgba(244, 236, 224, 0.18)';

                      return (
                        <span
                          key={beat}
                          className="h-1 rounded-full transition-all duration-150"
                          style={{
                            backgroundColor: current
                              ? activeBarColor
                              : lit
                                ? isVinyl
                                  ? '#141210'
                                  : 'var(--mood-accent)'
                                : idleBarColor,
                            opacity: lit && !current ? 0.55 : 1,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Role Explanation */}
                <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                  {slot.roleHint}
                </p>
              </div>

              {/* Swap Chord Action */}
              <div
                className={`mt-4 pt-3 border-t ${
                  isVinyl ? 'border-[#141210]/20' : 'border-[var(--border-subtle)]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleEditSlot(slot.slotIndex)}
                  className={`w-full py-2 px-3 text-xs font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isVinyl
                      ? `rounded border-2 border-[#141210] font-mono font-bold uppercase ${
                          isEditing
                            ? 'bg-[#141210] text-[#FFFDF7]'
                            : 'bg-[#FFFDF7] text-[#141210] hover:bg-[#D4F350]'
                        }`
                      : isOp1
                        ? `op1-keycap rounded-xl font-mono font-semibold text-[#18191B] ${
                            isEditing ? 'ring-2 ring-[#FF5722]' : ''
                          }`
                        : isApple
                          ? `rounded-full ${
                              isEditing
                                ? 'bg-[var(--mood-accent)] text-[var(--accent-ink)]'
                                : 'bg-[var(--bg-recessed)] text-[var(--text-primary)] hover:bg-black/[0.08]'
                            }`
                          : `rounded-xl border ${
                              isEditing
                                ? 'border-[var(--mood-border)] bg-[var(--mood-tint)] text-[var(--text-primary)]'
                                : 'border-[var(--border-subtle)] bg-[var(--bg-recessed)]/70 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                            }`
                  }`}
                >
                  {isEditing ? (
                    <>
                      <X className="w-3.5 h-3.5" />
                      <span>Cerrar opciones</span>
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Cambiar acorde</span>
                    </>
                  )}
                </button>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Animated Replacement Tray */}
      <AnimatePresence>
        {editingSlotIndex !== null && (
          <motion.div
            key={`replace-tray-${editingSlotIndex}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`p-5 ${
              isVinyl
                ? 'vinyl-brutal-card'
                : isOp1
                  ? 'op1-chassis rounded-2xl'
                  : isApple
                    ? 'apple-ceramic-card rounded-3xl'
                    : 'studio-surface rounded-2xl border-[var(--mood-border)]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--mood-accent)] font-semibold">
                  Reemplazar acorde #{editingSlotIndex + 1} ·{' '}
                  {progression.slots[editingSlotIndex]?.chord.symbol}
                </p>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mt-0.5">
                  Alternativas naturales en {progression.keyRoot}{' '}
                  {progression.mode === 'major' ? 'Mayor' : 'Menor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onToggleEditSlot(editingSlotIndex)}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cerrar</span>
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestions.map((suggestion) => {
                const voicing = getGuitarChord(suggestion.chord.symbol);
                return (
                  <div
                    key={suggestion.chord.symbol}
                    className={`p-3.5 flex flex-col justify-between gap-3 transition-colors ${
                      isVinyl
                        ? 'rounded border-2 border-[#141210] bg-[#FFFDF7]'
                        : isApple
                          ? 'rounded-2xl bg-[var(--bg-recessed)]/70 border border-black/[0.06]'
                          : 'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] hover:border-[var(--mood-border)]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span className="font-mono text-xl font-semibold text-[var(--text-primary)]">
                            {suggestion.chord.symbol}
                          </span>
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            {suggestion.chord.roman}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--text-secondary)]">
                            {voicing.difficulty === 'open' ? 'Abierto' : 'Cejilla'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onPreviewChord(suggestion.chord.symbol)}
                            className="inline-flex items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-1.5 text-[var(--text-primary)] hover:border-[var(--mood-border)] cursor-pointer"
                            title={`Escuchar ${suggestion.chord.symbol}`}
                            aria-label={`Escuchar ${suggestion.chord.symbol}`}
                          >
                            <Play className="w-3 h-3 fill-current" />
                          </button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                        {suggestion.moodEffect}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onReplaceChord(editingSlotIndex, suggestion.chord)}
                      className={`w-full py-1.5 text-xs font-semibold transition cursor-pointer ${
                        isVinyl
                          ? 'rounded border-2 border-[#141210] bg-[#141210] text-[#FFFDF7] font-mono uppercase hover:bg-[var(--mood-accent)]'
                          : isApple
                            ? 'rounded-full bg-[var(--mood-accent)] text-[var(--accent-ink)] hover:brightness-110'
                            : 'rounded-lg bg-[var(--mood-tint)] border border-[var(--mood-border)] text-[var(--mood-accent)] hover:brightness-110'
                      }`}
                    >
                      Usar {suggestion.chord.symbol}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
