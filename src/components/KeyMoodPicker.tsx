import React from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { STRUM_PATTERN_OPTIONS, type GuitarTone, type StrumPatternId } from '../audio';
import {
  MOOD_OPTIONS,
  getKeyOptions,
  type GeneratedProgression,
  type Mode,
  type MoodId,
} from '../theory';

interface KeyMoodPickerProps {
  progression: GeneratedProgression;
  guitarTone: GuitarTone;
  strumPattern: StrumPatternId;
  onSelectMode: (mode: Mode) => void;
  onSelectKey: (root: string) => void;
  onSelectMood: (mood: MoodId) => void;
  onNextVariant: () => void;
  onChangeGuitarTone: (tone: GuitarTone) => void;
  onChangeStrumPattern: (pattern: StrumPatternId) => void;
}

export const KeyMoodPicker: React.FC<KeyMoodPickerProps> = ({
  progression,
  guitarTone,
  strumPattern,
  onSelectMode,
  onSelectKey,
  onSelectMood,
  onNextVariant,
  onChangeGuitarTone,
  onChangeStrumPattern,
}) => {
  const keyOptions = getKeyOptions(progression.mode);
  const selectedMoodObj =
    MOOD_OPTIONS.find((m) => m.id === progression.mood) ?? MOOD_OPTIONS[0];
  const romanSequence = progression.slots.map((s) => s.chord.roman).join('–');

  return (
    <section aria-label="Tono, ánimo y guitarra" className="space-y-6">
      {/* Open Editorial Header on #F4F4F5 Canvas */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            {selectedMoodObj.label} · {selectedMoodObj.description}
          </p>

          <h1 className="text-[34px] sm:text-[44px] font-medium tracking-[-0.03em] leading-[1.08] text-[var(--color-ink)]">
            {progression.keyRoot}{' '}
            {progression.mode === 'major' ? 'Mayor' : 'Menor'}{' '}
            <span className="font-editorial text-[var(--color-ink-secondary)]">
              — {progression.templateName}
            </span>
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[var(--color-ink-muted)]">
            <span className="whitespace-nowrap font-medium text-[var(--color-ink)]">
              ({romanSequence})
            </span>
            <span>
              ESCALA: <span className="text-[var(--color-ink-secondary)]">{progression.scaleNotes.join(' · ')}</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onNextVariant}
          className="btn-secondary self-start md:self-auto shrink-0 px-4 py-2 text-xs bg-[var(--color-surface)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Otra idea</span>
        </button>
      </div>

      {/* Monochrome Flat Control Card */}
      <div className="surface-card p-4 sm:p-5 space-y-4">
        {/* Row 1: Mayor / Menor + 12 Chromatic Keys */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div
            className="inline-flex rounded-full bg-[var(--color-surface-subtle)] p-1 self-start shrink-0"
            role="group"
            aria-label="Modo de la escala"
          >
            {(['major', 'minor'] as const).map((m) => {
              const active = progression.mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelectMode(m)}
                  className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    active
                      ? 'text-white'
                      : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="picker-mode-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[var(--color-ink)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{m === 'major' ? 'Mayor' : 'Menor'}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 flex-1">
            {keyOptions.map((option) => {
              const isSelected = option.root === progression.keyRoot;
              return (
                <button
                  key={`${progression.mode}-${option.root}`}
                  type="button"
                  onClick={() => onSelectKey(option.root)}
                  className={`relative overflow-hidden rounded-xl border py-1.5 px-1 flex flex-col items-center justify-center transition-colors duration-150 cursor-pointer ${
                    isSelected
                      ? 'border-[var(--color-ink)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="picker-key-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-[11px] bg-[var(--color-ink)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 font-mono text-xs sm:text-sm font-medium leading-tight">
                    {option.root}
                  </span>
                  <span
                    className={`relative z-10 text-[10px] leading-tight ${
                      isSelected ? 'text-white/75' : 'text-[var(--color-ink-muted)]'
                    }`}
                  >
                    {option.solfege}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        {/* Row 2: 5 Monochrome Mood Tabs + Guitar Tone & Strum Pattern */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Ánimo musical">
            {MOOD_OPTIONS.map((option) => {
              const active = option.id === progression.mood;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectMood(option.id)}
                  className={`relative overflow-hidden rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                    active
                      ? 'border-[var(--color-ink)] text-white'
                      : 'border-[var(--color-border)] bg-transparent text-[var(--color-ink-secondary)] hover:border-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="picker-mood-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[var(--color-ink)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Guitar Voice */}
            <div
              className="inline-flex items-center rounded-full bg-[var(--color-surface-subtle)] p-1"
              role="group"
              aria-label="Tipo de guitarra"
            >
              <span className="hidden sm:inline pl-2.5 pr-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                Cuerdas
              </span>
              {([
                { id: 'nylon', label: 'Nylon' },
                { id: 'steel', label: 'Acero' },
              ] as const).map((item) => {
                const active = guitarTone === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeGuitarTone(item.id)}
                    className={`relative px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer ${
                      active
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="picker-tone-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_1px_2px_rgba(17,17,17,0.06)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Strum Pattern */}
            <div
              className="inline-flex items-center rounded-full bg-[var(--color-surface-subtle)] p-1"
              role="group"
              aria-label="Patrón rítmico"
            >
              <span className="hidden sm:inline pl-2.5 pr-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                Toque
              </span>
              {STRUM_PATTERN_OPTIONS.map((item) => {
                const active = strumPattern === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.shortHint}
                    onClick={() => onChangeStrumPattern(item.id)}
                    className={`relative px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer ${
                      active
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="picker-strum-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[0_1px_2px_rgba(17,17,17,0.06)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
