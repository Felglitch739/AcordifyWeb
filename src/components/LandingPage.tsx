import React, { useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Play, SlidersHorizontal, Square, User, Volume2 } from 'lucide-react';
import { getGuitarChord, type GuitarChordVoicing } from '../data/chords';
import type { AuthUserSummary } from '../lib/neonAuth';
import {
  CIRCLE_POSITIONS,
  buildScaleBoxes,
  getDiatonicChords,
  getHarmonicNeighbors,
  type Mode,
} from '../theory';
import { AcordifyLogo } from './AcordifyLogo';
import { Fretboard } from './Fretboard';

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
    a: 'Sí. Cada vista responde desde 390 px de ancho en adelante sin desplazamiento horizontal.',
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
  const lenisRef = useRef<Lenis | null>(null);
  const activePresetRef = useRef<HeroDemoPreset>(HERO_PRESETS[0]);

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
    activePresetRef.current = activePreset;
  }, [activePreset]);

  // Lenis calibrated smooth scrolling on desktop/mobile (respects prefers-reduced-motion)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = window.requestAnimationFrame(raf);
    };
    rafId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Track active navigation section while scrolling (Smooth guide indicator)
  useEffect(() => {
    const sections = NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveNav(visible[0].target.id as NavId);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: [0.15, 0.45] },
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
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
      onPreviewChord(activePresetRef.current.chords[idx]);
    }, 1350);
  };

  const handleSelectPreset = (preset: HeroDemoPreset) => {
    setSelectedPresetId(preset.id);
    setActiveChordIdx(0);
    setPluckTick((t) => t + 1);
    onPreviewChord(preset.chords[0]);
  };

  const handleSelectHeroChord = (idx: number, symbol: string) => {
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

  const scrollToSection = (id: NavId) => {
    setActiveNav(id);
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset: -72 });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    setActiveNav(null);
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const domComparison = heroNeighbors.dominant.comparison;
  const firstDiff = domComparison.changedNotes[0];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* Top Sticky Bar — Clean Hairline + Smooth Guide Active Underline */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/92 backdrop-blur-md">
        <div className="mx-auto max-w-[1160px] h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <AcordifyLogo size={26} />
            <span className="text-base font-medium tracking-[-0.02em] text-[var(--color-ink)]">
              Acordify
            </span>
          </button>

          {/* Desktop Section Anchors (Smooth Guide Underline) */}
          <nav
            aria-label="Secciones"
            className="hidden md:flex items-center gap-6 h-full"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
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
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthConfigured && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="btn-secondary bg-[var(--color-surface)] px-3.5 py-2 text-xs whitespace-nowrap"
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
              className="btn-primary px-4 py-2 text-xs whitespace-nowrap"
            >
              Empezar a practicar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — Statement + Real Interactive Guitar Workbench */}
        <section className="mx-auto max-w-[1160px] px-4 sm:px-8 pt-10 pb-16 sm:pt-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Editorial Statement (single hero entrance) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 space-y-6"
            >
              <h1 className="text-[44px] sm:text-[64px] lg:text-[76px] font-medium tracking-[-0.035em] leading-[1.02] text-[var(--color-ink)]">
                Tocas guitarra.
                <span className="block font-editorial text-[var(--color-ink-secondary)] mt-1">
                  La teoría no te tiene que frenar.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[var(--color-ink-secondary)] max-w-lg leading-relaxed">
                Arma vueltas de 4 acordes con digitación real, conecta tonalidades en el círculo de quintas y practica escalas pentatónicas paso a paso en el navegador, sin cuenta ni muros de pago.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    handleEnter('progressions', {
                      keyRoot: activePreset.keyRoot,
                      mode: activePreset.mode,
                    })
                  }
                  className="btn-primary px-6 py-3 text-sm"
                >
                  Empezar a practicar
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleEnter('circle', {
                      keyRoot: activePreset.keyRoot,
                      mode: activePreset.mode,
                    })
                  }
                  className="btn-secondary bg-[var(--color-surface)] px-5 py-3 text-sm"
                >
                  Ver el círculo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopLoop();
                    onOpenTuner();
                  }}
                  className="btn-secondary bg-[var(--color-surface)] px-4 py-3 text-sm"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Afinador</span>
                </button>
              </div>
            </motion.div>

            {/* Right Workbench — Real Sounding Chords + Live Interactive Fretboard */}
            <div className="lg:col-span-6">
              <div className="surface-card p-5 sm:p-6 space-y-5">
                {/* Workbench Top Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[var(--color-border)]">
                  <div
                    className="grid grid-cols-2 sm:inline-flex rounded-full bg-[var(--color-surface-subtle)] p-1 gap-0.5"
                    role="group"
                    aria-label="Tonalidad de prueba"
                  >
                    {HERO_PRESETS.map((preset) => {
                      const active = preset.id === activePreset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`relative rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors duration-150 whitespace-nowrap ${
                            active
                              ? 'text-[var(--color-ink)]'
                              : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                          }`}
                        >
                          {active && (
                            <motion.span
                              layoutId="hero-preset-pill"
                              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                              className="absolute inset-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)]"
                              aria-hidden="true"
                            />
                          )}
                          <span className="relative z-10">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={toggleLoop}
                    className={`rounded-full px-4 py-2 text-xs font-medium inline-flex items-center gap-2 transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                      isLoopPlaying
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-ink)] text-white hover:opacity-90'
                    }`}
                  >
                    {isLoopPlaying ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Detener</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>Escuchar vuelta</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Middle: 4 Chord Degrees + Real Live Fretboard SVG */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                  <div className="sm:col-span-6 grid grid-cols-2 gap-2.5">
                    {activePreset.chords.map((chord, idx) => {
                      const isLit = idx === activeChordIdx;
                      const voicing = getGuitarChord(chord);
                      return (
                        <button
                          key={`${activePreset.id}-${chord}-${idx}`}
                          type="button"
                          onClick={() => handleSelectHeroChord(idx, chord)}
                          className={`rounded-[12px] border p-3.5 text-left cursor-pointer transition-colors duration-150 ${
                            isLit
                              ? 'border-[var(--color-accent)] bg-[var(--color-accent-tint)]'
                              : 'border-[var(--color-border)] bg-[var(--color-surface-board)] hover:border-[var(--color-ink-muted)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[11px] font-medium text-[var(--color-ink-muted)]">
                              {activePreset.numerals[idx]}
                            </span>
                            <Volume2
                              className={`w-3.5 h-3.5 ${
                                isLit ? 'text-[var(--color-accent)]' : 'text-[var(--color-ink-muted)]'
                              }`}
                            />
                          </div>
                          <span className="mt-1.5 block text-2xl font-medium text-[var(--color-ink)]">
                            {chord}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] uppercase text-[var(--color-ink-secondary)]">
                            {voicing.difficulty === 'open' ? 'Abierto' : `Traste ${voicing.startFret}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="sm:col-span-6 flex flex-col items-center justify-center rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-4">
                    <div className="w-full flex items-center justify-between mb-1 px-1">
                      <span className="font-mono text-xs font-medium text-[var(--color-ink)]">
                        {activeChordSymbol}
                      </span>
                      <span className="font-mono text-[11px] text-[var(--color-ink-muted)]">
                        {activeVoicing.midiNotes.slice(0, 3).join(' · ')}
                      </span>
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
                        if (note) onPluckNote(note);
                      }}
                    />
                  </div>
                </div>

                {/* Computed Harmonic Connection Bar */}
                <div className="pt-3.5 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[var(--color-ink-secondary)]">
                    Vecina en quintas:{' '}
                    <strong className="font-medium text-[var(--color-ink)]">
                      {heroNeighbors.dominant.root}{' '}
                      {heroNeighbors.dominant.mode === 'minor' ? 'Menor' : 'Mayor'}
                    </strong>
                    {' · '}
                    {domComparison.sharedChords.length} acordes en común
                    {firstDiff ? (
                      <span className="font-mono text-[var(--color-accent)] ml-1.5">
                        ({firstDiff.removed} → {firstDiff.added})
                      </span>
                    ) : null}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleEnter('circle', {
                        keyRoot: activePreset.keyRoot,
                        mode: activePreset.mode,
                      })
                    }
                    className="font-mono text-[11px] font-medium text-[var(--color-ink)] underline underline-offset-4 hover:text-[var(--color-accent)] cursor-pointer transition-colors duration-150"
                  >
                    Abrir en el Círculo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tools — Three Interactive Previews Built From the Same Theory Engine */}
        <section
          id="herramientas"
          className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-20 sm:pb-24 space-y-8"
        >
          <div className="border-t border-[var(--color-border)] pt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.025em] text-[var(--color-ink)]">
              Tres herramientas en la misma mesa
            </h2>
            <p className="text-sm text-[var(--color-ink-secondary)] max-w-md">
              Comparten tonalidad, afinador y sonido en tu navegador.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1. Progresiones Specimen */}
            <div className="surface-card p-6 flex flex-col justify-between gap-6">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between gap-2 border-b border-[var(--color-border)] pb-3">
                  <h3 className="text-xl font-medium text-[var(--color-ink)]">Progresiones</h3>
                  <span className="font-mono text-xs text-[var(--color-ink-muted)]">
                    4 compases · BPM
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {(['G', 'Em', 'C', 'D'] as const).map((sym, idx) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => onPreviewChord(sym)}
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
            <div className="surface-card p-6 flex flex-col justify-between gap-6">
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
                  <svg viewBox="0 0 100 100" className="w-20 h-20 shrink-0 select-none">
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
                          aria-label={`Previsualizar ${pos.majorRoot} Mayor en el círculo`}
                          onClick={() => {
                            setPreviewCircleIdx(pos.index);
                            onPreviewChord(pos.majorRoot);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setPreviewCircleIdx(pos.index);
                              onPreviewChord(pos.majorRoot);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={x}
                            cy={y}
                            r={isActive ? 7.5 : 5.5}
                            fill={isActive ? '#111111' : isNeighbor ? '#E85D3D' : '#F4F4F5'}
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
                  Muestra los 7 acordes de cada tono, las vecinas con las que comparte acordes puente y guía de 5 pasos en lenguaje simple.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleEnter('circle')}
                className="btn-secondary w-full py-2.5 text-xs bg-[var(--color-surface)]"
              >
                Explorar el Círculo
              </button>
            </div>

            {/* 3. Real Box 1 Pentatonic Specimen */}
            <div className="surface-card p-6 flex flex-col justify-between gap-6">
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
                            setActiveScaleNoteId(n.id);
                            onPluckNote(n.scientificNote);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
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
                  Las 5 cajas de la pentatónica mayor, menor y blues menor con dedo por traste, orden de subida y bajada y conexión entre cajas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleEnter('scales')}
                className="btn-secondary w-full py-2.5 text-xs bg-[var(--color-surface)]"
              >
                Practicar Escalas
              </button>
            </div>
          </div>

          {/* Chromatic Tuner Row (direct access) */}
          <div className="border-t border-b border-[var(--color-border)] py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 border-t border-[var(--color-border)] pt-14 items-start">
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
          <div className="surface-card p-6 sm:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.025em] text-[var(--color-ink)]">
                Abre la mesa y arma una vuelta de 4 acordes.
              </h2>
              <p className="text-sm text-[var(--color-ink-secondary)]">
                Entra directo al generador sin crear cuenta.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isAuthConfigured && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="btn-secondary bg-[var(--color-surface)] px-4 py-2.5 text-xs"
                >
                  {authUser ? 'Mi cuenta' : 'Sincronizar libreta'}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleEnter('progressions')}
                className="btn-primary px-6 py-2.5 text-sm"
              >
                Empezar a practicar
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] py-6 px-4 sm:px-8">
        <div className="mx-auto max-w-[1160px] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-ink-muted)]">
          <span>
            Acordify · Progresiones, círculo de quintas, escalas y afinador directo en tu navegador.
          </span>
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
