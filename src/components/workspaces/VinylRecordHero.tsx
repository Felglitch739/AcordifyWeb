import React from 'react';
import { Disc3, Play, RefreshCw, Square } from 'lucide-react';
import { STRUM_PATTERN_OPTIONS, type GuitarTone, type StrumPatternId } from '../../audio';
import {
  MOOD_OPTIONS,
  getKeyOptions,
  type GeneratedProgression,
  type Mode,
  type MoodId,
} from '../../theory';

interface VinylRecordHeroProps {
  progression: GeneratedProgression;
  bpm: number;
  isPlaying: boolean;
  guitarTone: GuitarTone;
  strumPattern: StrumPatternId;
  onSelectMode: (mode: Mode) => void;
  onSelectKey: (root: string) => void;
  onSelectMood: (mood: MoodId) => void;
  onNextVariant: () => void;
  onTogglePlay: () => void;
  onChangeGuitarTone: (tone: GuitarTone) => void;
  onChangeStrumPattern: (pattern: StrumPatternId) => void;
}

const VINYL_MOOD_INK: Readonly<Record<MoodId, { bg: string; ink: string }>> = {
  calm: { bg: '#226B43', ink: '#FFFDF7' },
  melancholic: { bg: '#1D4ED8', ink: '#FFFDF7' },
  nostalgic: { bg: '#D83B26', ink: '#FFFDF7' },
  bright: { bg: '#D4F350', ink: '#141210' },
  energetic: { bg: '#CE1B45', ink: '#FFFDF7' },
};

export const VinylRecordHero: React.FC<VinylRecordHeroProps> = ({
  progression,
  bpm,
  isPlaying,
  guitarTone,
  strumPattern,
  onSelectMode,
  onSelectKey,
  onSelectMood,
  onNextVariant,
  onTogglePlay,
  onChangeGuitarTone,
  onChangeStrumPattern,
}) => {
  const keyOptions = getKeyOptions(progression.mode);
  const selectedMood = MOOD_OPTIONS.find((m) => m.id === progression.mood) ?? MOOD_OPTIONS[0];
  const labelStyle = VINYL_MOOD_INK[progression.mood];
  const spinDurationSec = Math.max(1.4, 2.2 * (76 / Math.max(50, bpm)));

  return (
    <section
      aria-label="Portada editorial y disco Vinilo Zine"
      className="vinyl-brutal-card p-5 sm:p-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Editorial Poster Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Risograph Stamp Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b-2 border-[#141210]">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-wider text-[#141210]">
              <span
                className="px-2 py-0.5 border border-[#141210]"
                style={{ backgroundColor: labelStyle.bg, color: labelStyle.ink }}
              >
                {selectedMood.label}
              </span>
              <span>EDICIÓN ACORDIFY · 33⅓ RPM · {bpm} BPM</span>
            </div>

            <button
              type="button"
              onClick={onNextVariant}
              className="inline-flex items-center gap-1.5 rounded border-2 border-[#141210] bg-[#FFFDF7] px-3 py-1 text-xs font-mono font-bold text-[#141210] shadow-[2px_2px_0_#141210] hover:bg-[#D4F350] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>OTRA VUELTA</span>
            </button>
          </div>

          {/* Giant Poster Typography Headline */}
          <div>
            <h2 className="font-poster text-4xl sm:text-5xl font-extrabold uppercase tracking-tight text-[#141210] leading-[0.98]">
              {progression.keyRoot} {progression.mode === 'major' ? 'Mayor' : 'Menor'}
            </h2>
            <p className="font-serif-editorial italic text-2xl sm:text-3xl text-[#3E3A34] mt-1">
              {progression.templateName}
            </p>
            <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 border border-[#141210] bg-[#EAE2D0] px-2.5 py-1 text-xs font-mono text-[#141210]">
              <span className="font-bold">ESCALA:</span>
              <span>{progression.scaleNotes.join(' · ')}</span>
            </div>
          </div>

          {/* Key & Mode Stamps */}
          <div className="space-y-2.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="inline-flex border-2 border-[#141210] bg-[#EAE2D0] self-start shrink-0">
                {(['major', 'minor'] as const).map((m) => {
                  const active = progression.mode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onSelectMode(m)}
                      className={`px-3 py-1.5 text-xs font-mono font-bold uppercase cursor-pointer transition ${
                        active
                          ? 'bg-[#141210] text-[#FFFDF7]'
                          : 'text-[#141210] hover:bg-[#FFFDF7]'
                      }`}
                    >
                      {m === 'major' ? 'Mayor' : 'Menor'}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 flex-1">
                {keyOptions.map((option) => {
                  const isSelected = option.root === progression.keyRoot;
                  return (
                    <button
                      key={`${progression.mode}-${option.root}`}
                      type="button"
                      onClick={() => onSelectKey(option.root)}
                      className={`border py-1.5 px-1 flex flex-col items-center justify-center font-mono transition cursor-pointer ${
                        isSelected
                          ? 'border-[#141210] bg-[#141210] text-[#FFFDF7] font-bold'
                          : 'border-[#141210]/40 bg-[#FFFDF7] text-[#141210] hover:border-[#141210]'
                      }`}
                    >
                      <span className="text-xs leading-tight">{option.root}</span>
                      <span
                        className={`text-[9px] leading-tight ${
                          isSelected ? 'text-[#EAE2D0]' : 'text-[#6A6358]'
                        }`}
                      >
                        {option.solfege}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood Stamps + Voice/Strum Stamps */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {MOOD_OPTIONS.map((option) => {
                  const active = option.id === progression.mood;
                  const swatch = VINYL_MOOD_INK[option.id];
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onSelectMood(option.id)}
                      style={active ? { backgroundColor: swatch.bg, color: swatch.ink } : undefined}
                      className={`inline-flex items-center gap-1.5 border border-[#141210] px-2.5 py-1 text-xs font-mono font-bold uppercase transition cursor-pointer ${
                        active ? '' : 'bg-[#FFFDF7] text-[#141210] hover:bg-[#EAE2D0]'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full border border-[#141210]"
                        style={{ backgroundColor: swatch.bg }}
                      />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <div className="inline-flex border border-[#141210] bg-[#FFFDF7]">
                  {([
                    { id: 'nylon', label: 'Nylon' },
                    { id: 'steel', label: 'Acero' },
                  ] as const).map((t) => {
                    const active = guitarTone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onChangeGuitarTone(t.id)}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase cursor-pointer ${
                          active ? 'bg-[#141210] text-[#FFFDF7]' : 'text-[#141210] hover:bg-[#EAE2D0]'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="inline-flex border border-[#141210] bg-[#FFFDF7]">
                  {STRUM_PATTERN_OPTIONS.map((p) => {
                    const active = strumPattern === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onChangeStrumPattern(p.id)}
                        className={`px-2 py-1 text-[11px] font-mono font-bold uppercase cursor-pointer ${
                          active ? 'bg-[#141210] text-[#FFFDF7]' : 'text-[#141210] hover:bg-[#EAE2D0]'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Interactive Spinning Vinyl Turntable Widget */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-md border-2 border-[#141210] bg-[#EAE2D0] p-4 shadow-[3px_3px_0_#141210]">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Detener disco' : 'Reproducir disco'}
            className="group relative w-44 h-44 sm:w-48 sm:h-48 cursor-pointer focus:outline-none"
          >
            <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
              {/* Spinning Record Platter */}
              <g
                style={{
                  transformOrigin: '96px 100px',
                  ['--spin-duration' as string]: `${spinDurationSec.toFixed(2)}s`,
                }}
                className={isPlaying ? 'spin-slow-active' : undefined}
              >
                <circle cx="96" cy="100" r="88" fill="#141210" stroke="#141210" strokeWidth="2" />
                {/* Vinyl Grooves */}
                <circle cx="96" cy="100" r="78" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <circle cx="96" cy="100" r="68" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
                <circle cx="96" cy="100" r="58" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <circle cx="96" cy="100" r="48" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

                {/* Vinyl Light-Sheen Reflection Arc */}
                <path
                  d="M 42 54 A 68 68 0 0 1 138 46"
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M 52 146 A 64 64 0 0 0 144 134"
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Center Mood Label */}
                <circle
                  cx="96"
                  cy="100"
                  r="33"
                  fill={labelStyle.bg}
                  stroke="#FFFDF7"
                  strokeWidth="2"
                />
                <text
                  x="96"
                  y="86"
                  textAnchor="middle"
                  fill={labelStyle.ink}
                  className="font-mono text-[8px] font-bold uppercase"
                >
                  ACORDIFY LP
                </text>
                <text
                  x="96"
                  y="119"
                  textAnchor="middle"
                  fill={labelStyle.ink}
                  className="font-mono text-[9px] font-bold"
                >
                  {progression.slots.map((s) => s.chord.symbol).join(' · ')}
                </text>

                {/* Center Spindle Hole */}
                <circle cx="96" cy="100" r="4.5" fill="#FBF8F0" stroke="#141210" strokeWidth="1.5" />
              </g>

              {/* Pivoting Brushed Steel Tonearm */}
              <g
                style={{
                  transformOrigin: '176px 28px',
                  transform: isPlaying ? 'rotate(24deg)' : 'rotate(2deg)',
                  transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              >
                <circle cx="176" cy="28" r="11" fill="#FFFDF7" stroke="#141210" strokeWidth="2" />
                <circle cx="176" cy="28" r="4" fill="#141210" />
                <path
                  d="M176 28 L166 96 L154 114"
                  fill="none"
                  stroke="#141210"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect
                  x="146"
                  y="110"
                  width="13"
                  height="8"
                  rx="1"
                  transform="rotate(28 152 114)"
                  fill="#D83B26"
                  stroke="#141210"
                  strokeWidth="1.5"
                />
              </g>
            </svg>
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded border-2 border-[#141210] px-3 py-1.5 text-xs font-mono font-bold uppercase cursor-pointer transition"
            style={{ backgroundColor: labelStyle.bg, color: labelStyle.ink }}
          >
            {isPlaying ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Levantar aguja</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <Disc3 className="w-3.5 h-3.5" />
                <span>Girar disco</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
