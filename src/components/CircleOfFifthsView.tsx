import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Play, Square, Volume2 } from 'lucide-react';
import { getGuitarChord } from '../data/chords';
import {
  CIRCLE_POSITIONS,
  buildScaleNotes,
  getCirclePositionForKey,
  getDiatonicChords,
  getDiatonicTetrads,
  getHarmonicNeighbors,
  type Mode,
} from '../theory';
import { Fretboard } from './Fretboard';
import './CircleOfFifthsView.css';

interface CircleOfFifthsViewProps {
  activeKeyRoot: string;
  activeMode: Mode;
  onPreviewChord: (symbol: string) => void;
  onPluckNote: (noteName: string) => void;
  onPracticeExample: (keyRoot: string, mode: Mode, degrees: readonly number[]) => void;
}

const CENTER = 210;
const RINGS = [
  { mode: 'major', inner: 127, outer: 198 },
  { mode: 'minor', inner: 73, outer: 127 },
] as const;
const EXAMPLE_DEGREES = [1, 4, 5, 1] as const;
const EXAMPLE_LABELS = ['Inicio', 'Cambio', 'Antes de volver', 'Regreso'];
const CHORD_MS = 1700;
const NOTE_NAMES: Record<string, string> = {
  C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si',
};

function keyName(root: string, mode: Mode) {
  const accidental = root.slice(1).replaceAll('#', '♯').replaceAll('b', '♭');
  return (NOTE_NAMES[root[0]] ?? root[0]) + accidental + (mode === 'major' ? ' mayor' : ' menor');
}

function point(angle: number, radius: number) {
  const rad = (angle - 90) * Math.PI / 180;
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function wedgePath(angle: number, inner: number, outer: number) {
  const a = point(angle - 15, outer);
  const b = point(angle + 15, outer);
  const c = point(angle + 15, inner);
  const d = point(angle - 15, inner);
  return [
    'M', a.x, a.y, 'A', outer, outer, 0, 0, 1, b.x, b.y,
    'L', c.x, c.y, 'A', inner, inner, 0, 0, 0, d.x, d.y, 'Z',
  ].join(' ');
}

export const CircleOfFifthsView: React.FC<CircleOfFifthsViewProps> = ({
  activeKeyRoot,
  activeMode,
  onPreviewChord,
  onPluckNote,
  onPracticeExample,
}) => {
  const [key, setKey] = useState({ root: activeKeyRoot, mode: activeMode });
  const [playingStep, setPlayingStep] = useState<number | null>(null);
  const [inspectedIndex, setInspectedIndex] = useState(0);
  const [pluckTick, setPluckTick] = useState(0);
  const [showSevenths, setShowSevenths] = useState(false);
  const [comparisonName, setComparisonName] = useState<'subdominant' | 'relative' | 'dominant'>('dominant');
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  const stopExample = useCallback(() => {
    clearTimer();
    setPlayingStep(null);
  }, [clearTimer]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) stopExample();
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', pauseWhenHidden);
      clearTimer();
    };
  }, [clearTimer, stopExample]);

  const activePosition = getCirclePositionForKey(key.root, key.mode);
  const neighbors = getHarmonicNeighbors(key.root, key.mode);
  const chords = getDiatonicChords(key.root, key.mode);
  const example = EXAMPLE_DEGREES.map((degree) => chords[degree - 1]);
  const detailedChords = showSevenths ? getDiatonicTetrads(key.root, key.mode) : chords;
  const inspected = detailedChords[inspectedIndex];
  const inspectedTriad = chords[inspectedIndex];
  const voicing = getGuitarChord(inspectedTriad.symbol);
  const comparisonKey = neighbors[comparisonName];
  const comparison = comparisonKey.comparison;

  const selectKey = (root: string, mode: Mode) => {
    stopExample();
    setKey({ root, mode });
    setInspectedIndex(0);
    onPreviewChord(getDiatonicChords(root, mode)[0].symbol);
  };

  const toggleExample = () => {
    if (playingStep !== null) {
      stopExample();
      return;
    }

    let step = 0;
    setPlayingStep(step);
    onPreviewChord(example[step].symbol);
    timer.current = window.setInterval(() => {
      step += 1;
      if (step >= example.length) {
        stopExample();
        return;
      }
      setPlayingStep(step);
      onPreviewChord(example[step].symbol);
    }, CHORD_MS);
  };

  return (
    <section className="studio-tool-view fifths-view" aria-labelledby="fifths-title">
      <header className="fifths-heading">
        <h1 id="fifths-title">Círculo de quintas</h1>
        <p>Encuentra qué acordes van juntos. Elige una tonalidad en la rueda y escucha una vuelta corta para practicarla en guitarra.</p>
      </header>

      <div className="fifths-layout">
        <section className="surface-card fifths-wheel" aria-labelledby="fifths-wheel-title">
          <h2 id="fifths-wheel-title">Elige una tonalidad</h2>
          <p>Mayores por fuera, menores por dentro.</p>
          <svg viewBox="0 0 420 420" className="fifths-dial" aria-label="Rueda de 24 tonalidades">
            {CIRCLE_POSITIONS.map((position) => RINGS.map(({ mode, inner, outer }) => {
              const major = mode === 'major';
              const root = major ? position.majorRoot : position.minorRoot;
              const sameSlice = position.index === activePosition.index;
              const selected = sameSlice && mode === key.mode;
              const neighbor = mode === key.mode && (
                position.index === neighbors.subdominant.positionIndex ||
                position.index === neighbors.dominant.positionIndex
              );
              const angle = position.index * 30;
              const label = point(angle, (inner + outer) / 2);
              const state = selected ? 'selected' : sameSlice ? 'relative' : neighbor ? 'neighbor' : mode;

              return (
                <g key={root + mode} className="fifths-slice" data-state={state}>
                  <path
                    d={wedgePath(angle, inner, outer)}
                    role="button"
                    tabIndex={0}
                    aria-label={keyName(root, mode)}
                    aria-pressed={selected}
                    onClick={() => selectKey(root, mode)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      selectKey(root, mode);
                    }}
                  />
                  <text x={label.x} y={label.y} dy=".34em" textAnchor="middle" aria-hidden="true">
                    {root}{major ? '' : 'm'}
                  </text>
                </g>
              );
            }))}
            <circle cx={CENTER} cy={CENTER} r="69" className="fifths-hub" />
            <text x={CENTER} y="180" textAnchor="middle" className="fifths-hub-hint">ESTÁS EN</text>
            <text x={CENTER} y="219" textAnchor="middle" className="fifths-hub-key">
              {key.root}{key.mode === 'minor' ? 'm' : ''}
            </text>
            <text x={CENTER} y="245" textAnchor="middle" className="fifths-hub-name">
              {keyName(key.root, key.mode)}
            </text>
          </svg>
          <div className="fifths-legend">
            <div><i className="fifths-swatch fifths-swatch-selected" /><span>Tonalidad elegida</span></div>
            <div><i className="fifths-swatch fifths-swatch-neighbor" /><span>Vecinas · una nota cambia</span></div>
            <div><i className="fifths-swatch fifths-swatch-relative" /><span>Relativa · mismas notas</span></div>
          </div>
        </section>

        <section className="fifths-example" aria-labelledby="fifths-example-title">
          <div className="fifths-example-head" aria-live="polite">
            <p>Una vuelta en</p>
            <h2 id="fifths-example-title">{keyName(key.root, key.mode)}</h2>
          </div>
          <p>Escucha cómo sale de <strong>{example[0].symbol}</strong>, pasa por <strong>{example[1].symbol}</strong> y <strong>{example[2].symbol}</strong>, y vuelve a <strong>{example[3].symbol}</strong>.</p>
          <div className="fifths-example-chords" role="group" aria-label="Acordes del ejemplo">
            {example.map((chord, index) => (
              <button
                type="button"
                key={EXAMPLE_LABELS[index]}
                data-playing={playingStep === index}
                aria-label={'Escuchar ' + chord.symbol + ', ' + EXAMPLE_LABELS[index]}
                onClick={() => {
                  stopExample();
                  onPreviewChord(chord.symbol);
                }}
              >
                <strong>{chord.symbol}</strong>
                <span>{EXAMPLE_LABELS[index]}</span>
              </button>
            ))}
          </div>
          <div className="fifths-actions">
            <button type="button" className="fifths-play" aria-pressed={playingStep !== null} onClick={toggleExample}>
              {playingStep === null ? <Play size={16} fill="currentColor" aria-hidden="true" /> : <Square size={15} fill="currentColor" aria-hidden="true" />}
              {playingStep === null ? 'Escuchar la vuelta' : 'Detener vuelta'}
            </button>
            <button type="button" className="fifths-practice" onClick={() => {
              stopExample();
              onPracticeExample(key.root, key.mode, EXAMPLE_DEGREES);
            }}>
              Practicar esta vuelta <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
          <div className="fifths-family">
            <h3>Los acordes de {keyName(key.root, key.mode)}</h3>
            <p>Pulsa cualquiera para oírlo.</p>
            <div className="fifths-family-chords">
              {chords.map((chord) => (
                <button type="button" key={chord.degree} aria-label={'Escuchar ' + chord.symbol} onClick={() => {
                  stopExample();
                  onPreviewChord(chord.symbol);
                }}>{chord.symbol}</button>
              ))}
            </div>
          </div>
        </section>
      </div>

      <details className="surface-card fifths-details">
        <summary>Ver dedos y notas de cada acorde <ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="fifths-details-body">
          <p>Notas de {keyName(key.root, key.mode)} · <strong>{buildScaleNotes(key.root, key.mode).join(' · ')}</strong></p>
          <label className="fifths-sevenths">
            <input type="checkbox" checked={showSevenths} onChange={(event) => setShowSevenths(event.target.checked)} />
            Ver notas con séptima
          </label>
          <div className="fifths-detail-buttons" role="group" aria-label="Elegir digitación">
            {detailedChords.map((chord, index) => (
              <button key={chord.degree} type="button" className="btn-secondary px-3 py-2" aria-pressed={index === inspectedIndex} onClick={() => {
                stopExample();
                setInspectedIndex(index);
                setPluckTick((tick) => tick + 1);
                onPreviewChord(chords[index].symbol);
              }}>{chord.roman} · {chord.symbol}</button>
            ))}
          </div>
          <div className="fifths-inspected">
            <Fretboard
              frets={voicing.frets}
              fingers={voicing.fingers}
              rootStrings={voicing.rootStrings}
              startFret={voicing.startFret}
              barre={voicing.barre}
              pluckTick={pluckTick}
              onPluckString={(index) => {
                if (voicing.frets[index] < 0) return;
                const note = voicing.midiNotes[voicing.frets.slice(0, index).filter((fret) => fret >= 0).length];
                if (note) {
                  stopExample();
                  onPluckNote(note);
                }
              }}
            />
            <div>
              <h3>{inspected.symbol}</h3>
              <p>{inspected.notes.join(' · ')} · {inspected.functionLabel}</p>
              {showSevenths && <p>El diagrama y el audio muestran {inspectedTriad.symbol}, el acorde base de tres notas.</p>}
              <p>○ Cuerda al aire · × Cuerda que no se toca · 1–4 Dedos</p>
            </div>
          </div>
        </div>
      </details>

      <details className="surface-card fifths-details">
        <summary>Entender las tonalidades vecinas <ChevronDown size={18} aria-hidden="true" /></summary>
        <div className="fifths-details-body">
          <p>Cada paso en sentido horario sube una quinta. De Do a Sol cuentas Do, Re, Mi, Fa, Sol.</p>
          <p>Entre dos tonalidades vecinas cambia una nota de la escala. La relativa usa las mismas notas con otro acorde como punto de partida.</p>
          <div className="fifths-detail-buttons" role="group" aria-label="Comparar tonalidades">
            {(['subdominant', 'relative', 'dominant'] as const).map((direction) => {
              const neighbor = neighbors[direction];
              return (
                <button key={direction} type="button" className="btn-secondary px-3 py-2" aria-pressed={direction === comparisonName} onClick={() => setComparisonName(direction)}>
                  {keyName(neighbor.root, neighbor.mode)}
                </button>
              );
            })}
          </div>
          <p>{comparison.summary}</p>
          {comparison.changedNotes.length > 0 && (
            <p>Nota que cambia · <strong>{comparison.changedNotes.map(({ removed, added }) => removed + ' → ' + added).join(', ')}</strong></p>
          )}
          <h3>Acordes en común</h3>
          <div className="fifths-detail-buttons">
            {comparison.sharedChords.map((shared) => (
              <button key={shared.fromSymbol} type="button" className="btn-secondary px-3 py-2" onClick={() => {
                stopExample();
                onPreviewChord(shared.fromSymbol);
              }}><Volume2 size={15} aria-hidden="true" />{shared.fromSymbol}</button>
            ))}
          </div>
          <button type="button" className="btn-secondary px-3 py-2" onClick={() => selectKey(comparisonKey.root, comparisonKey.mode)}>
            Ir a {keyName(comparisonKey.root, comparisonKey.mode)} <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
      </details>
    </section>
  );
};
