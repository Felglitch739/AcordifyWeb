import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Square, Timer, Volume2 } from 'lucide-react';
import { playWoodblockClick } from '../audio/karplusStrong';
import {
  PRACTICE_SCALES,
  SCALE_ROOTS,
  buildScaleBoxes,
  getScaleCompatibleChords,
  noteToSemitone,
  type Mode,
  type PracticeScaleId,
  type ScaleBoxNote,
} from '../theory';

interface ScalePracticeViewProps {
  initialRoot: string;
  initialMode: Mode;
  onPluckNote: (scientificNote: string) => void;
  onPreviewChord: (symbol: string) => void;
  onPracticeProgression: (root: string, mode: Mode) => void;
}

type DotLabelMode = 'fingers' | 'order' | 'notes' | 'degrees';
type PracticeDirection = 'up' | 'down' | 'updown';
type Subdivision = 'quarter' | 'eighth';

const DISPLAY_STRINGS = [1, 2, 3, 4, 5, 6] as const; // top=1ª (e), bottom=6ª (E)
const STRING_OPEN_LABELS: Readonly<Record<(typeof DISPLAY_STRINGS)[number], string>> = {
  1: 'e',
  2: 'B',
  3: 'G',
  4: 'D',
  5: 'A',
  6: 'E',
};
const INLAY_FRETS = new Set([3, 5, 7, 9, 15, 17]);

function resolveScaleRoot(candidate: string): string {
  if (SCALE_ROOTS.includes(candidate)) return candidate;
  try {
    const semi = noteToSemitone(candidate);
    const match = SCALE_ROOTS.find((r) => noteToSemitone(r) === semi);
    if (match) return match;
  } catch {
    // fallback below
  }
  return 'A';
}

export const ScalePracticeView: React.FC<ScalePracticeViewProps> = ({
  initialRoot,
  initialMode,
  onPluckNote,
  onPreviewChord,
  onPracticeProgression,
}) => {
  const [selectedScaleId, setSelectedScaleId] = useState<PracticeScaleId>(() =>
    initialMode === 'major' ? 'major-pentatonic' : 'minor-pentatonic',
  );
  const [selectedRoot, setSelectedRoot] = useState<string>(() => resolveScaleRoot(initialRoot));
  const [boxIndex, setBoxIndex] = useState<number>(0);
  const [showNextBoxConnection, setShowNextBoxConnection] = useState(false);
  const [dotLabelMode, setDotLabelMode] = useState<DotLabelMode>('fingers');

  const [direction, setDirection] = useState<PracticeDirection>('updown');
  const [subdivision, setSubdivision] = useState<Subdivision>('quarter');
  const [bpm, setBpm] = useState<number>(72);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const scaleDef = useMemo(
    () => PRACTICE_SCALES.find((s) => s.id === selectedScaleId) ?? PRACTICE_SCALES[0],
    [selectedScaleId],
  );

  const boxes = useMemo(
    () => buildScaleBoxes(selectedRoot, selectedScaleId),
    [selectedRoot, selectedScaleId],
  );

  const activeBox = boxes[boxIndex] ?? boxes[0];
  const nextBoxIndex = (boxIndex + 1) % boxes.length;
  const nextBox = boxes[nextBoxIndex];

  const practiceSequence = useMemo<ScaleBoxNote[]>(() => {
    const asc = activeBox.ascendingSteps;
    if (direction === 'up') return asc;
    if (direction === 'down') return [...asc].reverse();
    const descTail = [...asc].slice(0, -1).reverse();
    return [...asc, ...descTail];
  }, [activeBox, direction]);

  const compatibleChords = useMemo(
    () => getScaleCompatibleChords(selectedRoot, selectedScaleId),
    [selectedRoot, selectedScaleId],
  );

  const timerRef = useRef<number | null>(null);
  const stepCursorRef = useRef<number>(0);
  const sequenceRef = useRef<ScaleBoxNote[]>(practiceSequence);
  const metronomeCtxRef = useRef<AudioContext | null>(null);
  const metronomeEnabledRef = useRef(metronomeEnabled);
  const subdivisionRef = useRef(subdivision);
  const onPluckNoteRef = useRef(onPluckNote);

  useEffect(() => {
    sequenceRef.current = practiceSequence;
  }, [practiceSequence]);

  useEffect(() => {
    metronomeEnabledRef.current = metronomeEnabled;
  }, [metronomeEnabled]);

  useEffect(() => {
    subdivisionRef.current = subdivision;
  }, [subdivision]);

  useEffect(() => {
    onPluckNoteRef.current = onPluckNote;
  }, [onPluckNote]);

  const stopPractice = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stepCursorRef.current = 0;
    setActiveStepIndex(0);
    setIsPlaying(false);
    setActiveNoteId(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (metronomeCtxRef.current) {
        void metronomeCtxRef.current.close();
        metronomeCtxRef.current = null;
      }
    };
  }, []);

  const triggerStep = useCallback((idx: number) => {
    const seq = sequenceRef.current;
    if (seq.length === 0) return;
    const safeIdx = idx % seq.length;
    const step = seq[safeIdx];
    setActiveStepIndex(safeIdx);
    setActiveNoteId(step.id);
    onPluckNoteRef.current(step.scientificNote);

    if (metronomeEnabledRef.current && metronomeCtxRef.current) {
      const stepsPerBeat = subdivisionRef.current === 'eighth' ? 2 : 1;
      if (safeIdx % stepsPerBeat === 0) {
        playWoodblockClick(
          metronomeCtxRef.current,
          metronomeCtxRef.current.currentTime + 0.005,
          safeIdx % (stepsPerBeat * 4) === 0,
        );
      }
    }
  }, []);

  const schedulePracticeInterval = useCallback(
    (nextBpm: number, nextSubdivision: Subdivision) => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const stepMs =
        nextSubdivision === 'eighth'
          ? Math.round(30000 / Math.max(40, nextBpm))
          : Math.round(60000 / Math.max(40, nextBpm));

      timerRef.current = window.setInterval(() => {
        stepCursorRef.current =
          (stepCursorRef.current + 1) % Math.max(1, sequenceRef.current.length);
        triggerStep(stepCursorRef.current);
      }, stepMs);
    },
    [triggerStep],
  );

  const startPractice = useCallback(async () => {
    if (metronomeEnabledRef.current) {
      try {
        const webkitWin = window as Window & { webkitAudioContext?: typeof AudioContext };
        const AudioCtx = window.AudioContext || webkitWin.webkitAudioContext;
        if (AudioCtx && (!metronomeCtxRef.current || metronomeCtxRef.current.state === 'closed')) {
          metronomeCtxRef.current = new AudioCtx();
        }
        if (metronomeCtxRef.current && metronomeCtxRef.current.state === 'suspended') {
          await metronomeCtxRef.current.resume();
        }
      } catch {
        // Ignore audio context init issue
      }
    }

    stepCursorRef.current = 0;
    setIsPlaying(true);
    triggerStep(0);
    schedulePracticeInterval(bpm, subdivision);
  }, [bpm, subdivision, schedulePracticeInterval, triggerStep]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      stopPractice();
    } else {
      void startPractice();
    }
  };

  const handleChangeScale = (nextId: PracticeScaleId) => {
    stopPractice();
    setSelectedScaleId(nextId);
  };

  const handleChangeRoot = (nextRoot: string) => {
    stopPractice();
    setSelectedRoot(nextRoot);
  };

  const handleChangeBox = (nextIdx: number) => {
    stopPractice();
    setBoxIndex(nextIdx);
  };

  const handleChangeDirection = (nextDir: PracticeDirection) => {
    setDirection(nextDir);
    if (isPlaying) {
      stepCursorRef.current = 0;
    }
  };

  const handleChangeBpm = (nextBpm: number) => {
    const clamped = Math.max(45, Math.min(150, Math.round(nextBpm)));
    setBpm(clamped);
    if (isPlaying) {
      schedulePracticeInterval(clamped, subdivision);
    }
  };

  const handleChangeSubdivision = (nextSub: Subdivision) => {
    setSubdivision(nextSub);
    if (isPlaying) {
      schedulePracticeInterval(bpm, nextSub);
    }
  };

  const handleClickNote = (note: ScaleBoxNote) => {
    setActiveNoteId(note.id);
    const idxInSeq = practiceSequence.findIndex((s) => s.id === note.id);
    if (idxInSeq !== -1) {
      setActiveStepIndex(idxInSeq);
      stepCursorRef.current = idxInSeq;
    }
    onPluckNote(note.scientificNote);
  };

  // Determine next-box adjacent notes cleanly so connecting shapes touch visually
  const nextBoxDisplayNotes = useMemo(() => {
    if (!showNextBoxConnection || !nextBox) return [];
    const shiftFret = nextBox.endFret < activeBox.startFret - 1 ? 12 : 0;
    const activeSet = new Set(activeBox.notes.map((n) => `${n.stringNumber}-${n.fret}`));
    return nextBox.notes
      .map((n) => ({ ...n, fret: n.fret + shiftFret }))
      .filter((n) => n.fret <= 18 && !activeSet.has(`${n.stringNumber}-${n.fret}`));
  }, [showNextBoxConnection, nextBox, activeBox]);

  const windowStart = showNextBoxConnection
    ? Math.max(0, activeBox.startFret - (activeBox.startFret > 0 ? 1 : 0))
    : activeBox.startFret;
  const windowEnd = showNextBoxConnection
    ? Math.max(
        activeBox.endFret + 1,
        nextBoxDisplayNotes.length > 0 ? Math.max(...nextBoxDisplayNotes.map((n) => n.fret)) : 0,
      )
    : Math.max(activeBox.startFret + 3, activeBox.endFret);
  const fretCount = windowEnd - windowStart + 1;

  const FRET_COL_W = 54;
  const LEFT_PAD = 36;
  const RIGHT_PAD = 18;
  const TOP_PAD = 24;
  const STRING_GAP = 30;
  const SVG_W = LEFT_PAD + fretCount * FRET_COL_W + RIGHT_PAD;
  const SVG_H = TOP_PAD + 5 * STRING_GAP + 34;

  const fretCenterX = (fret: number) => LEFT_PAD + (fret - windowStart + 0.5) * FRET_COL_W;
  const stringY = (stringNumber: number) => TOP_PAD + (stringNumber - 1) * STRING_GAP;

  const activeStep =
    (activeNoteId && activeBox.notes.find((n) => n.id === activeNoteId)) ||
    practiceSequence[activeStepIndex] ||
    activeBox.ascendingSteps[0];

  const getDotText = (note: ScaleBoxNote) => {
    if (dotLabelMode === 'fingers') return note.finger === 0 ? '0' : String(note.finger);
    if (dotLabelMode === 'order') return String(note.order);
    if (dotLabelMode === 'notes') return note.noteName;
    return note.degreeLabel;
  };

  return (
    <section aria-label="Entrenador de escalas" className="space-y-6">
      <div className="studio-heading">
        <h1>{selectedRoot} <span>{scaleDef.name}</span></h1>
        <p>{scaleDef.description}</p>
      </div>

      {/* Fretboard + Where to Start Guidance + Practice Player */}
      <div className="surface-card p-4 sm:p-5 space-y-4">
        {/* Por dónde empezar strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] px-4 py-3">
          <p className="text-sm text-[var(--color-ink)] font-medium">
            {activeBox.startInstruction}
          </p>
          {activeStep && (
            <span className="font-mono text-xs text-[var(--color-ink-secondary)]">
              {!isPlaying && activeNoteId === null ? 'Listo para practicar · ' : ''}
              Paso {activeStep.order}/{activeBox.ascendingSteps.length} ·{' '}
              <strong className="text-[var(--color-ink)]">{activeStep.scientificNote}</strong> ·{' '}
              {activeStep.finger === 0 ? 'Al aire' : `Dedo ${activeStep.finger}`} · Grado{' '}
              {activeStep.degreeLabel}
            </span>
          )}
        </div>

        {/* Interactive Horizontal Neck SVG */}
        <div className="w-full overflow-x-auto rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] py-3 px-2">
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ maxWidth: `${Math.min(720, Math.round(SVG_W * 1.45))}px` }}
            className="mx-auto h-auto w-full select-none"
          >
            {/* Fretboard boundary lines */}
            {Array.from({ length: fretCount + 1 }, (_, i) => {
              const fretNum = windowStart + i;
              const x = LEFT_PAD + i * FRET_COL_W;
              const isNut = fretNum === 0;
              return (
                <line
                  key={`fret-line-${fretNum}`}
                  x1={x}
                  y1={TOP_PAD}
                  x2={x}
                  y2={TOP_PAD + 5 * STRING_GAP}
                  stroke={isNut ? '#111111' : '#D4D4D8'}
                  strokeWidth={isNut ? 5 : 1.3}
                />
              );
            })}

            {/* Fret Inlay Dots + Bottom Numbers */}
            {Array.from({ length: fretCount }, (_, i) => {
              const fretNum = windowStart + i;
              const cx = fretCenterX(fretNum);
              const midY = TOP_PAD + 2.5 * STRING_GAP;
              return (
                <g key={`fret-meta-${fretNum}`}>
                  {INLAY_FRETS.has(fretNum) && (
                    <circle cx={cx} cy={midY} r={5} fill="#E4E4E7" />
                  )}
                  {fretNum === 12 && (
                    <>
                      <circle cx={cx} cy={midY - STRING_GAP} r={5} fill="#E4E4E7" />
                      <circle cx={cx} cy={midY + STRING_GAP} r={5} fill="#E4E4E7" />
                    </>
                  )}
                  <text
                    x={cx}
                    y={SVG_H - 10}
                    textAnchor="middle"
                    fill="#71717A"
                    className="font-mono text-[11px]"
                  >
                    {fretNum === 0 ? 'Al aire' : `Tr. ${fretNum}`}
                  </text>
                </g>
              );
            })}

            {/* 6 Horizontal Guitar Strings */}
            {DISPLAY_STRINGS.map((strNum) => {
              const y = stringY(strNum);
              const thickness = 0.9 + (strNum - 1) * 0.28;
              return (
                <g key={`str-${strNum}`}>
                  <text
                    x={LEFT_PAD - 14}
                    y={y + 4}
                    textAnchor="end"
                    fill="#71717A"
                    className="font-mono text-[12px] font-medium"
                  >
                    {STRING_OPEN_LABELS[strNum]}
                  </text>
                  <line
                    x1={LEFT_PAD}
                    y1={y}
                    x2={SVG_W - RIGHT_PAD}
                    y2={y}
                    stroke="#52525B"
                    strokeWidth={thickness}
                  />
                </g>
              );
            })}

            {/* Optional Adjacent Box Connection Ghost Notes */}
            {nextBoxDisplayNotes.map((ghost) => {
              const cx = fretCenterX(ghost.fret);
              const cy = stringY(ghost.stringNumber);
              return (
                <g
                  key={`ghost-${ghost.stringNumber}-${ghost.fret}`}
                  className="pointer-events-none opacity-65"
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r={11}
                    fill="#FFFFFF"
                    stroke="#71717A"
                    strokeWidth={1.5}
                    strokeDasharray="3 2"
                  />
                  <text
                    x={cx}
                    y={cy + 3.5}
                    textAnchor="middle"
                    fill="#71717A"
                    className="font-mono text-[10px]"
                  >
                    {ghost.noteName}
                  </text>
                </g>
              );
            })}

            {/* Interactive Active Box Scale Notes */}
            {activeBox.notes.map((note) => {
              const cx = fretCenterX(note.fret);
              const cy = stringY(note.stringNumber);
              const isCurrent = activeNoteId === note.id;

              const fill = note.isRoot
                ? 'var(--color-accent)'
                : note.isBlueNote
                  ? '#FFFFFF'
                  : '#111111';
              const textColor = note.isBlueNote ? '#111111' : '#FFFFFF';
              const stroke = note.isBlueNote ? '#111111' : isCurrent ? 'var(--color-accent)' : '#FFFFFF';

              return (
                <g
                  key={note.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Nota ${note.scientificNote}, cuerda ${note.stringNumber}ª traste ${note.fret}, dedo ${note.finger}`}
                  onClick={() => handleClickNote(note)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClickNote(note);
                    }
                  }}
                  className="cursor-pointer"
                >
                  {isCurrent && (
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={2.5}
                      initial={{ r: 14, opacity: 0.85 }}
                      animate={{ r: 18.5, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
                    />
                  )}
                  {note.isBlueNote && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={15.5}
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth={1.2}
                      strokeDasharray="2 2"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={13}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={note.isBlueNote ? 2.2 : 1.5}
                  />
                  <text
                    x={cx}
                    y={cy + 4}
                    textAnchor="middle"
                    fill={textColor}
                    className="font-mono text-[11px] font-semibold"
                  >
                    {getDotText(note)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Diagram Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-ink-muted)]">
          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[var(--color-accent)]" />
              <span>Raíz ({selectedRoot})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[var(--color-ink)]" />
              <span>Nota de la escala</span>
            </span>
            {selectedScaleId === 'minor-blues' && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-[var(--color-ink)] bg-white" />
                <span>Nota azul (b5)</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E4E4E7]" />
              <span>Punto gris = guía de traste (3, 5, 7, 9, 12)</span>
            </span>
          </div>
          <span>Pulsa cualquier punto para escucharlo</span>
        </div>

        {/* Step-by-Step Practice Transport */}
        <div className="pt-3 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`rounded-full px-4 py-2 text-xs font-medium inline-flex items-center gap-2 transition-colors cursor-pointer ${
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
                  <span>Practicar escala</span>
                </>
              )}
            </button>

            <div
              className="inline-flex rounded-full bg-[var(--color-surface-subtle)] p-1"
              role="group"
              aria-label="Dirección de práctica"
            >
              {(
                [
                  { id: 'up', label: 'Subir' },
                  { id: 'down', label: 'Bajar' },
                  { id: 'updown', label: 'Subir y bajar' },
                ] as const
              ).map((dir) => {
                const active = direction === dir.id;
                return (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => handleChangeDirection(dir.id)}
                    className={`relative px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      active
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="scale-dir-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{dir.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-board)] px-2.5 py-1">
              {[60, 80, 100, 120].map((presetBpm) => (
                <button
                  key={presetBpm}
                  type="button"
                  onClick={() => handleChangeBpm(presetBpm)}
                  className={`rounded-full px-2 py-0.5 font-mono text-[11px] cursor-pointer transition-colors ${
                    bpm === presetBpm
                      ? 'bg-[var(--color-ink)] text-white'
                      : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {presetBpm}
                </button>
              ))}
              <input
                id="scale-bpm-slider"
                type="range"
                min={45}
                max={150}
                step={1}
                value={bpm}
                onChange={(e) => handleChangeBpm(Number(e.target.value))}
                aria-label="Tempo de escala en BPM"
                className="studio-slider w-[220px] max-w-[54vw] ml-1"
              />
              <div className="flex items-center gap-1 pl-1.5 border-l border-[var(--color-border)]">
                <input
                  id="scale-bpm-number-input"
                  type="number"
                  min={45}
                  max={150}
                  value={bpm}
                  aria-label="Escribir BPM de escala"
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    if (Number.isFinite(parsed) && parsed > 0) {
                      handleChangeBpm(parsed);
                    }
                  }}
                  className="w-10 bg-transparent text-center font-mono text-xs font-medium text-[var(--color-ink)] num-tabular"
                />
                <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">BPM</span>
              </div>
            </div>

            <div
              className="inline-flex rounded-full bg-[var(--color-surface-subtle)] p-1"
              role="group"
              aria-label="Subdivisión rítmica"
            >
              {(
                [
                  { id: 'quarter', label: 'Negras' },
                  { id: 'eighth', label: 'Corcheas' },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleChangeSubdivision(sub.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    subdivision === sub.id
                      ? 'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-border)]'
                      : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              aria-pressed={metronomeEnabled}
              onClick={() => setMetronomeEnabled((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                metronomeEnabled
                  ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]'
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Metrónomo</span>
            </button>
          </div>
        </div>
      </div>

      <h2 className="studio-settings-heading">Escala y posición</h2>
      {/* Controls Card */}
      <div className="surface-card p-4 sm:p-5 space-y-4">
        {/* Scale Type + 12 Roots */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div
            className="inline-flex flex-wrap rounded-full bg-[var(--color-surface-subtle)] p-1 self-start"
            role="group"
            aria-label="Tipo de escala"
          >
            {PRACTICE_SCALES.map((s) => {
              const active = selectedScaleId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleChangeScale(s.id)}
                  className={`relative px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    active
                      ? 'text-white'
                      : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="scale-type-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[var(--color-ink)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{s.name}</span>
                </button>
              );
            })}
          </div>

          <div
            className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 flex-1"
            role="group"
            aria-label="Tónica de la escala"
          >
            {SCALE_ROOTS.map((r) => {
              const active = selectedRoot === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleChangeRoot(r)}
                  className={`relative overflow-hidden rounded-xl border py-1.5 font-mono text-xs font-medium cursor-pointer transition-colors ${
                    active
                      ? 'border-[var(--color-ink)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="scale-root-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-[11px] bg-[var(--color-ink)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{r}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        {/* 5 Boxes + Dot Label Mode + Next Box Connection */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Cajas del mástil">
            {boxes.map((b, idx) => {
              const active = idx === boxIndex;
              return (
                <button
                  key={b.boxNumber}
                  type="button"
                  onClick={() => handleChangeBox(idx)}
                  className={`relative overflow-hidden rounded-xl border px-3 py-1.5 text-left cursor-pointer transition-colors ${
                    active
                      ? 'border-[var(--color-ink)] text-white'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="scale-box-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-[11px] bg-[var(--color-ink)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 block text-xs font-medium leading-tight">
                    Caja {b.boxNumber}
                  </span>
                  <span
                    className={`relative z-10 block font-mono text-[10px] ${
                      active ? 'text-white/75' : 'text-[var(--color-ink-muted)]'
                    }`}
                  >
                    Tr. {b.startFret}–{b.endFret}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex flex-wrap rounded-full bg-[var(--color-surface-subtle)] p-1"
              role="group"
              aria-label="Etiqueta de puntos"
            >
              {(
                [
                  { id: 'fingers', label: 'Dedos (1–4)' },
                  { id: 'order', label: `Orden (1–${activeBox.ascendingSteps.length})` },
                  { id: 'notes', label: 'Notas' },
                  { id: 'degrees', label: 'Grados' },
                ] as const
              ).map((m) => {
                const active = dotLabelMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setDotLabelMode(m.id)}
                    className={`relative px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      active
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="scale-dot-mode"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{m.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-pressed={showNextBoxConnection}
              onClick={() => setShowNextBoxConnection((v) => !v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                showNextBoxConnection
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-ink)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
              }`}
            >
              Ver conexión Caja {nextBox.boxNumber}
            </button>
          </div>
        </div>
      </div>

      {/* Connected Backing Chords */}
      <div className="surface-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
            Acordes compatibles para improvisar encima ({selectedRoot}{' '}
            {scaleDef.compatibleMode === 'major' ? 'Mayor' : 'Menor'})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {compatibleChords.map((chord) => (
              <button
                key={chord.degree}
                type="button"
                onClick={() => onPreviewChord(chord.symbol)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-board)] px-3 py-1 text-xs font-medium text-[var(--color-ink)] hover:border-[var(--color-ink-muted)] cursor-pointer transition-colors"
              >
                <Volume2 className="w-3 h-3 text-[var(--color-ink-muted)]" />
                <span>{chord.symbol}</span>
                <span className="font-mono text-[10px] text-[var(--color-ink-muted)]">
                  {chord.roman}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onPracticeProgression(selectedRoot, scaleDef.compatibleMode)}
          className="btn-primary shrink-0 self-start sm:self-center px-4 py-2.5 text-xs"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Practicar sobre progresión en {selectedRoot}</span>
        </button>
      </div>
    </section>
  );
};
