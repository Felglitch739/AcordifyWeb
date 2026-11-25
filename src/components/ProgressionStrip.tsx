import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, Play, Volume2, X } from 'lucide-react';
import { getGuitarChord, type GuitarChordVoicing } from '../data/chords';
import {
  getReplacementSuggestions,
  type DiatonicChord,
  type GeneratedProgression,
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
  const [manualPluckTicks, setManualPluckTicks] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);

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

          return (
            <motion.article
              key={`slot-${slot.slotIndex}`}
              initial={false}
              animate={{ y: isActive ? -3 : 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className={`surface-card relative overflow-hidden p-4 flex flex-col justify-between transition-colors duration-150 ${
                isActive
                  ? 'border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[0_14px_30px_-16px_rgba(232,93,61,0.32)]'
                  : isEditing
                    ? 'border-[var(--color-ink)] shadow-[0_12px_28px_-18px_rgba(17,17,17,0.18)]'
                    : 'hover:border-[var(--color-ink-muted)] hover:shadow-[0_12px_28px_-18px_rgba(17,17,17,0.18)]'
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[var(--color-accent)]"
                />
              )}
              <div>
                {/* Top Metadata Strip (Monochrome hairline) */}
                <div
                  className={`flex items-center justify-between gap-2 pb-3 border-b ${
                    isActive
                      ? 'border-[var(--color-accent-border)]'
                      : 'border-[var(--color-border)]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span
                      className={
                        isActive
                          ? 'text-[var(--color-accent)] font-medium'
                          : 'text-[var(--color-ink-muted)]'
                      }
                    >
                      0{slot.slotIndex + 1}
                    </span>
                    <span className="font-medium text-[var(--color-ink)]">
                      {slot.chord.roman}
                    </span>
                  </div>
                  <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    {slot.chord.functionLabel}
                  </span>
                </div>

                {/* Chord Name & Voicing Tag */}
                <div className="mt-3.5 flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleChordPreview(slot.slotIndex, slot.chord.symbol)}
                    className="group text-left cursor-pointer"
                    title={`Escuchar ${slot.chord.symbol}`}
                  >
                    <h2 className="text-3xl font-medium tracking-[-0.02em] text-[var(--color-ink)] group-hover:text-[var(--color-accent)] transition-colors duration-150">
                      {slot.chord.symbol}
                    </h2>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] transition-colors duration-150">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Rasguear acorde</span>
                    </span>
                  </button>

                  <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-2 py-0.5 font-mono text-[11px] uppercase text-[var(--color-ink-secondary)]">
                    {voicing.difficulty === 'open' ? 'Abierto' : 'Cejilla'}
                  </span>
                </div>

                {/* Recessed Fretboard Container */}
                <div
                  onClick={() => handleChordPreview(slot.slotIndex, slot.chord.symbol)}
                  className="mt-4 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] py-3 px-2 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--color-ink-muted)] transition-colors duration-150"
                >
                  <Fretboard
                    frets={voicing.frets}
                    fingers={voicing.fingers}
                    rootStrings={voicing.rootStrings}
                    startFret={voicing.startFret}
                    barre={voicing.barre}
                    isActive={isActive}
                    pluckTick={manualPluckTicks[slot.slotIndex] + (isActive ? 1 : 0)}
                    onPluckString={(stringIdx) =>
                      handleSingleStringPluck(slot.slotIndex, voicing, stringIdx)
                    }
                  />

                  {/* Synchronized 4-Beat Progress Bar */}
                  <div className="mt-2.5 grid grid-cols-4 gap-1.5 w-full max-w-[144px] px-1">
                    {[0, 1, 2, 3].map((beat) => {
                      const lit = isActive && activeBeat >= beat;
                      const current = isActive && activeBeat === beat;
                      return (
                        <span
                          key={beat}
                          className="h-1 rounded-full transition-colors duration-150"
                          style={{
                            backgroundColor: current
                              ? 'var(--color-accent)'
                              : lit
                                ? 'var(--color-accent-border)'
                                : 'var(--color-border)',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Concise Plain-Spanish Explanation */}
                <p className="mt-3.5 text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  {slot.roleHint}
                </p>
              </div>

              {/* Swap Chord Button */}
              <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
                <button
                  type="button"
                  onClick={() => onToggleEditSlot(slot.slotIndex)}
                  className={`w-full py-2 px-3 text-xs rounded-full border font-medium inline-flex items-center justify-center gap-1.5 transition-colors duration-150 cursor-pointer ${
                    isEditing
                      ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                      : 'border-[var(--color-border)] bg-transparent text-[var(--color-ink)] hover:border-[var(--color-ink-muted)] hover:bg-[var(--color-surface-subtle)]'
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

      {/* Concise Diagram Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[11px] text-[var(--color-ink-muted)]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
            <span>Tónica (raíz)</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-ink)] text-[9px] font-bold text-white">
              1
            </span>
            <span>Números = dedos</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px] border-[var(--color-ink)]"
              aria-hidden="true"
            />
            <span>Cuerda al aire</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="font-mono font-bold text-[var(--color-ink)]" aria-hidden="true">
              ×
            </span>
            <span>No tocar</span>
          </span>
        </div>
        <span>Pulsa una cuerda en el diagrama para oírla</span>
      </div>

      {/* Inline Replacement Options Tray */}
      <AnimatePresence initial={false}>
        {editingSlotIndex !== null && (
          <motion.div
            key={`tray-${editingSlotIndex}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16 }}
            className="surface-card border-[var(--color-ink)] p-5 space-y-4"
          >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                Reemplazar acorde #{editingSlotIndex + 1} ·{' '}
                {progression.slots[editingSlotIndex]?.chord.symbol}
              </p>
              <h3 className="text-xl font-medium text-[var(--color-ink)] mt-0.5">
                Opciones dentro de {progression.keyRoot}{' '}
                {progression.mode === 'major' ? 'Mayor' : 'Menor'}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onToggleEditSlot(editingSlotIndex)}
              className="btn-secondary self-start sm:self-auto px-3 py-1.5 text-xs"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cerrar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((suggestion) => {
              const voicing = getGuitarChord(suggestion.chord.symbol);
              return (
                <div
                  key={suggestion.chord.symbol}
                  className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-medium text-[var(--color-ink)]">
                          {suggestion.chord.symbol}
                        </span>
                        <span className="font-mono text-xs text-[var(--color-ink-muted)]">
                          {suggestion.chord.roman}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[11px] uppercase text-[var(--color-ink-secondary)]">
                          {voicing.difficulty === 'open' ? 'Abierto' : 'Cejilla'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onPreviewChord(suggestion.chord.symbol)}
                          className="btn-secondary p-1.5 bg-[var(--color-surface)]"
                          title={`Escuchar ${suggestion.chord.symbol}`}
                          aria-label={`Escuchar ${suggestion.chord.symbol}`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                      {suggestion.moodEffect}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onReplaceChord(editingSlotIndex, suggestion.chord)}
                    className="btn-primary w-full py-2 text-xs"
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
