import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Compass, Play, Sparkles, Volume2 } from 'lucide-react';
import { getGuitarChord, type GuitarChordVoicing } from '../data/chords';
import {
  CIRCLE_POSITIONS,
  buildScaleNotes,
  getCirclePositionForKey,
  getDiatonicChords,
  getDiatonicTetrads,
  getHarmonicNeighbors,
  type DiatonicChord,
  type Mode,
} from '../theory';
import { Fretboard } from './Fretboard';

interface CircleOfFifthsViewProps {
  activeKeyRoot: string;
  activeMode: Mode;
  onPreviewChord: (symbol: string) => void;
  onPluckNote: (noteName: string) => void;
  onComposeInKey: (keyRoot: string, mode: Mode) => void;
}

const CX = 210;
const CY = 210;
const R_OUTER = 192;
const R_MID = 128;
const R_INNER = 66;

function polar(degFromTop: number, radius: number): { x: number; y: number } {
  const rad = ((degFromTop - 90) * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY + radius * Math.sin(rad),
  };
}

function annularWedgePath(
  startDeg: number,
  endDeg: number,
  innerR: number,
  outerR: number,
): string {
  const p1 = polar(startDeg, outerR);
  const p2 = polar(endDeg, outerR);
  const p3 = polar(endDeg, innerR);
  const p4 = polar(startDeg, innerR);
  return [
    `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`,
    `L ${p3.x.toFixed(2)} ${p3.y.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 0 0 ${p4.x.toFixed(2)} ${p4.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function arcOnRadius(startDeg: number, endDeg: number, radius: number, sweepClockwise: boolean): string {
  const p1 = polar(startDeg, radius);
  const p2 = polar(endDeg, radius);
  const sweepFlag = sweepClockwise ? 1 : 0;
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${radius} ${radius} 0 0 ${sweepFlag} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
}

function getNoteNameForStringIndex(
  voicing: GuitarChordVoicing,
  stringIndex: number,
): string | undefined {
  if (voicing.frets[stringIndex] < 0) return undefined;
  let playedIdx = 0;
  for (let i = 0; i < stringIndex; i++) {
    if (voicing.frets[i] >= 0) playedIdx += 1;
  }
  return voicing.midiNotes[playedIdx];
}

export const CircleOfFifthsView: React.FC<CircleOfFifthsViewProps> = ({
  activeKeyRoot,
  activeMode,
  onPreviewChord,
  onPluckNote,
  onComposeInKey,
}) => {
  const [selectedKeyRoot, setSelectedKeyRoot] = useState(activeKeyRoot);
  const [selectedMode, setSelectedMode] = useState<Mode>(activeMode);
  const [readingDirection, setReadingDirection] = useState<'fifths' | 'fourths'>('fifths');
  const [chordDisplay, setChordDisplay] = useState<'triads' | 'tetrads'>('triads');
  const [neighborFocus, setNeighborFocus] = useState<'subdominant' | 'relative' | 'dominant'>(
    'dominant',
  );
  const [inspectedChordSymbol, setInspectedChordSymbol] = useState<string | null>(null);
  const [pluckTick, setPluckTick] = useState(0);

  const activePos = useMemo(
    () => getCirclePositionForKey(selectedKeyRoot, selectedMode),
    [selectedKeyRoot, selectedMode],
  );

  const scaleNotes = useMemo(
    () => buildScaleNotes(selectedKeyRoot, selectedMode),
    [selectedKeyRoot, selectedMode],
  );

  const diatonicChords = useMemo(
    () => getDiatonicChords(selectedKeyRoot, selectedMode),
    [selectedKeyRoot, selectedMode],
  );

  const diatonicTetrads = useMemo(
    () => getDiatonicTetrads(selectedKeyRoot, selectedMode),
    [selectedKeyRoot, selectedMode],
  );

  const neighbors = useMemo(
    () => getHarmonicNeighbors(selectedKeyRoot, selectedMode),
    [selectedKeyRoot, selectedMode],
  );

  const inspectedTriad: DiatonicChord = useMemo(() => {
    if (inspectedChordSymbol) {
      const match = diatonicChords.find((c) => c.symbol === inspectedChordSymbol);
      if (match) return match;
    }
    return diatonicChords[0];
  }, [diatonicChords, inspectedChordSymbol]);

  const inspectedVoicing = useMemo(
    () => getGuitarChord(inspectedTriad.symbol),
    [inspectedTriad.symbol],
  );

  const handleSelectWheelKey = (root: string, mode: Mode) => {
    setSelectedKeyRoot(root);
    setSelectedMode(mode);
    setInspectedChordSymbol(null);
    const chords = getDiatonicChords(root, mode);
    if (chords[0]) {
      onPreviewChord(chords[0].symbol);
    }
  };

  const handleToggleMode = (nextMode: Mode) => {
    if (nextMode === selectedMode) return;
    const nextRoot = nextMode === 'major' ? activePos.majorRoot : activePos.minorRoot;
    handleSelectWheelKey(nextRoot, nextMode);
  };

  const handlePreviewDiagramChord = (triadSymbol: string) => {
    setInspectedChordSymbol(triadSymbol);
    setPluckTick((t) => t + 1);
    onPreviewChord(triadSymbol);
  };

  const getVisualSlot = (index: number) =>
    readingDirection === 'fifths' ? index : (12 - index) % 12;

  const activeSlot = getVisualSlot(activePos.index);
  const domSlot = getVisualSlot(neighbors.dominant.positionIndex);
  const subSlot = getVisualSlot(neighbors.subdominant.positionIndex);

  const activeDeg = activeSlot * 30;
  const domDeg = domSlot * 30;
  const subDeg = subSlot * 30;

  const domArcPath = arcOnRadius(activeDeg, domDeg, R_MID, readingDirection === 'fifths');
  const subArcPath = arcOnRadius(activeDeg, subDeg, R_MID, readingDirection !== 'fifths');
  const relSpokeStart = polar(activeDeg, R_MID - 4);
  const relSpokeEnd = polar(activeDeg, R_INNER + 4);

  const focusedNeighbor = neighbors[neighborFocus];
  const focusedComparison = focusedNeighbor.comparison;

  return (
    <section aria-label="Círculo de Quintas interactivo" className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
            <Compass className="w-3.5 h-3.5" />
            <span>Armonía conectada · Estos quedan con estos</span>
          </p>
          <h1 className="text-[32px] sm:text-[42px] font-medium tracking-[-0.03em] leading-[1.08] text-[var(--color-ink)]">
            Círculo de Quintas{' '}
            <span className="font-editorial text-[var(--color-ink-secondary)]">
              — {selectedKeyRoot} {selectedMode === 'major' ? 'Mayor' : 'Menor'}
            </span>
          </h1>
          <p className="text-sm text-[var(--color-ink-secondary)] max-w-2xl">
            Pulsa cualquier tonalidad para ver sus acordes, sus vecinos compatibles y cómo cambiar de tono sin romper la canción.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onComposeInKey(selectedKeyRoot, selectedMode)}
          className="btn-primary self-start md:self-auto shrink-0 px-4 py-2.5 text-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            Componer en {selectedKeyRoot} {selectedMode === 'major' ? 'Mayor' : 'Menor'}
          </span>
        </button>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive SVG Wheel */}
        <div className="lg:col-span-5 surface-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Fifths / Fourths toggle */}
            <div
              className="inline-flex rounded-full bg-[var(--color-surface-subtle)] p-1"
              role="group"
              aria-label="Lectura del círculo"
            >
              {(
                [
                  { id: 'fifths', label: 'Quintas (♯)' },
                  { id: 'fourths', label: 'Cuartas (♭)' },
                ] as const
              ).map((dir) => {
                const active = readingDirection === dir.id;
                return (
                  <button
                    key={dir.id}
                    type="button"
                    onClick={() => setReadingDirection(dir.id)}
                    className={`relative px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="circle-dir-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[var(--color-ink)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{dir.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Major / Minor quick mode toggle */}
            <div
              className="inline-flex rounded-full bg-[var(--color-surface-subtle)] p-1"
              role="group"
              aria-label="Anillo activo"
            >
              {(['major', 'minor'] as const).map((m) => {
                const active = selectedMode === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleToggleMode(m)}
                    className={`relative px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      active
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="circle-mode-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{m === 'major' ? 'Mayor' : 'Menor'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[400px]">
            <svg viewBox="0 0 420 420" className="w-full h-auto select-none">
              {/* Direction hint along outer perimeter */}
              <text
                x={CX}
                y="12"
                textAnchor="middle"
                fill="#71717A"
                className="font-mono text-[10px] uppercase tracking-[0.12em]"
              >
                {readingDirection === 'fifths' ? 'Sentido horario · Quintas (♯) ↻' : 'Sentido horario · Cuartas (♭) ↻'}
              </text>

              {CIRCLE_POSITIONS.map((pos) => {
                const slot = getVisualSlot(pos.index);
                const centerDeg = slot * 30;
                const startDeg = centerDeg - 15;
                const endDeg = centerDeg + 15;

                const isSamePos = activePos.index === pos.index;
                const isMajorSelected = isSamePos && selectedMode === 'major';
                const isMinorSelected = isSamePos && selectedMode === 'minor';
                const isMajorRelative = isSamePos && selectedMode === 'minor';
                const isMinorRelative = isSamePos && selectedMode === 'major';
                const isNeighborPos =
                  pos.index === neighbors.dominant.positionIndex ||
                  pos.index === neighbors.subdominant.positionIndex;

                const majorFill = isMajorSelected
                  ? '#111111'
                  : isMajorRelative
                    ? 'rgba(232, 93, 61, 0.14)'
                    : isNeighborPos && selectedMode === 'major'
                      ? '#ECECEF'
                      : '#FFFFFF';

                const minorFill = isMinorSelected
                  ? '#111111'
                  : isMinorRelative
                    ? 'rgba(232, 93, 61, 0.14)'
                    : isNeighborPos && selectedMode === 'minor'
                      ? '#ECECEF'
                      : '#FAFAFA';

                const majorLabelPos = polar(centerDeg, (R_OUTER + R_MID) / 2);
                const minorLabelPos = polar(centerDeg, (R_MID + R_INNER) / 2);

                return (
                  <g key={pos.index}>
                    {/* Outer Major Wedge */}
                    <path
                      d={annularWedgePath(startDeg, endDeg, R_MID, R_OUTER)}
                      fill={majorFill}
                      stroke={isMajorRelative ? '#E85D3D' : '#E4E4E7'}
                      strokeWidth={isMajorRelative ? 1.6 : 1}
                      className="cursor-pointer transition-colors duration-150 hover:opacity-90"
                      role="button"
                      tabIndex={0}
                      aria-label={`${pos.majorRoot} Mayor`}
                      data-circle-key={`${pos.majorRoot}-major`}
                      onClick={() => handleSelectWheelKey(pos.majorRoot, 'major')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectWheelKey(pos.majorRoot, 'major');
                        }
                      }}
                    />
                    <text
                      x={majorLabelPos.x}
                      y={majorLabelPos.y + 4}
                      textAnchor="middle"
                      fill={isMajorSelected ? '#FFFFFF' : isMajorRelative ? '#E85D3D' : '#111111'}
                      className="pointer-events-none font-mono text-[13px] font-semibold"
                    >
                      {pos.majorRoot}
                    </text>

                    {/* Inner Minor Wedge */}
                    <path
                      d={annularWedgePath(startDeg, endDeg, R_INNER, R_MID)}
                      fill={minorFill}
                      stroke={isMinorRelative ? '#E85D3D' : '#E4E4E7'}
                      strokeWidth={isMinorRelative ? 1.6 : 1}
                      className="cursor-pointer transition-colors duration-150 hover:opacity-90"
                      role="button"
                      tabIndex={0}
                      aria-label={`${pos.minorRoot} Menor`}
                      data-circle-key={`${pos.minorRoot}-minor`}
                      onClick={() => handleSelectWheelKey(pos.minorRoot, 'minor')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectWheelKey(pos.minorRoot, 'minor');
                        }
                      }}
                    />
                    <text
                      x={minorLabelPos.x}
                      y={minorLabelPos.y + 3.5}
                      textAnchor="middle"
                      fill={isMinorSelected ? '#FFFFFF' : isMinorRelative ? '#E85D3D' : '#52525B'}
                      className="pointer-events-none font-mono text-[10.5px] font-medium"
                    >
                      {pos.minorRoot}m
                    </text>
                  </g>
                );
              })}

              {/* Animated Harmonic Bridge Arcs on Ring Divider (Zero text overlap) */}
              <motion.path
                key={`sub-${activePos.index}-${readingDirection}`}
                d={subArcPath}
                fill="none"
                stroke="#71717A"
                strokeWidth="2.5"
                strokeDasharray="4 3"
                initial={{ pathLength: 0, opacity: 0.4 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={{ duration: 0.28 }}
                className="pointer-events-none"
              />
              <motion.path
                key={`dom-${activePos.index}-${readingDirection}`}
                d={domArcPath}
                fill="none"
                stroke="#E85D3D"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0.5 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.28 }}
                className="pointer-events-none"
              />
              <motion.line
                key={`rel-${activePos.index}-${readingDirection}`}
                x1={relSpokeStart.x}
                y1={relSpokeStart.y}
                x2={relSpokeEnd.x}
                y2={relSpokeEnd.y}
                stroke="#E85D3D"
                strokeWidth="2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.24 }}
                className="pointer-events-none"
              />

              {/* Center Medallion */}
              <circle cx={CX} cy={CY} r={R_INNER - 2} fill="#FFFFFF" stroke="#E4E4E7" strokeWidth="1" />
              <text
                x={CX}
                y={CY - 12}
                textAnchor="middle"
                fill="#111111"
                className="font-sans text-[19px] font-semibold"
              >
                {selectedKeyRoot}
                {selectedMode === 'minor' ? 'm' : ''}
              </text>
              <text
                x={CX}
                y={CY + 5}
                textAnchor="middle"
                fill="#71717A"
                className="font-mono text-[10px] uppercase"
              >
                {selectedMode === 'major' ? 'Mayor' : 'Menor'}
              </text>
              <text
                x={CX}
                y={CY + 22}
                textAnchor="middle"
                fill="#E85D3D"
                className="font-mono text-[10px] font-medium"
              >
                {activePos.accidentals === 0
                  ? '0 alt.'
                  : activePos.accidentals > 0
                    ? `${activePos.accidentals}♯`
                    : `${Math.abs(activePos.accidentals)}♭`}
              </text>
            </svg>
          </div>

          {/* Concise Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-2 border-t border-[var(--color-border)] text-[11px] font-mono text-[var(--color-ink-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-ink)]" />
              <span>Activa</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-tint)]" />
              <span>Relativa</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 bg-[var(--color-accent)]" />
              <span>Dominante (+1)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-3.5 border-b-2 border-dashed border-[var(--color-ink-muted)]" />
              <span>Subdominante (−1)</span>
            </span>
          </div>
        </div>

        {/* Right: Diatonic Chords + Neighbor "Estos quedan con estos" */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card A: Scale, Key Signature & 7 Diatonic Chords */}
          <div className="surface-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] pb-3.5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                  Armadura: {activePos.signatureLabel}
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--color-ink-secondary)]">
                  Escala: <span className="text-[var(--color-ink)] font-medium">{scaleNotes.join(' · ')}</span>
                </p>
              </div>

              <div
                className="inline-flex rounded-full bg-[var(--color-surface-subtle)] p-1"
                role="group"
                aria-label="Tipo de acorde diatónico"
              >
                {(
                  [
                    { id: 'triads', label: 'Tríadas' },
                    { id: 'tetrads', label: 'Tétradas (7ª)' },
                  ] as const
                ).map((t) => {
                  const active = chordDisplay === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setChordDisplay(t.id)}
                      className={`relative px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        active
                          ? 'text-[var(--color-ink)]'
                          : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="circle-chord-type"
                          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                          className="absolute inset-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 7 Diatonic Chord Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {diatonicChords.map((chord, idx) => {
                const tetrad = diatonicTetrads[idx];
                const displaySymbol = chordDisplay === 'tetrads' ? tetrad.symbol : chord.symbol;
                const displayRoman = chordDisplay === 'tetrads' ? tetrad.roman : chord.roman;
                const isInspected = inspectedTriad.symbol === chord.symbol;

                return (
                  <button
                    key={chord.degree}
                    type="button"
                    onClick={() => handlePreviewDiagramChord(chord.symbol)}
                    className={`rounded-[12px] border p-2.5 text-left transition-colors cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isInspected
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent-tint)]'
                        : 'border-[var(--color-border)] bg-[var(--color-surface-board)] hover:border-[var(--color-ink-muted)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[11px] font-medium text-[var(--color-ink-muted)]">
                        {displayRoman}
                      </span>
                      <Volume2 className="w-3 h-3 text-[var(--color-ink-muted)]" />
                    </div>
                    <span className="text-base font-medium text-[var(--color-ink)] truncate">
                      {displaySymbol}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-[var(--color-ink-secondary)]">
                      {chord.functionLabel}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Inspected Chord Diagram Preview */}
            <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-4 flex flex-col sm:flex-row items-center gap-5">
              <div className="shrink-0">
                <Fretboard
                  frets={inspectedVoicing.frets}
                  fingers={inspectedVoicing.fingers}
                  rootStrings={inspectedVoicing.rootStrings}
                  startFret={inspectedVoicing.startFret}
                  barre={inspectedVoicing.barre}
                  isActive={pluckTick > 0}
                  pluckTick={pluckTick}
                  onPluckString={(strIdx) => {
                    const note = getNoteNameForStringIndex(inspectedVoicing, strIdx);
                    if (note) onPluckNote(note);
                  }}
                />
              </div>
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="text-2xl font-medium text-[var(--color-ink)]">
                    {inspectedTriad.symbol}
                  </span>
                  <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-0.5 font-mono text-xs text-[var(--color-ink-secondary)]">
                    {inspectedTriad.roman} · {inspectedTriad.functionLabel}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  {inspectedTriad.explanation}
                </p>
                <p className="font-mono text-xs text-[var(--color-ink-muted)]">
                  Notas: {inspectedTriad.notes.join(' · ')}
                </p>
                <button
                  type="button"
                  onClick={() => handlePreviewDiagramChord(inspectedTriad.symbol)}
                  className="btn-secondary bg-[var(--color-surface)] px-3.5 py-1.5 text-xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Rasguear {inspectedTriad.symbol}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card B: Harmonic Neighbors & Pivot Modulation */}
          <div className="surface-card p-4 sm:p-5 space-y-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--color-ink-muted)]">
                Si te mueves de tonalidad
              </p>
              <h2 className="text-xl font-medium text-[var(--color-ink)] mt-0.5">
                Estos quedan con estos
              </h2>
            </div>

            {/* Neighbor tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 rounded-[12px] bg-[var(--color-surface-subtle)] p-1">
              {(
                [
                  {
                    id: 'subdominant',
                    label: `Subdominante · ${neighbors.subdominant.root}${
                      neighbors.subdominant.mode === 'minor' ? 'm' : ''
                    }`,
                  },
                  {
                    id: 'relative',
                    label: `Relativa · ${neighbors.relative.root}${
                      neighbors.relative.mode === 'minor' ? 'm' : ''
                    }`,
                  },
                  {
                    id: 'dominant',
                    label: `Dominante · ${neighbors.dominant.root}${
                      neighbors.dominant.mode === 'minor' ? 'm' : ''
                    }`,
                  },
                ] as const
              ).map((tab) => {
                const active = neighborFocus === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setNeighborFocus(tab.id)}
                    className={`relative rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                      active
                        ? 'text-[var(--color-ink)]'
                        : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="circle-neighbor-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${selectedKeyRoot}-${selectedMode}-${neighborFocus}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-4 space-y-3"
              >
                <p className="text-sm text-[var(--color-ink)] leading-relaxed">
                  {focusedComparison.summary}
                </p>

                {/* Shared Pivot Chords */}
                <div className="space-y-1.5">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    Acordes pivote que ya tienes (pulsa para escuchar)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {focusedComparison.sharedChords.map((shared) => {
                      const isPivot =
                        focusedComparison.suggestedPivot?.fromSymbol === shared.fromSymbol;
                      return (
                        <button
                          key={shared.fromSymbol}
                          type="button"
                          onClick={() => onPreviewChord(shared.fromSymbol)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium cursor-pointer transition-colors ${
                            isPivot
                              ? 'border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-ink)]'
                              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-ink-muted)]'
                          }`}
                        >
                          <span className="font-mono">{shared.fromSymbol}</span>
                          <span className="text-[10px] text-[var(--color-ink-muted)]">
                            {shared.fromRoman} → {shared.toRoman}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Changed notes + transformed chords */}
                {focusedComparison.changedNotes.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--color-border)] text-xs">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                        Nota que cambia
                      </p>
                      <p className="mt-1 font-mono font-medium text-[var(--color-accent)]">
                        {focusedComparison.changedNotes
                          .map((c) => `${c.removed} → ${c.added}`)
                          .join(', ')}
                      </p>
                    </div>
                    {focusedComparison.transformedChords.length > 0 && (
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                          Qué pasa al cruzar
                        </p>
                        <p className="mt-1 text-[var(--color-ink-secondary)]">
                          {focusedComparison.transformedChords[0].explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border)]">
                  {focusedComparison.suggestedPivot && (
                    <span className="text-xs text-[var(--color-ink-secondary)]">
                      Puente sugerido:{' '}
                      <strong className="font-mono text-[var(--color-ink)]">
                        {focusedComparison.suggestedPivot.fromSymbol}
                      </strong>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleSelectWheelKey(focusedNeighbor.root, focusedNeighbor.mode)
                    }
                    className="btn-secondary bg-[var(--color-surface)] px-3.5 py-1.5 text-xs ml-auto"
                  >
                    <span>
                      Ir a {focusedNeighbor.root}{' '}
                      {focusedNeighbor.mode === 'major' ? 'Mayor' : 'Menor'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};
