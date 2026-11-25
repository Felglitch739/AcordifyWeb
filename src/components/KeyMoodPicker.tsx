import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { STRUM_PATTERN_OPTIONS, type GuitarTone, type StrumPatternId } from '../audio';
import { useStudioStyle } from '../styles/useStudioStyle';
import {
  MOOD_OPTIONS,
  getKeyOptions,
  type Mode,
  type MoodId,
} from '../theory';

interface KeyMoodPickerProps {
  keyRoot: string;
  mode: Mode;
  mood: MoodId;
  templateName: string;
  scaleNotes: string[];
  guitarTone: GuitarTone;
  strumPattern: StrumPatternId;
  onSelectMode: (mode: Mode) => void;
  onSelectKey: (root: string) => void;
  onSelectMood: (mood: MoodId) => void;
  onNextVariant: () => void;
  onChangeGuitarTone: (tone: GuitarTone) => void;
  onChangeStrumPattern: (pattern: StrumPatternId) => void;
}

const LUTHIER_MOOD_COLORS: Readonly<Record<MoodId, string>> = {
  calm: '#8AB08F',
  melancholic: '#7F96B5',
  nostalgic: '#E29552',
  bright: '#E0B856',
  energetic: '#DE6B48',
};

const APPLE_MOOD_COLORS: Readonly<Record<MoodId, string>> = {
  calm: '#1F7A36',
  melancholic: '#0071E3',
  nostalgic: '#B85D00',
  bright: '#F2B705',
  energetic: '#D71947',
};

export const KeyMoodPicker: React.FC<KeyMoodPickerProps> = ({
  keyRoot,
  mode,
  mood,
  templateName,
  scaleNotes,
  guitarTone,
  strumPattern,
  onSelectMode,
  onSelectKey,
  onSelectMood,
  onNextVariant,
  onChangeGuitarTone,
  onChangeStrumPattern,
}) => {
  const [spinCount, setSpinCount] = useState(0);
  const { studioStyle } = useStudioStyle();
  const isApple = studioStyle === 'apple';

  const keyOptions = getKeyOptions(mode);
  const selectedMoodObj = MOOD_OPTIONS.find((m) => m.id === mood) ?? MOOD_OPTIONS[0];
  const pigmentMap = isApple ? APPLE_MOOD_COLORS : LUTHIER_MOOD_COLORS;

  const handleVariantClick = () => {
    setSpinCount((c) => c + 1);
    onNextVariant();
  };

  return (
    <section aria-label="Selector de tono, ánimo y guitarra" className="space-y-5">
      {/* Open Editorial / Apple Cupertino Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] mb-1.5">
            <span
              className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] text-[11px] font-semibold ${
                isApple
                  ? 'rounded-full bg-[var(--mood-tint)] border border-[var(--mood-border)] px-2.5 py-0.5 text-[var(--mood-accent)]'
                  : 'text-[var(--mood-accent)]'
              }`}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: pigmentMap[mood] }}
              />
              {selectedMoodObj.label}
            </span>
            {!isApple && <span className="text-[var(--text-muted)]">/</span>}
            <span className="text-[var(--text-secondary)]">{selectedMoodObj.description}</span>
          </div>

          {isApple ? (
            <h2 className="text-3xl sm:text-5xl font-semibold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.06]">
              {keyRoot} {mode === 'major' ? 'Mayor' : 'Menor'}{' '}
              <span className="font-normal text-[var(--text-secondary)]">— {templateName}</span>
            </h2>
          ) : (
            <h2 className="font-serif-editorial text-4xl sm:text-5xl font-normal text-[var(--text-primary)] leading-[1.06]">
              {keyRoot} {mode === 'major' ? 'Mayor' : 'Menor'}{' '}
              <span className="italic text-[var(--text-secondary)]">— {templateName}</span>
            </h2>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
            <span>Escala:</span>
            <span className="text-[var(--text-secondary)] tracking-wide">
              {scaleNotes.join(' · ')}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleVariantClick}
          className={`self-start md:self-auto shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[var(--text-primary)] transition cursor-pointer ${
            isApple
              ? 'apple-liquid-glass rounded-full hover:scale-[1.02] active:scale-[0.98]'
              : 'rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] hover:border-[var(--mood-border)] hover:bg-[var(--bg-surface-elevated)]'
          }`}
        >
          <motion.span
            animate={{ rotate: spinCount * 180 }}
            transition={{ type: 'spring', stiffness: 320, damping: 22 }}
            className="inline-flex text-[var(--mood-accent)]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </motion.span>
          <span>Otra idea</span>
        </button>
      </div>

      {/* Ceramic Apple Deck or Warm Luthier Hardware Rail */}
      <div
        className={`p-3.5 sm:p-4 space-y-3.5 ${
          isApple ? 'apple-ceramic-card rounded-3xl' : 'studio-surface rounded-2xl'
        }`}
      >
        {/* Row 1: Mode Segmented Toggle + 12 Chromatic Keys */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Segmented Toggle */}
          <div
            className={`inline-flex p-1 self-start shrink-0 ${
              isApple
                ? 'rounded-full bg-[var(--bg-recessed)]'
                : 'rounded-xl bg-[var(--bg-recessed)] border border-[var(--border-subtle)]'
            }`}
            role="group"
            aria-label="Modo de la escala"
          >
            {(['major', 'minor'] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelectMode(m)}
                  className={`relative px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    isApple ? 'rounded-full' : 'rounded-lg'
                  } ${
                    active
                      ? isApple
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--accent-ink)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="acordify-mode-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className={`absolute inset-0 ${
                        isApple
                          ? 'rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]'
                          : 'rounded-lg bg-[var(--text-primary)]'
                      }`}
                    />
                  )}
                  <span className="relative z-10">
                    {m === 'major' ? 'Mayor' : 'Menor'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 12 Chromatic Keys */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 flex-1">
            {keyOptions.map((option) => {
              const isSelected = option.root === keyRoot;
              return (
                <button
                  key={`${mode}-${option.root}`}
                  type="button"
                  onClick={() => onSelectKey(option.root)}
                  className={`relative py-1.5 px-1 flex flex-col items-center justify-center transition cursor-pointer ${
                    isApple ? 'rounded-2xl' : 'rounded-xl border'
                  } ${
                    isSelected
                      ? isApple
                        ? 'bg-[var(--mood-accent)] text-[var(--accent-ink)] shadow-sm'
                        : 'border-[var(--mood-border)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]'
                      : isApple
                        ? 'bg-[var(--bg-recessed)]/75 text-[var(--text-primary)] hover:bg-[var(--bg-recessed)]'
                        : 'border-transparent bg-[var(--bg-recessed)]/70 text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="font-mono text-xs sm:text-sm font-semibold leading-tight">
                    {option.root}
                  </span>
                  <span
                    className={`text-[10px] leading-tight ${
                      isSelected && isApple
                        ? 'opacity-80'
                        : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {option.solfege}
                  </span>
                  {isSelected && !isApple && (
                    <motion.span
                      layoutId="acordify-key-bar"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className="absolute bottom-0.5 inset-x-2 h-0.5 rounded-full"
                      style={{ backgroundColor: 'var(--mood-accent)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-[var(--border-subtle)]" />

        {/* Row 2: 5 Mood Tabs + Acoustic Tone & Strum Pattern */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Ánimo musical">
            {MOOD_OPTIONS.map((option) => {
              const isSelected = option.id === mood;
              const pigment = pigmentMap[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelectMood(option.id)}
                  className={`relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'text-[var(--text-primary)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="acordify-mood-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-full border border-[var(--mood-border)] bg-[var(--mood-tint)]"
                    />
                  )}
                  <span
                    className="relative z-10 h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: pigment }}
                  />
                  <span className="relative z-10">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Guitar Voice */}
            <div
              className={`inline-flex items-center p-1 ${
                isApple
                  ? 'rounded-full bg-[var(--bg-recessed)]'
                  : 'rounded-xl bg-[var(--bg-recessed)] border border-[var(--border-subtle)]'
              }`}
              role="group"
              aria-label="Tipo de guitarra"
            >
              <span className="hidden sm:inline px-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
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
                    className={`relative px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      isApple ? 'rounded-full' : 'rounded-lg'
                    } ${
                      active
                        ? 'text-[var(--text-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="acordify-tone-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className={`absolute inset-0 ${
                          isApple
                            ? 'rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]'
                            : 'rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)]'
                        }`}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Strum Pattern */}
            <div
              className={`inline-flex items-center p-1 ${
                isApple
                  ? 'rounded-full bg-[var(--bg-recessed)]'
                  : 'rounded-xl bg-[var(--bg-recessed)] border border-[var(--border-subtle)]'
              }`}
              role="group"
              aria-label="Patrón rítmico"
            >
              <span className="hidden sm:inline px-2 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
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
                    className={`relative px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      isApple ? 'rounded-full' : 'rounded-lg'
                    } ${
                      active
                        ? 'text-[var(--text-primary)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="acordify-strum-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className={`absolute inset-0 ${
                          isApple
                            ? 'rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]'
                            : 'rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)]'
                        }`}
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
