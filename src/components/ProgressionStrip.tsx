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
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
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
    setSelectedSlotIndex(slotIndex);
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

  const currentIndex = activeChordIndex >= 0 ? activeChordIndex : selectedSlotIndex;
  const slot = progression.slots[currentIndex];
  const voicing = getGuitarChord(slot.chord.symbol);
  const isPlayingChord = activeChordIndex === currentIndex;
  const isEditing = editingSlotIndex === currentIndex;

  return (
    <section aria-label="Progresión de 4 acordes y diagramas" className="space-y-4">

      <div className="studio-progression">
        <div className="studio-score">
          <div className="studio-score-track" role="group" aria-label="Acordes de la progresión">
            {progression.slots.map((item) => (
              <button
                key={item.slotIndex}
                type="button"
                aria-label={`Escuchar ${item.chord.symbol}, acorde ${item.slotIndex + 1}`}
                aria-pressed={currentIndex === item.slotIndex}
                onClick={() => handleChordPreview(item.slotIndex, item.chord.symbol)}
              >
                <span>{item.chord.roman}</span>
                <strong>{item.chord.symbol}</strong>
                <Volume2 size={16} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="studio-chord-detail">
            <div>
              <h2>{slot.chord.symbol}</h2>
              <p>{slot.roleHint}</p>
            </div>
            <button
              type="button"
              className="btn-secondary"
              aria-expanded={isEditing}
              onClick={() => onToggleEditSlot(currentIndex)}
            >
              <ArrowLeftRight size={15} aria-hidden="true" />
              {isEditing ? 'Cerrar opciones' : 'Cambiar acorde'}
            </button>
          </div>
          <div className="studio-beats" aria-hidden="true">
            {[0, 1, 2, 3].map((beat) => (
              <span key={beat} data-active={isPlayingChord && activeBeat >= beat} />
            ))}
          </div>
        </div>
        <div className="studio-chord-shape">
          <span>Digitación · {voicing.difficulty === 'open' ? 'Abierto' : 'Cejilla'}</span>
          <Fretboard
            frets={voicing.frets}
            fingers={voicing.fingers}
            rootStrings={voicing.rootStrings}
            startFret={voicing.startFret}
            barre={voicing.barre}
            isActive={isPlayingChord}
            pluckTick={manualPluckTicks[currentIndex] + (isPlayingChord ? 1 : 0)}
            onPluckString={(index) => handleSingleStringPluck(currentIndex, voicing, index)}
          />
        </div>
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
