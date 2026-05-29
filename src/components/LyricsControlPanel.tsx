import React from 'react';
import type { LyricsParams, LyricsResult } from '../services';
import { PanelWrapper } from './PanelWrapper';

interface LyricsControlPanelProps {
  rhymeScheme: LyricsParams['rhymeScheme'];
  emotionalMood: number;
  narrativePerson: LyricsParams['narrativePerson'];
  metaphorDensity: LyricsParams['metaphorDensity'];
  thematicConcept: string;
  genre: string;
  language: LyricsParams['language'];
  linesToGenerate: LyricsParams['linesToGenerate'];
  isGenerating?: boolean;
  error?: string | null;
  result?: LyricsResult | null;
  onRhymeSchemeChange: (value: LyricsParams['rhymeScheme']) => void;
  onEmotionalMoodChange: (value: number) => void;
  onNarrativePersonChange: (value: LyricsParams['narrativePerson']) => void;
  onMetaphorDensityChange: (value: LyricsParams['metaphorDensity']) => void;
  onThematicConceptChange: (value: string) => void;
  onGenreChange: (value: string) => void;
  onLanguageChange: (value: LyricsParams['language']) => void;
  onLinesToGenerateChange: (value: LyricsParams['linesToGenerate']) => void;
  onGenerate: () => void;
  onBypass?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const RHYME_OPTIONS: Array<LyricsParams['rhymeScheme']> = ['ABAB', 'AABB', 'ABBA', 'free'];
const PERSON_OPTIONS: Array<LyricsParams['narrativePerson']> = ['1ra', '2da', '3ra'];
const LANGUAGE_OPTIONS: Array<LyricsParams['language']> = ['es', 'en'];
const LINE_OPTIONS: Array<LyricsParams['linesToGenerate']> = [4, 8];

function DensityBars({ value, onChange }: { value: LyricsParams['metaphorDensity']; onChange: (next: LyricsParams['metaphorDensity']) => void; }) {
  const levels: Array<{ id: LyricsParams['metaphorDensity']; label: string }> = [
    { id: 'literal', label: 'LITERAL' },
    { id: 'balanced', label: 'BALANCEADO' },
    { id: 'poetic', label: 'POÉTICO' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {levels.map((level, index) => {
        const active = value === level.id;
        const barCount = index + 1;

        return (
          <button
            key={level.id}
            type="button"
            onClick={() => onChange(level.id)}
            className={`flex h-16 flex-col justify-end gap-1 border px-2 py-2 text-left transition-all duration-150 ${
              active
                ? 'border-orange-500 bg-zinc-950 text-orange-400 shadow-[0_0_0_1px_rgba(249,115,22,0.15),0_0_22px_rgba(249,115,22,0.12)]'
                : 'border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
            }`}
          >
            <div className="flex items-end gap-1">
              {Array.from({ length: 3 }, (_, barIdx) => (
                <span
                  key={`${level.id}-${barIdx}`}
                  className={`block w-2 rounded-sm transition-all duration-150 ${
                    barIdx < barCount
                      ? active
                        ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.45)]'
                        : 'bg-zinc-700'
                      : 'bg-zinc-900'
                  } ${barIdx === 0 ? 'h-3' : barIdx === 1 ? 'h-5' : 'h-7'}`}
                />
              ))}
            </div>
            <span className="text-[10px] font-bold tracking-[0.22em]">{level.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const LyricsControlPanel: React.FC<LyricsControlPanelProps> = ({
  rhymeScheme,
  emotionalMood,
  narrativePerson,
  metaphorDensity,
  thematicConcept,
  genre,
  language,
  linesToGenerate,
  isGenerating = false,
  error = null,
  result = null,
  onRhymeSchemeChange,
  onEmotionalMoodChange,
  onNarrativePersonChange,
  onMetaphorDensityChange,
  onThematicConceptChange,
  onGenreChange,
  onLanguageChange,
  onLinesToGenerateChange,
  onGenerate,
  onBypass,
  collapsed = false,
  onToggleCollapse,
}) => {
  const emotionalLabel = emotionalMood <= 50 ? 'MELANCÓLICO' : 'ESPERANZADOR';
  const emotionalDotLeft = emotionalMood <= 50;
  const conceptWords = thematicConcept.trim().split(/\s+/).filter(Boolean);
  const isWeakConcept = thematicConcept.trim().length > 0 && (thematicConcept.trim().length < 8 || conceptWords.length < 2);

  return (
    <PanelWrapper
      className="bg-zinc-800"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onBypass={onBypass}
      title={(
        <span className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
          [LYRICS] // ADVANCED PARAMETERS
        </span>
      )}
      rightSlot={(
        <span className="hidden xs:inline-block text-[10px] font-mono text-emerald-500 font-bold uppercase animate-pulse">
          • CONTROL ACTIVE
        </span>
      )}
      contentClassName="p-4 flex flex-col gap-4"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [RIMA] // ESQUEMA
          </label>
          <span className="text-[9px] font-mono text-zinc-600 uppercase">LOCKED TO STANZA</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {RHYME_OPTIONS.map((option) => {
            const active = rhymeScheme === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onRhymeSchemeChange(option)}
                className={`border px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-all duration-150 ${
                  active
                    ? 'border-orange-500 text-orange-400 bg-zinc-950 shadow-[0_0_14px_rgba(249,115,22,0.12)]'
                    : 'border-zinc-700 text-zinc-400 bg-zinc-900 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {option === 'free' ? 'FREE' : option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [MOOD] // TONO EMOCIONAL
          </label>
          <span className="text-[9px] font-mono text-zinc-600 uppercase">DYNAMIC RANGE</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={emotionalMood}
          onChange={(event) => onEmotionalMoodChange(Number(event.target.value))}
          className="w-full cursor-pointer accent-orange-500"
        />
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500">
          <span className={emotionalDotLeft ? 'text-orange-400' : 'text-zinc-500'}>MELANCÓLICO</span>
          <span className={`flex items-center gap-2 ${emotionalDotLeft ? 'text-orange-400' : 'text-emerald-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${emotionalDotLeft ? 'bg-orange-500' : 'bg-emerald-500'}`} />
            {emotionalLabel}
          </span>
          <span className={!emotionalDotLeft ? 'text-orange-400' : 'text-zinc-500'}>ESPERANZADOR</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [VOZ] // PERSPECTIVA NARRATIVA
          </label>
          <span className="text-[9px] font-mono text-zinc-600 uppercase">VOICE LOCK</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PERSON_OPTIONS.map((option) => {
            const active = narrativePerson === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onNarrativePersonChange(option)}
                className={`border px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-all duration-150 ${
                  active
                    ? 'border-orange-500 text-orange-400 bg-zinc-950'
                    : 'border-zinc-700 text-zinc-400 bg-zinc-900 hover:border-zinc-500 hover:text-zinc-200'
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [META] // DENSIDAD METAFÓRICA
          </label>
          <span className="text-[9px] font-mono text-zinc-600 uppercase">IMAGE LAYER</span>
        </div>
        <DensityBars value={metaphorDensity} onChange={onMetaphorDensityChange} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [CONCEPTO] // TEMA LIBRE (OPCIONAL)
          </label>
          <span className="text-[9px] font-mono text-zinc-600 uppercase">60 MAX</span>
        </div>
        <div className="relative">
          <input
            type="text"
            maxLength={60}
            value={thematicConcept}
            onChange={(event) => onThematicConceptChange(event.target.value)}
            placeholder="ej: soledad urbana, nostalgia de verano..."
            className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 pr-12 font-mono text-[11px] text-stone-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-orange-500"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[9px] font-mono text-zinc-500">
            {thematicConcept.length}/60
          </span>
        </div>
        {isWeakConcept && (
          <p className="text-[10px] font-mono leading-relaxed text-amber-400 uppercase tracking-[0.14em]">
            SUGERENCIA // Usa un concepto más concreto para que la letra siga ese tema con más precisión.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [GENERO] // ESTILO (OPCIONAL)
          </label>
          <span className="text-[9px] font-mono text-zinc-600 uppercase">40 MAX</span>
        </div>
        <div className="relative">
          <input
            type="text"
            maxLength={40}
            value={genre}
            onChange={(event) => onGenreChange(event.target.value)}
            placeholder="ej: indie rock, bolero, synthwave..."
            className="w-full border border-zinc-700 bg-zinc-950 px-3 py-2 pr-12 font-mono text-[11px] text-stone-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-orange-500"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-[9px] font-mono text-zinc-500">
            {genre.length}/40
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [CONFIG] // IDIOMA & EXTENSIÓN
          </label>
          <span className="text-[9px] font-mono text-zinc-600 uppercase">RUNTIME</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = language === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onLanguageChange(option)}
                    className={`border px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-all duration-150 ${
                      active
                        ? 'border-orange-500 text-orange-400 bg-zinc-950'
                        : 'border-zinc-700 text-zinc-400 bg-zinc-900 hover:border-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {option.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {LINE_OPTIONS.map((option) => {
                const active = linesToGenerate === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onLinesToGenerateChange(option)}
                    className={`border px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-all duration-150 ${
                      active
                        ? 'border-orange-500 text-orange-400 bg-zinc-950'
                        : 'border-zinc-700 text-zinc-400 bg-zinc-900 hover:border-zinc-500 hover:text-zinc-200'
                    }`}
                  >
                    {option} LÍNEAS
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onGenerate}
        disabled={isGenerating}
        className={`w-full border border-orange-500 px-4 py-3 font-mono text-[11px] font-bold tracking-[0.24em] uppercase transition-all duration-150 ${
          isGenerating
            ? 'cursor-wait bg-orange-500 text-black'
            : 'bg-orange-500 text-black hover:bg-orange-400'
        }`}
      >
        {isGenerating ? (
          <span className="inline-flex items-center justify-center gap-2">
            [ GENERANDO... ]
            <span className="h-3 w-1 bg-black animate-pulse" />
          </span>
        ) : (
          '[ GENERAR LETRA ]'
        )}
      </button>

      {(error || result) && (
        <div className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-400">
          {error ? (
            <span className="text-red-400">ERR // {error}</span>
          ) : result ? (
            <span className="text-emerald-400">OK // {result.emotionalTag}</span>
          ) : null}
        </div>
      )}
    </PanelWrapper>
  );
};
