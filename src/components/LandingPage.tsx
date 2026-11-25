import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowDown, ArrowUpRight, ChevronDown, Play, SlidersHorizontal, Square, User, Volume2 } from 'lucide-react';
import { getGuitarChord, type GuitarChordVoicing } from '../data/chords';
import type { AuthUserSummary } from '../lib/neonAuth';
import {
  CIRCLE_POSITIONS,
  buildScaleBoxes,
  getDiatonicChords,
  getHarmonicNeighbors,
  type Mode,
} from '../theory';
import { AcordifyLogo, AcordifyWordmark } from './AcordifyLogo';
import { LandingStrum } from './LandingStrum';
import { Fretboard } from './Fretboard';
import './LandingPage.css';

interface LandingPageProps {
  onEnterStudio: (
    initialSection?: 'progressions' | 'circle' | 'scales',
    preset?: { keyRoot: string; mode: Mode },
  ) => void;
  onOpenAuth: () => void;
  onOpenTuner: () => void;
  authUser: AuthUserSummary | null;
  isAuthConfigured: boolean;
  onPreviewChord: (symbol: string) => void;
  onPluckNote: (scientificNote: string) => void;
}

interface HeroDemoPreset {
  id: string;
  label: string;
  keyRoot: string;
  mode: Mode;
  chords: readonly [string, string, string, string];
  numerals: readonly [string, string, string, string];
}

const HERO_PRESETS: readonly HeroDemoPreset[] = [
  {
    id: 'g-major',
    label: 'G · Sol Mayor',
    keyRoot: 'G',
    mode: 'major',
    chords: ['G', 'Em', 'C', 'D'],
    numerals: ['I', 'vi', 'IV', 'V'],
  },
  {
    id: 'c-major',
    label: 'C · Do Mayor',
    keyRoot: 'C',
    mode: 'major',
    chords: ['C', 'Am', 'F', 'G'],
    numerals: ['I', 'vi', 'IV', 'V'],
  },
  {
    id: 'a-minor',
    label: 'Am · La Menor',
    keyRoot: 'A',
    mode: 'minor',
    chords: ['Am', 'F', 'C', 'G'],
    numerals: ['i', 'VI', 'III', 'VII'],
  },
  {
    id: 'e-minor',
    label: 'Em · Mi Menor',
    keyRoot: 'E',
    mode: 'minor',
    chords: ['Em', 'C', 'G', 'D'],
    numerals: ['i', 'VI', 'III', 'VII'],
  },
] as const;

const NAV_ITEMS = [
  { id: 'herramientas', label: 'Herramientas' },
  { id: 'origen', label: 'Por qué existe' },
  { id: 'faq', label: 'Preguntas' },
] as const;

type NavId = (typeof NAV_ITEMS)[number]['id'];

const FAQ_ITEMS = [
  {
    q: '¿Necesito crear una cuenta para practicar?',
    a: 'No. Progresiones, Círculo de Quintas, Escalas, Afinador y tu libreta local funcionan completos en el navegador sin registrarte.',
  },
  {
    q: '¿Qué cambia si inicio sesión con Google o correo?',
    a: 'Tu libreta de progresiones se sincroniza en la nube para abrirla en otro dispositivo. Todas las herramientas siguen libres sin sesión.',
  },
  {
    q: '¿De dónde sale el sonido de los acordes y escalas?',
    a: 'Cada nota se sintetiza en vivo en tu navegador con un modelo físico de cuerda pulsada en nylon o acero, sin descargar archivos pesados.',
  },
  {
    q: '¿Funciona en teléfono además de computadora?',
    a: 'Sí. Puedes usar los acordes, las escalas y el afinador desde el navegador de tu teléfono.',
  },
] as const;

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

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterStudio,
  onOpenAuth,
  onOpenTuner,
  authUser,
  isAuthConfigured,
  onPreviewChord,
  onPluckNote,
}) => {
  const [activeNav, setActiveNav] = useState<NavId | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('g-major');
  const [activeChordIdx, setActiveChordIdx] = useState<number>(0);
  const [isLoopPlaying, setIsLoopPlaying] = useState(false);
  const [pluckTick, setPluckTick] = useState(0);
  const [previewCircleIdx, setPreviewCircleIdx] = useState<number>(1); // G major
  const [activeScaleNoteId, setActiveScaleNoteId] = useState<string | null>(null);
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  const loopTimerRef = useRef<number | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const photoY = useTransform(scrollYProgress, [0, 1], [0, 145]);
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 150, damping: 24 });
  const rotateY = useSpring(tiltY, { stiffness: 150, damping: 24 });

  const activePreset =
    HERO_PRESETS.find((p) => p.id === selectedPresetId) ?? HERO_PRESETS[0];
  const activeChordSymbol = activePreset.chords[activeChordIdx] ?? activePreset.chords[0];

  const activeVoicing = useMemo(
    () => getGuitarChord(activeChordSymbol),
    [activeChordSymbol],
  );

  const heroNeighbors = useMemo(
    () => getHarmonicNeighbors(activePreset.keyRoot, activePreset.mode),
    [activePreset.keyRoot, activePreset.mode],
  );

  const circlePreviewPos = CIRCLE_POSITIONS[previewCircleIdx] ?? CIRCLE_POSITIONS[1];
  const circlePreviewChords = useMemo(
    () => getDiatonicChords(circlePreviewPos.majorRoot, 'major'),
    [circlePreviewPos.majorRoot],
  );
  const circlePreviewNeighbors = useMemo(
    () => getHarmonicNeighbors(circlePreviewPos.majorRoot, 'major'),
    [circlePreviewPos.majorRoot],
  );

  const scalePreviewBox = useMemo(() => buildScaleBoxes('A', 'minor-pentatonic')[0], []);

  useEffect(() => {
    const sections = NAV_ITEMS.flatMap(({ id }) => {
      const section = document.getElementById(id);
      return section ? [section] : [];
    });
    const updateNavigation = () => {
      const current = sections.findLast((section) => section.getBoundingClientRect().top <= window.innerHeight * 0.42);
      setActiveNav((current?.id as NavId | undefined) ?? null);
    };
    updateNavigation();
    window.addEventListener('scroll', updateNavigation, { passive: true });
    window.addEventListener('resize', updateNavigation);
    return () => {
      window.removeEventListener('scroll', updateNavigation);
      window.removeEventListener('resize', updateNavigation);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (loopTimerRef.current !== null) {
        window.clearInterval(loopTimerRef.current);
        loopTimerRef.current = null;
      }
    };
  }, []);

  const stopLoop = () => {
    if (loopTimerRef.current !== null) {
      window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    setIsLoopPlaying(false);
  };

  const toggleLoop = () => {
    if (isLoopPlaying) {
      stopLoop();
      return;
    }
    let idx = 0;
    setActiveChordIdx(0);
    setPluckTick((t) => t + 1);
    setIsLoopPlaying(true);
    onPreviewChord(activePreset.chords[0]);

    loopTimerRef.current = window.setInterval(() => {
      idx = (idx + 1) % 4;
      setActiveChordIdx(idx);
      setPluckTick((t) => t + 1);
      onPreviewChord(activePreset.chords[idx]);
    }, 1350);
  };

  const handleSelectPreset = (preset: HeroDemoPreset) => {
    stopLoop();
    setSelectedPresetId(preset.id);
    setActiveChordIdx(0);
    setPluckTick((t) => t + 1);
    onPreviewChord(preset.chords[0]);
  };

  const handleSelectHeroChord = (idx: number, symbol: string) => {
    stopLoop();
    setActiveChordIdx(idx);
    setPluckTick((t) => t + 1);
    onPreviewChord(symbol);
  };

  const handleEnter = (
    section: 'progressions' | 'circle' | 'scales' = 'progressions',
    preset?: { keyRoot: string; mode: Mode },
  ) => {
    stopLoop();
    onEnterStudio(section, preset);
  };

  return (
    <div className="acordify-landing min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)]" id="portada">
      {/* Top Sticky Bar — Clean Hairline + Smooth Guide Active Underline */}
      <header className="landing-header sticky top-0 z-40 backdrop-blur-md">
        <div className="mx-auto max-w-[1160px] h-16 px-4 sm:px-8 flex items-center justify-between gap-2 sm:gap-4">
          <a
            href="#portada"
            className="acordify-brand inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <AcordifyLogo size={26} />
            <AcordifyWordmark />
          </a>

          {/* Desktop Section Anchors (Smooth Guide Underline) */}
          <nav
            aria-label="Secciones"
            className="hidden md:flex items-center gap-6 h-full"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeNav === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={active ? 'location' : undefined}
                  className={`relative h-full inline-flex items-center text-xs font-medium cursor-pointer transition-colors duration-150 ${
                    active
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  <span>{item.label}</span>
                  {active && (
                    <motion.span
                      layoutId="landing-smooth-guide"
                      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--color-ink)]"
                      aria-hidden="true"
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthConfigured && (
              <button
                type="button"
                onClick={() => {
                  stopLoop();
                  onOpenAuth();
                }}
                className="btn-secondary bg-[var(--color-surface)] px-2.5 sm:px-3.5 py-2 text-xs whitespace-nowrap"
              >
                {authUser ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[var(--color-ok)] shrink-0" />
                    <span className="max-w-[72px] truncate">
                      {(authUser.name || authUser.email).split(/[@\s]/)[0]}
                    </span>
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sincronizar libreta</span>
                    <span className="sm:hidden">Entrar</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                handleEnter('progressions', {
                  keyRoot: activePreset.keyRoot,
                  mode: activePreset.mode,
                })
              }
              className="landing-cta landing-cta-small"
            >
              Abrir estudio
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">

        <section ref={heroRef} className="landing-hero" aria-labelledby="landing-title">
          <motion.div className="landing-hero-art" style={{ y: reducedMotion ? 0 : photoY }} aria-hidden="true" />
          <div className="landing-hero-layout">
            <motion.div
              className="landing-intro"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <h1 id="landing-title">
                Dale forma
                <em>a tu sonido.</em>
              </h1>
              <p>Prueba qué acordes van juntos, encuentra las notas en el diapasón y escucha tus ideas antes de llevarlas a la guitarra.</p>
              <div className="landing-actions">
                <button type="button" className="landing-cta" onClick={() => handleEnter('progressions', activePreset)}>
                  Abrir el estudio <ArrowUpRight size={18} aria-hidden="true" />
                </button>
                <button type="button" className="landing-text-button" onClick={() => {
                  stopLoop();
                  onOpenTuner();
                }}>
                  <SlidersHorizontal size={16} aria-hidden="true" /> Afinador
                </button>
              </div>
            </motion.div>

            <motion.div
              className="landing-deck-scene"
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              onPointerMove={(event) => {
                if (reducedMotion || event.pointerType !== 'mouse') return;
                const rect = event.currentTarget.getBoundingClientRect();
                tiltX.set((0.5 - (event.clientY - rect.top) / rect.height) * 7);
                tiltY.set(((event.clientX - rect.left) / rect.width - 0.5) * 9);
              }}
              onPointerLeave={() => {
                tiltX.set(0);
                tiltY.set(0);
              }}
            >
              <motion.div className="landing-deck" style={{ rotateX: reducedMotion ? 0 : rotateX, rotateY: reducedMotion ? 0 : rotateY }}>
                <div className="landing-deck-header">
                  <div>
                    <h2>Prueba cuatro acordes</h2>
                    <p>Toca un acorde o escucha la vuelta.</p>
                  </div>
                  <div className="landing-meter" aria-hidden="true">
                    {[14, 23, 13, 32, 20, 29, 13, 21, 10].map((height, index) => (
                      <span
                        key={`${pluckTick}-${index}`}
                        className={pluckTick ? 'is-sounding' : undefined}
                        style={{ height, animationDelay: `${index * 16}ms` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="landing-deck-controls">
                  <label className="landing-preset">
                    <span className="sr-only">Tonalidad de prueba</span>
                    <select value={activePreset.id} onChange={(event) => {
                      const preset = HERO_PRESETS.find((item) => item.id === event.target.value);
                      if (preset) handleSelectPreset(preset);
                    }}>
                      {HERO_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                    </select>
                    <ChevronDown size={14} aria-hidden="true" />
                  </label>
                  <button type="button" onClick={toggleLoop} className="landing-loop" aria-pressed={isLoopPlaying}>
                    {isLoopPlaying ? <Square size={13} fill="currentColor" aria-hidden="true" /> : <Play size={13} fill="currentColor" aria-hidden="true" />}
                    {isLoopPlaying ? 'Detener vuelta' : 'Escuchar vuelta'}
                  </button>
                </div>

                <div className="landing-deck-body">
                  <div className="landing-pads" role="group" aria-label="Acordes de la vuelta">
                    {activePreset.chords.map((chord, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-pressed={idx === activeChordIdx}
                        aria-label={`Tocar ${chord}`}
                        onClick={() => handleSelectHeroChord(idx, chord)}
                      >
                        <span>{activePreset.numerals[idx]} <Volume2 size={13} aria-hidden="true" /></span>
                        <strong>{chord}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="landing-diagram">
                    <div className="landing-diagram-label">
                      <strong>{activeChordSymbol}</strong>
                      <span>Digitación</span>
                    </div>
                    <Fretboard
                      frets={activeVoicing.frets}
                      fingers={activeVoicing.fingers}
                      rootStrings={activeVoicing.rootStrings}
                      startFret={activeVoicing.startFret}
                      barre={activeVoicing.barre}
                      isActive={isLoopPlaying}
                      pluckTick={pluckTick}
                      onPluckString={(strIdx) => {
                        const note = getNoteNameForStringIndex(activeVoicing, strIdx);
                        if (note) {
                          setPluckTick((tick) => tick + 1);
                          onPluckNote(note);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="landing-deck-footer">
                  <span>Vecina en quintas · <strong>{heroNeighbors.dominant.root} {activePreset.mode === 'minor' ? 'menor' : 'mayor'}</strong></span>
                  <button type="button" onClick={() => handleEnter('circle', activePreset)}>Explorar <ArrowUpRight size={14} aria-hidden="true" /></button>
                </div>
              </motion.div>
            </motion.div>
          </div>
          <div className="landing-hero-footer">
            <a href="#rasguear">Rasguear cuerdas <ArrowDown size={16} aria-hidden="true" /></a>
            <span>Practica gratis, sin cuenta</span>
          </div>
        </section>

        {/* Tools — Three Interactive Previews Built From the Same Theory Engine */}
        <section
          id="herramientas"
          className="landing-tools mx-auto max-w-[1160px] px-4 sm:px-8 pb-20 sm:pb-24 space-y-8"
        >
          <div className="landing-section-heading">
            <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.025em] text-[var(--color-ink)]">
              De la primera nota <em>a la siguiente idea.</em>
            </h2>
            <p className="text-sm text-[var(--color-ink-secondary)] max-w-md">
              Arma una progresión, explora tonalidades cercanas o practica una escala en el diapasón.
            </p>
          </div>

          <section className="landing-strum" id="rasguear" aria-labelledby="strum-title">
            <div className="landing-strum-intro">
              <h3 id="strum-title">Rasguea el acorde.</h3>
              <p>Arrastra el dedo o el cursor entre las cuerdas. También puedes tocarlas una por una.</p>
              <label>
                Acorde
                <select value={activeChordIdx} onChange={(event) => {
                  const index = Number(event.target.value);
                  handleSelectHeroChord(index, activePreset.chords[index]);
                }}>
                  {activePreset.chords.map((chord, index) => <option key={chord} value={index}>{chord}</option>)}
                </select>
              </label>
            </div>
            <LandingStrum
              notes={activeVoicing.frets.map((_, index) => getNoteNameForStringIndex(activeVoicing, index))}
              onPlay={(note) => {
                stopLoop();
                onPluckNote(note);
              }}
            />
          </section>

          <div className="landing-tools-grid grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. Progresiones Specimen */}
            <div className="landing-tool-card surface-card p-5 sm:p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-xl font-medium text-[var(--color-ink)]">Progresiones</h3>
                  <span className="font-mono text-xs text-[var(--color-ink-muted)]">
                    Crea y edita
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(['G', 'Em', 'C', 'D'] as const).map((sym, idx) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => {
                        stopLoop();
                        onPreviewChord(sym);
                      }}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-board)] py-2.5 text-center hover:border-[var(--color-ink)] cursor-pointer transition-colors duration-150"
                    >
                      <span className="block font-mono text-[10px] text-[var(--color-ink-muted)]">
                        {(['I', 'vi', 'IV', 'V'] as const)[idx]}
                      </span>
                      <span className="block font-mono text-sm font-medium text-[var(--color-ink)] mt-0.5">
                        {sym}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  Elige tonalidad y ánimo, ajusta el pulso con metrónomo y sustituye cualquier acorde dentro de la escala con sugerencias prácticas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleEnter('progressions')}
                className="btn-secondary w-full py-2.5 text-xs bg-[var(--color-surface)]"
              >
                Abrir Progresiones
              </button>
            </div>

            {/* 2. Interactive Circle Specimen */}
            <div className="landing-tool-card surface-card p-5 sm:p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-xl font-medium text-[var(--color-ink)]">
                    Círculo de Quintas
                  </h3>
                  <span className="font-mono text-xs text-[var(--color-ink-muted)]">
                    {circlePreviewPos.majorRoot} · {circlePreviewPos.accidentals === 0 ? '0 alt.' : circlePreviewPos.accidentals > 0 ? `${circlePreviewPos.accidentals}♯` : `${Math.abs(circlePreviewPos.accidentals)}♭`}
                  </span>
                </div>

                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-3 flex items-center gap-4">
                  <svg viewBox="0 0 100 100" className="w-[118px] h-auto shrink-0 select-none">
                    <circle cx="50" cy="50" r="44" fill="#FFFFFF" stroke="#E4E4E7" strokeWidth="1" />
                    <circle cx="50" cy="50" r="24" fill="#FAFAFA" stroke="#E4E4E7" strokeWidth="1" />
                    {CIRCLE_POSITIONS.map((pos) => {
                      const angleRad = ((pos.index * 30 - 90) * Math.PI) / 180;
                      const x = 50 + 34 * Math.cos(angleRad);
                      const y = 50 + 34 * Math.sin(angleRad);
                      const isActive = pos.index === circlePreviewPos.index;
                      const isNeighbor =
                        pos.index === circlePreviewNeighbors.dominant.positionIndex ||
                        pos.index === circlePreviewNeighbors.subdominant.positionIndex;
                      return (
                        <g
                          key={pos.index}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isActive}
                          aria-label={`Previsualizar ${pos.majorRoot} Mayor en el círculo`}
                          onClick={() => {
                            stopLoop();
                            setPreviewCircleIdx(pos.index);
                            onPreviewChord(pos.majorRoot);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              stopLoop();
                              setPreviewCircleIdx(pos.index);
                              onPreviewChord(pos.majorRoot);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r={8.4}
                            fill={isActive ? '#231b16' : isNeighbor ? '#a64229' : '#efe9df'}
                          />
                          <text
                            x={x}
                            y={y + 2.2}
                            textAnchor="middle"
                            fill={isActive || isNeighbor ? '#FFFFFF' : '#52525B'}
                            className="font-mono text-[6px] font-semibold pointer-events-none"
                          >
                            {pos.majorRoot}
                          </text>
                        </g>
                      );
                    })}
                  </svg>

                  <div className="min-w-0 space-y-1">
                    <p className="font-mono text-xs font-medium text-[var(--color-ink)]">
                      {circlePreviewPos.majorRoot} Mayor / {circlePreviewPos.minorRoot}m
                    </p>
                    <p className="text-xs text-[var(--color-ink-secondary)]">
                      Vecinas: {circlePreviewNeighbors.subdominant.root} y{' '}
                      {circlePreviewNeighbors.dominant.root}
                    </p>
                    <p className="font-mono text-[11px] text-[var(--color-ink-muted)] truncate">
                      {circlePreviewChords.slice(0, 4).map((c) => c.symbol).join(' · ')}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  Toca una tonalidad del círculo para oírla. En el estudio puedes ver qué acordes comparte con sus vecinas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleEnter('circle', { keyRoot: circlePreviewPos.majorRoot, mode: 'major' })}
                className="btn-secondary w-full py-2.5 text-xs bg-[var(--color-surface)]"
              >
                Explorar el Círculo
              </button>
            </div>

            {/* 3. Real Box 1 Pentatonic Specimen */}
            <div className="landing-tool-card surface-card p-5 sm:p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-xl font-medium text-[var(--color-ink)]">Escalas</h3>
                  <span className="font-mono text-xs text-[var(--color-ink-muted)]">
                    Am · Caja 1 · Tr. {scalePreviewBox.startFret}–{scalePreviewBox.endFret}
                  </span>
                </div>

                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-3">
                  <svg viewBox="0 0 220 98" className="w-full h-auto select-none">
                    {[0, 1, 2, 3, 4].map((col) => (
                      <line
                        key={`sp-f-${col}`}
                        x1={22 + col * 44}
                        y1={12}
                        x2={22 + col * 44}
                        y2={72}
                        stroke="#D4D4D8"
                        strokeWidth="1.1"
                      />
                    ))}
                    {[1, 2, 3, 4, 5, 6].map((str) => (
                      <line
                        key={`sp-s-${str}`}
                        x1={22}
                        y1={12 + (str - 1) * 12}
                        x2={198}
                        y2={12 + (str - 1) * 12}
                        stroke="#71717A"
                        strokeWidth={0.8 + (str - 1) * 0.18}
                      />
                    ))}
                    {[5, 6, 7, 8].map((fretNum, idx) => (
                      <text
                        key={`sp-lbl-${fretNum}`}
                        x={44 + idx * 44}
                        y={90}
                        textAnchor="middle"
                        fill="#71717A"
                        className="font-mono text-[8.5px]"
                      >
                        Tr. {fretNum}
                      </text>
                    ))}
                    {scalePreviewBox.notes.map((n) => {
                      const cx = 22 + (n.fret - 5 + 0.5) * 44;
                      const cy = 12 + (n.stringNumber - 1) * 12;
                      const isPicked = activeScaleNoteId === n.id;
                      return (
                        <g
                          key={n.id}
                          role="button"
                          tabIndex={0}
                          aria-label={`Nota ${n.scientificNote}, dedo ${n.finger}`}
                          onClick={() => {
                            stopLoop();
                            setActiveScaleNoteId(n.id);
                            onPluckNote(n.scientificNote);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              stopLoop();
                              setActiveScaleNoteId(n.id);
                              onPluckNote(n.scientificNote);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isPicked ? 6.5 : 5.5}
                            fill={n.isRoot || isPicked ? '#E85D3D' : '#111111'}
                          />
                          <text
                            x={cx}
                            y={cy + 2.3}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            className="font-mono text-[6.5px] font-semibold pointer-events-none"
                          >
                            {n.finger}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  Toca las notas de la pentatónica de La menor. En el estudio encuentras las cinco posiciones y cómo conectarlas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleEnter('scales', { keyRoot: 'A', mode: 'minor' })}
                className="btn-secondary w-full py-2.5 text-xs bg-[var(--color-surface)]"
              >
                Practicar Escalas
              </button>
            </div>
          </div>

          {/* Chromatic Tuner Row (direct access) */}
          <div className="landing-tuner flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-medium text-[var(--color-ink)]">
                Afinador cromático incluido
              </h3>
              <p className="text-sm text-[var(--color-ink-secondary)]">
                Estándar, DADGAD, Drop D, semitonos y tonos de referencia locales en el navegador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                stopLoop();
                onOpenTuner();
              }}
              className="btn-secondary shrink-0 self-start sm:self-center bg-[var(--color-surface)] px-4 py-2 text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Abrir afinador</span>
            </button>
          </div>
        </section>

        {/* Origin & Real Constraints (Hipulsar Restraint — Pure Type + Hairlines) */}
        <section
          id="origen"
          className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-20 sm:pb-24"
        >
          <div className="landing-origin grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-7 space-y-4">
              <blockquote className="font-editorial text-3xl sm:text-4xl leading-[1.18] text-[var(--color-ink)]">
                &ldquo;Tocaba acordes sueltos sin saber qué combinaba ni en qué traste empezaba una pentatónica.&rdquo;
              </blockquote>
              <p className="text-sm sm:text-base text-[var(--color-ink-secondary)] leading-relaxed max-w-xl">
                Acordify es un proyecto de estudio construido por Félix Martínez, estudiante en UTRGV, para juntar progresiones, círculo de quintas, escalas y afinador en una sola página abierta.
              </p>
            </div>

            <div className="lg:col-span-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              <div className="py-4 space-y-1">
                <h3 className="text-sm font-medium text-[var(--color-ink)]">
                  Guardado en tu navegador
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)]">
                  Tu libreta vive localmente y puedes copiar enlaces con el tono, modo y tempo exactos.
                </p>
              </div>
              <div className="py-4 space-y-1">
                <h3 className="text-sm font-medium text-[var(--color-ink)]">
                  Nylon y acero sintetizados
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)]">
                  36 posiciones de guitarra con números de dedo, tónica y cuerdas pulsables cuerda por cuerda.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Hairline FAQ */}
        <section id="faq" className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-[var(--color-border)] pt-14 items-start">
            <h2 className="lg:col-span-4 text-3xl font-medium tracking-[-0.025em] text-[var(--color-ink)]">
              Preguntas frecuentes
            </h2>

            <div className="lg:col-span-8 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div key={item.q}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-medium text-[var(--color-ink)]">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-[var(--color-ink-muted)] transition-transform duration-150 ${
                          isOpen ? 'rotate-180 text-[var(--color-ink)]' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="pb-4 text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Quiet Closing Bar */}
        <section className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-16">
          <div className="landing-close p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.025em] text-[var(--color-ink)]">
                ¿Qué vas a tocar hoy?
              </h2>
              <p className="text-sm text-[var(--color-ink-secondary)]">
                Abre el estudio y arma tu primera vuelta de acordes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isAuthConfigured && (
                <button
                  type="button"
                  onClick={() => {
                  stopLoop();
                  onOpenAuth();
                }}
                  className="btn-secondary bg-[var(--color-surface)] px-4 py-2.5 text-xs"
                >
                  {authUser ? 'Mi cuenta' : 'Sincronizar libreta'}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleEnter('progressions')}
                className="landing-cta"
              >
                Abrir el estudio <ArrowUpRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] py-6 px-4 sm:px-8">
        <div className="mx-auto max-w-[1160px] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-ink-muted)]">
          <a href="#portada" className="acordify-brand inline-flex items-center gap-2">
            <AcordifyLogo size={24} />
            <AcordifyWordmark />
          </a>
          <div className="flex flex-wrap items-center gap-5 font-mono">
            <button
              type="button"
              onClick={() => handleEnter('progressions')}
              className="hover:text-[var(--color-ink)] cursor-pointer transition-colors duration-150"
            >
              Progresiones
            </button>
            <button
              type="button"
              onClick={() => handleEnter('circle')}
              className="hover:text-[var(--color-ink)] cursor-pointer transition-colors duration-150"
            >
              Círculo
            </button>
            <button
              type="button"
              onClick={() => handleEnter('scales')}
              className="hover:text-[var(--color-ink)] cursor-pointer transition-colors duration-150"
            >
              Escalas
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
