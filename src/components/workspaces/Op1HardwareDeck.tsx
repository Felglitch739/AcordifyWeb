import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { STRUM_PATTERN_OPTIONS, type GuitarTone, type StrumPatternId } from '../../audio';
import {
  MOOD_OPTIONS,
  getKeyOptions,
  type GeneratedProgression,
  type Mode,
  type MoodId,
} from '../../theory';

interface Op1HardwareDeckProps {
  progression: GeneratedProgression;
  bpm: number;
  isPlaying: boolean;
  activeChordIndex: number;
  activeBeat: number;
  guitarTone: GuitarTone;
  strumPattern: StrumPatternId;
  onSelectMode: (mode: Mode) => void;
  onSelectKey: (root: string) => void;
  onSelectMood: (mood: MoodId) => void;
  onNextVariant: () => void;
  onChangeBpm: (bpm: number) => void;
  onChangeGuitarTone: (tone: GuitarTone) => void;
  onChangeStrumPattern: (pattern: StrumPatternId) => void;
}

const OP1_MOOD_COLORS: Readonly<Record<MoodId, string>> = {
  calm: '#10855B',
  melancholic: '#2762EB',
  nostalgic: '#E64A19',
  bright: '#F5B400',
  energetic: '#D62839',
};

const EQ_HEIGHTS = [42, 74, 58, 92, 66, 84, 48, 70, 96, 56, 78, 44] as const;

export const Op1HardwareDeck: React.FC<Op1HardwareDeckProps> = ({
  progression,
  bpm,
  isPlaying,
  activeChordIndex,
  activeBeat,
  guitarTone,
  strumPattern,
  onSelectMode,
  onSelectKey,
  onSelectMood,
  onNextVariant,
  onChangeBpm,
  onChangeGuitarTone,
  onChangeStrumPattern,
}) => {
  const [ideaKnobClicks, setIdeaKnobClicks] = useState(0);

  const keyOptions = getKeyOptions(progression.mode);
  const currentKeyIdx = Math.max(
    0,
    keyOptions.findIndex((k) => k.root === progression.keyRoot),
  );
  const currentMoodIdx = Math.max(
    0,
    MOOD_OPTIONS.findIndex((m) => m.id === progression.mood),
  );
  const selectedMood = MOOD_OPTIONS[currentMoodIdx] ?? MOOD_OPTIONS[0];
  const activeChord =
    activeChordIndex >= 0
      ? progression.slots[activeChordIndex]?.chord.symbol ?? progression.slots[0]?.chord.symbol
      : progression.slots[0]?.chord.symbol;

  const spinDurationSec = Math.max(1.2, (60 / Math.max(50, bpm)) * 3.2);
  const bpmKnobDeg = Math.round(((bpm - 50) / 110) * 260 - 130);
  const keyKnobDeg = Math.round((currentKeyIdx / Math.max(1, keyOptions.length - 1)) * 270 - 135);
  const moodKnobDeg = Math.round((currentMoodIdx / Math.max(1, MOOD_OPTIONS.length - 1)) * 240 - 120);
  const ideaKnobDeg = ideaKnobClicks * 65;

  const stepKey = (delta: number) => {
    const nextIdx = (currentKeyIdx + delta + keyOptions.length) % keyOptions.length;
    onSelectKey(keyOptions[nextIdx].root);
  };

  const stepMood = (delta: number) => {
    const nextIdx = (currentMoodIdx + delta + MOOD_OPTIONS.length) % MOOD_OPTIONS.length;
    onSelectMood(MOOD_OPTIONS[nextIdx].id);
  };

  const handleIdeaSpin = () => {
    setIdeaKnobClicks((c) => c + 1);
    onNextVariant();
  };

  return (
    <section aria-label="Consola OP-1 Field" className="op1-chassis rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Top Row: Flush OLED Screen + 4 Color-Coded Rotary Encoders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Flush-Mounted High-Contrast OLED Display */}
        <div className="op1-oled-screen lg:col-span-7 rounded-xl p-4 text-[#F8FAFC] flex flex-col justify-between gap-3">
          {/* OLED Top Telemetry Line */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 bg-[#FF5722]/20 text-[#FF784E] font-semibold">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isPlaying ? 'bg-[#FF5722] animate-pulse' : 'bg-[#64748B]'
                  }`}
                />
                {isPlaying ? 'TAPE RUN' : 'STANDBY'}
              </span>
              <span className="text-[#38BDF8]">
                {progression.keyRoot} {progression.mode === 'major' ? 'MAJ' : 'MIN'}
              </span>
              <span className="text-[#64748B]">//</span>
              <span className="text-[#CBD5E1] uppercase">{selectedMood.label}</span>
            </div>

            <div className="flex items-center gap-2 text-[#94A3B8] num-tabular">
              <span>{guitarTone === 'nylon' ? 'CH1:NYLON' : 'CH1:STEEL'}</span>
              <span>·</span>
              <span className="text-[#FACC15]">{bpm} BPM</span>
            </div>
          </div>

          {/* Center SVG Cassette Tape Reels + Active Chord Monitor */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center py-1">
            <div className="sm:col-span-7 flex flex-col justify-center">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#64748B]">
                Progresión activa
              </p>
              <h2 className="font-hardware text-2xl sm:text-3xl font-bold text-[#F8FAFC] tracking-tight mt-0.5">
                {progression.keyRoot} {progression.mode === 'major' ? 'Mayor' : 'Menor'}{' '}
                <span className="text-[#94A3B8] font-normal text-lg sm:text-xl">
                  · {progression.templateName}
                </span>
              </h2>
              <div className="mt-2 flex items-center gap-1.5 font-mono text-xs">
                {progression.slots.map((slot) => {
                  const slotActive = activeChordIndex === slot.slotIndex;
                  return (
                    <span
                      key={slot.slotIndex}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        slotActive
                          ? 'border-[#FF5722] bg-[#FF5722]/20 text-[#FF8A65] font-bold'
                          : 'border-white/10 bg-white/[0.04] text-[#CBD5E1]'
                      }`}
                    >
                      {slot.chord.symbol}
                    </span>
                  );
                })}
                <span className="ml-auto text-[11px] text-[#38BDF8] font-semibold hidden sm:inline">
                  [{activeChord}]
                </span>
              </div>
            </div>

            {/* Dual Tape Reels Vector */}
            <div className="sm:col-span-5 rounded-lg border border-white/10 bg-[#07090B] px-3 py-2 flex flex-col items-center justify-center gap-1.5">
              <svg viewBox="0 0 156 54" className="w-full max-w-[152px] h-auto" aria-hidden="true">
                {/* Cassette bridge plate */}
                <rect x="4" y="4" width="148" height="46" rx="6" fill="#13161B" stroke="#252A33" strokeWidth="1.2" />
                <line x1="36" y1="44" x2="120" y2="44" stroke="#FF5722" strokeOpacity="0.45" strokeWidth="1.3" />
                <line x1="42" y1="10" x2="114" y2="10" stroke="#38BDF8" strokeOpacity="0.35" strokeWidth="1" />

                {/* Left Reel */}
                <g
                  style={{
                    transformOrigin: '42px 27px',
                    ['--spin-duration' as string]: `${spinDurationSec.toFixed(2)}s`,
                  }}
                  className={isPlaying ? 'spin-slow-active' : undefined}
                >
                  <circle cx="42" cy="27" r="14" fill="#0B0D10" stroke="#CBD5E1" strokeWidth="1.3" />
                  <circle cx="42" cy="27" r="5" fill="#FF5722" />
                  <line x1="42" y1="15" x2="42" y2="21" stroke="#F8FAFC" strokeWidth="1.5" />
                  <line x1="31.5" y1="33" x2="36.5" y2="30" stroke="#F8FAFC" strokeWidth="1.5" />
                  <line x1="52.5" y1="33" x2="47.5" y2="30" stroke="#F8FAFC" strokeWidth="1.5" />
                </g>

                {/* Center Level / Beat Bridge */}
                <g transform="translate(65, 16)">
                  {[0, 1, 2, 3].map((b) => {
                    const lit = isPlaying && activeBeat === b;
                    return (
                      <rect
                        key={b}
                        x={b * 7}
                        y={lit ? 4 : 10}
                        width="4"
                        height={lit ? 16 : 10}
                        rx="1"
                        fill={lit ? (b === 0 ? '#FF5722' : '#38BDF8') : '#334155'}
                      />
                    );
                  })}
                </g>

                {/* Right Reel */}
                <g
                  style={{
                    transformOrigin: '114px 27px',
                    ['--spin-duration' as string]: `${spinDurationSec.toFixed(2)}s`,
                  }}
                  className={isPlaying ? 'spin-slow-active' : undefined}
                >
                  <circle cx="114" cy="27" r="14" fill="#0B0D10" stroke="#CBD5E1" strokeWidth="1.3" />
                  <circle cx="114" cy="27" r="5" fill="#38BDF8" />
                  <line x1="114" y1="15" x2="114" y2="21" stroke="#F8FAFC" strokeWidth="1.5" />
                  <line x1="103.5" y1="33" x2="108.5" y2="30" stroke="#F8FAFC" strokeWidth="1.5" />
                  <line x1="124.5" y1="33" x2="119.5" y2="30" stroke="#F8FAFC" strokeWidth="1.5" />
                </g>
              </svg>

              {/* Micro EQ Bars */}
              <div className="flex items-end justify-center gap-1 h-3 w-full px-2">
                {EQ_HEIGHTS.map((h, idx) => (
                  <span
                    key={idx}
                    className="w-1 rounded-t-sm transition-all duration-150"
                    style={{
                      height: isPlaying
                        ? `${Math.max(25, ((h + activeBeat * 17) % 100))}%`
                        : '22%',
                      backgroundColor: idx % 3 === 0 ? '#FF5722' : '#38BDF8',
                      opacity: isPlaying ? 0.9 : 0.3,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* OLED Bottom Scale Readout */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[10px] font-mono text-[#94A3B8]">
            <span>SCALE: {progression.scaleNotes.join(' · ')}</span>
            <span className="text-[#CBD5E1]">
              PATRÓN: {STRUM_PATTERN_OPTIONS.find((p) => p.id === strumPattern)?.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Right: 4 Color-Coded Rotary Encoders + Voice/Pattern Toggles */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-4 gap-2">
            {/* Encoder 1: Orange BPM */}
            <div className="rounded-xl border border-black/12 bg-[#E3DFD6] p-2 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#18191B]">BPM</span>
              <div
                className="relative h-10 w-10 rounded-full bg-[#F25C2A] border border-black/20 shadow-[0_3px_0_#A63A16,inset_0_1px_0_rgba(255,255,255,0.45)] flex items-center justify-center transition-transform duration-200"
                style={{ transform: `rotate(${bpmKnobDeg}deg)` }}
                aria-hidden="true"
              >
                <span className="h-3.5 w-1 rounded-full bg-white -translate-y-2" />
              </div>
              <div className="flex items-center gap-1 w-full justify-center">
                <button
                  type="button"
                  onClick={() => onChangeBpm(Math.max(50, bpm - 5))}
                  className="op1-keycap rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#18191B] cursor-pointer"
                  aria-label="Bajar BPM en encoder"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => onChangeBpm(Math.min(160, bpm + 5))}
                  className="op1-keycap rounded px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#18191B] cursor-pointer"
                  aria-label="Subir BPM en encoder"
                >
                  +
                </button>
              </div>
            </div>

            {/* Encoder 2: Blue KEY */}
            <div className="rounded-xl border border-black/12 bg-[#E3DFD6] p-2 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#18191B]">TONO</span>
              <div
                className="relative h-10 w-10 rounded-full bg-[#2E6BF6] border border-black/20 shadow-[0_3px_0_#1942A3,inset_0_1px_0_rgba(255,255,255,0.45)] flex items-center justify-center transition-transform duration-200"
                style={{ transform: `rotate(${keyKnobDeg}deg)` }}
                aria-hidden="true"
              >
                <span className="h-3.5 w-1 rounded-full bg-white -translate-y-2" />
              </div>
              <div className="flex items-center gap-1 w-full justify-center">
                <button
                  type="button"
                  onClick={() => stepKey(-1)}
                  className="op1-keycap rounded p-0.5 text-[#18191B] cursor-pointer"
                  aria-label="Tono anterior"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => stepKey(1)}
                  className="op1-keycap rounded p-0.5 text-[#18191B] cursor-pointer"
                  aria-label="Siguiente tono"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Encoder 3: Ochre MOOD */}
            <div className="rounded-xl border border-black/12 bg-[#E3DFD6] p-2 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#18191B]">MOOD</span>
              <div
                className="relative h-10 w-10 rounded-full bg-[#D99B26] border border-black/20 shadow-[0_3px_0_#94660F,inset_0_1px_0_rgba(255,255,255,0.45)] flex items-center justify-center transition-transform duration-200"
                style={{ transform: `rotate(${moodKnobDeg}deg)` }}
                aria-hidden="true"
              >
                <span className="h-3.5 w-1 rounded-full bg-[#18191B] -translate-y-2" />
              </div>
              <div className="flex items-center gap-1 w-full justify-center">
                <button
                  type="button"
                  onClick={() => stepMood(-1)}
                  className="op1-keycap rounded p-0.5 text-[#18191B] cursor-pointer"
                  aria-label="Ánimo anterior"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => stepMood(1)}
                  className="op1-keycap rounded p-0.5 text-[#18191B] cursor-pointer"
                  aria-label="Siguiente ánimo"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Encoder 4: Ceramic White IDEA */}
            <div className="rounded-xl border border-black/12 bg-[#E3DFD6] p-2 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#18191B]">IDEA</span>
              <button
                type="button"
                onClick={handleIdeaSpin}
                title="Otra progresión"
                className="relative h-10 w-10 rounded-full bg-[#FAF8F4] border border-black/20 shadow-[0_3px_0_#B4AFA5,inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-center transition-transform duration-300 cursor-pointer active:translate-y-0.5"
                style={{ transform: `rotate(${ideaKnobDeg}deg)` }}
              >
                <span className="h-3.5 w-1 rounded-full bg-[#FF5722] -translate-y-2" />
              </button>
              <button
                type="button"
                onClick={handleIdeaSpin}
                className="op1-keycap rounded px-2 py-0.5 text-[10px] font-mono font-bold text-[#18191B] inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5 text-[#E64A19]" />
                <span>NEXT</span>
              </button>
            </div>
          </div>

          {/* Guitar Voice & Strum Pattern Hardware Pills */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-black/10 bg-[#E3DFD6] p-1.5 flex items-center gap-1">
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
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-mono font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-[#18191B] text-[#F8FAFC]'
                        : 'text-[#505258] hover:text-[#18191B]'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-black/10 bg-[#E3DFD6] p-1.5 flex items-center gap-1">
              {STRUM_PATTERN_OPTIONS.map((p) => {
                const active = strumPattern === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChangeStrumPattern(p.id)}
                    className={`flex-1 rounded-lg py-1.5 text-[10px] font-mono font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-[#FF5722] text-white'
                        : 'text-[#505258] hover:text-[#18191B]'
                    }`}
                  >
                    {p.label.slice(0, 4).toUpperCase()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Machined Keycap Chromatic Strip + Mood LED Row */}
      <div className="pt-3 border-t border-black/10 space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5">
          {/* MAJ / MIN Mechanical Switch */}
          <div className="inline-flex rounded-xl bg-[#DBD7CE] p-1 border border-black/12 self-start shrink-0">
            {(['major', 'minor'] as const).map((m) => {
              const active = progression.mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onSelectMode(m)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold uppercase transition cursor-pointer ${
                    active
                      ? 'bg-[#18191B] text-white shadow-sm'
                      : 'text-[#505258] hover:text-[#18191B]'
                  }`}
                >
                  {m === 'major' ? 'Mayor' : 'Menor'}
                </button>
              );
            })}
          </div>

          {/* 12 Tactile Keycaps */}
          <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 flex-1">
            {keyOptions.map((option) => {
              const isSelected = option.root === progression.keyRoot;
              return (
                <button
                  key={`${progression.mode}-${option.root}`}
                  type="button"
                  onClick={() => onSelectKey(option.root)}
                  className={`op1-keycap rounded-lg py-1.5 px-1 flex flex-col items-center justify-center cursor-pointer ${
                    isSelected ? 'ring-2 ring-[#FF5722] bg-[#FFFDF9]' : ''
                  }`}
                >
                  <span className="font-mono text-xs font-bold text-[#18191B]">
                    {option.root}
                  </span>
                  <span className="text-[9px] font-mono text-[#70737A]">
                    {option.solfege}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5 Hardware Mood Indicators */}
        <div className="flex flex-wrap items-center gap-1.5">
          {MOOD_OPTIONS.map((option) => {
            const active = option.id === progression.mood;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectMood(option.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-mono font-semibold transition cursor-pointer ${
                  active
                    ? 'border-[#18191B] bg-[#18191B] text-white'
                    : 'border-black/12 bg-[#E3DFD6] text-[#505258] hover:text-[#18191B]'
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: OP1_MOOD_COLORS[option.id] }}
                />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
