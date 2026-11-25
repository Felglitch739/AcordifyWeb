import React, { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BookMarked,
  ChevronDown,
  Compass,
  Layers,
  Music2,
  Play,
  SlidersHorizontal,
  Square,
  User,
  Volume2,
} from 'lucide-react';
import type { AuthUserSummary } from '../lib/neonAuth';
import type { Mode } from '../theory';
import { AcordifyLogo } from './AcordifyLogo';

interface LandingPageProps {
  onEnterStudio: (
    initialSection?: 'progressions' | 'circle' | 'scales',
    preset?: { keyRoot: string; mode: Mode },
  ) => void;
  onOpenAuth: () => void;
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
  numerals: string;
  noteHint: string;
}

const HERO_PRESETS: readonly HeroDemoPreset[] = [
  {
    id: 'g-major',
    label: 'Sol Mayor',
    keyRoot: 'G',
    mode: 'major',
    chords: ['G', 'Em', 'C', 'D'],
    numerals: 'I · vi · IV · V',
    noteHint: 'Vuelta abierta ideal para rasgueo folk',
  },
  {
    id: 'c-major',
    label: 'Do Mayor',
    keyRoot: 'C',
    mode: 'major',
    chords: ['C', 'Am', 'F', 'G'],
    numerals: 'I · vi · IV · V',
    noteHint: 'Clásica y directa para cantar encima',
  },
  {
    id: 'a-minor',
    label: 'La Menor',
    keyRoot: 'A',
    mode: 'minor',
    chords: ['Am', 'F', 'C', 'G'],
    numerals: 'i · VI · III · VII',
    noteHint: 'Progresión menor cálida con caída suave',
  },
  {
    id: 'e-minor',
    label: 'Mi Menor',
    keyRoot: 'E',
    mode: 'minor',
    chords: ['Em', 'C', 'G', 'D'],
    numerals: 'i · VI · III · VII',
    noteHint: 'Cuerdas al aire con resonancia profunda',
  },
] as const;

const HERO_STRINGS: readonly { label: string; note: string; thickness: number }[] = [
  { label: '1ª e', note: 'E4', thickness: 1.1 },
  { label: '2ª B', note: 'B3', thickness: 1.3 },
  { label: '3ª G', note: 'G3', thickness: 1.5 },
  { label: '4ª D', note: 'D3', thickness: 1.85 },
  { label: '5ª A', note: 'A2', thickness: 2.2 },
  { label: '6ª E', note: 'E2', thickness: 2.6 },
] as const;

const WHEEL_LABELS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'] as const;

const NAV_ITEMS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'por-que', label: 'Por qué' },
  { id: 'herramientas', label: 'Herramientas' },
  { id: 'historia', label: 'Historia' },
  { id: 'faq', label: 'FAQ' },
] as const;

type NavId = (typeof NAV_ITEMS)[number]['id'];

const FAQ_ITEMS = [
  {
    q: '¿Tengo que crear una cuenta o pagar para practicar?',
    a: 'No. Progresiones, Círculo de Quintas, Escalas, Afinador y tu libreta local funcionan completos y gratis sin registrarte.',
  },
  {
    q: '¿Para qué sirve entonces iniciar sesión con Google o correo?',
    a: 'Es 100% opcional: solo guarda tus progresiones en la nube para abrirlas desde otro dispositivo sin perder tu libreta.',
  },
  {
    q: '¿Cómo suenan los acordes y las cuerdas directo en la web?',
    a: 'Usamos síntesis física de cuerda pulsada (Karplus-Strong) en tu propio navegador, así responde al instante sin descargar bancos pesados.',
  },
  {
    q: '¿Funciona en celular además de computadora?',
    a: 'Sí. Toda la interfaz está ajustada para pantallas de 390 px hacia arriba, con botones táctiles cómodos y cero desplazamiento lateral.',
  },
] as const;

const MARQUEE_PHRASES = [
  'SIN CUENTA OBLIGATORIA',
  'CÍRCULO DE QUINTAS CONECTADO',
  'PENTATÓNICAS CON DEDOS Y ORDEN',
  'SÍNTESIS ACÚSTICA KARPLUS-STRONG',
  'AFINADOR CROMÁTICO DADGAD Y DROP D',
] as const;

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterStudio,
  onOpenAuth,
  authUser,
  isAuthConfigured,
  onPreviewChord,
  onPluckNote,
}) => {
  const uid = useId().replace(/:/g, '');
  const grainId = `landing-grain-${uid}`;

  const [activeNav, setActiveNav] = useState<NavId>('inicio');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('g-major');
  const [isLoopPlaying, setIsLoopPlaying] = useState(false);
  const [activeChordIdx, setActiveChordIdx] = useState(0);
  const [pluckedStringTick, setPluckedStringTick] = useState<Record<number, number>>({});
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const pointerDownRef = useRef(false);
  const loopTimerRef = useRef<number | null>(null);
  const activePresetRef = useRef<HeroDemoPreset>(HERO_PRESETS[0]);

  const activePreset =
    HERO_PRESETS.find((p) => p.id === selectedPresetId) ?? HERO_PRESETS[0];

  useEffect(() => {
    activePresetRef.current = activePreset;
  }, [activePreset]);

  // Smooth guide active-section tracking via IntersectionObserver
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

  // Stop hero audio loop cleanly on unmount
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
    setIsLoopPlaying(true);
    onPreviewChord(activePreset.chords[0]);

    loopTimerRef.current = window.setInterval(() => {
      idx = (idx + 1) % 4;
      setActiveChordIdx(idx);
      onPreviewChord(activePresetRef.current.chords[idx]);
    }, 1350);
  };

  const handleSelectPreset = (preset: HeroDemoPreset) => {
    setSelectedPresetId(preset.id);
    setActiveChordIdx(0);
    onPreviewChord(preset.chords[0]);
  };

  const handlePluckHeroString = (idx: number, note: string) => {
    setPluckedStringTick((prev) => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 }));
    onPluckNote(note);
  };

  const handleStrumAllStrings = () => {
    [...HERO_STRINGS].reverse().forEach((str, step) => {
      const origIdx = HERO_STRINGS.length - 1 - step;
      window.setTimeout(() => {
        handlePluckHeroString(origIdx, str.note);
      }, step * 48);
    });
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
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-ink)]"
      onPointerUp={() => {
        pointerDownRef.current = false;
      }}
      onPointerCancel={() => {
        pointerDownRef.current = false;
      }}
    >
      {/* Inline SVG Noise Definition for Warm Vinyl/Luthier Surfaces */}
      <svg className="sr-only" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id={grainId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves="3"
              stitchTiles="stitch"
            />
          </filter>
        </defs>
      </svg>

      {/* 1. Sticky Floating Pill Navbar ("Smooth guide" pattern) */}
      <header className="sticky top-0 z-40 pt-3 px-4 sm:px-8">
        <div className="mx-auto max-w-[1160px] rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]/88 backdrop-blur-md px-3 sm:px-4 h-14 flex items-center justify-between gap-2 shadow-[0_10px_30px_-18px_rgba(17,17,17,0.18)]">
          <button
            type="button"
            onClick={() => scrollToSection('inicio')}
            className="flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <AcordifyLogo size={28} />
            <span className="text-[15px] sm:text-base font-medium tracking-tight text-[var(--color-ink)]">
              Acordify
            </span>
          </button>

          {/* Desktop Smooth-Guide Pill Nav */}
          <nav
            aria-label="Secciones de la portada"
            className="hidden md:flex items-center rounded-full bg-[var(--color-surface-subtle)] p-1"
          >
            {NAV_ITEMS.map((item) => {
              const active = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`relative px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                    active
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="landing-smooth-guide"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions: Optional Sync Login + Primary Enter CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAuthConfigured && (
              <button
                type="button"
                onClick={onOpenAuth}
                className="btn-secondary bg-[var(--color-surface)] px-3 py-1.5 text-[11px] sm:text-xs whitespace-nowrap"
              >
                {authUser ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-[var(--color-ok)] shrink-0" />
                    <span className="max-w-[68px] truncate">
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
              className="btn-primary px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs whitespace-nowrap"
            >
              <span>Empezar a practicar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 2. Hero Split Section */}
        <section
          id="inicio"
          className="mx-auto max-w-[1160px] px-4 sm:px-8 pt-10 pb-16 sm:pt-16 sm:pb-24"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Hero Editorial Copy */}
            <div className="lg:col-span-6 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-1.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-accent)]" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-ink-secondary)]">
                  Estudio de guitarra abierto · Sin registro
                </span>
              </motion.div>

              <h1 className="text-[44px] sm:text-[64px] lg:text-[76px] font-medium tracking-[-0.035em] leading-[1.02] text-[var(--color-ink)]">
                <span className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  >
                    Tocas guitarra.
                  </motion.span>
                </span>
                <span className="block overflow-hidden">
                  <motion.span
                    className="block font-editorial text-[var(--color-ink-secondary)] mt-1"
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.62, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  >
                    La teoría no te tiene que frenar.
                  </motion.span>
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="text-base sm:text-lg text-[var(--color-ink-secondary)] max-w-xl leading-relaxed"
              >
                Descubre qué acordes suenan bien juntos, cámbialos de tono con el círculo de quintas y practica pentatónicas paso a paso en una sola mesa. Gratis y sin iniciar sesión.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-wrap items-center gap-3 pt-1"
              >
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() =>
                    handleEnter('progressions', {
                      keyRoot: activePreset.keyRoot,
                      mode: activePreset.mode,
                    })
                  }
                  className="btn-primary px-6 py-3.5 text-sm shadow-[0_14px_28px_-14px_rgba(17,17,17,0.45)]"
                >
                  <span>Empezar a practicar</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() =>
                    handleEnter('circle', {
                      keyRoot: activePreset.keyRoot,
                      mode: activePreset.mode,
                    })
                  }
                  className="btn-secondary bg-[var(--color-surface)] px-5 py-3.5 text-sm"
                >
                  <Compass className="w-4 h-4" />
                  <span>Ver el círculo</span>
                </motion.button>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="font-mono text-xs text-[var(--color-ink-muted)]"
              >
                Pulsa un acorde o desliza por las cuerdas aquí al lado para escucharlo al instante.
              </motion.p>
            </div>

            {/* Right Column: Live Playable Acoustic Console + Orbiting Circle Halo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6 relative"
            >
              {/* Slow-Rotating Harmonic Ring Behind Console */}
              <div
                className="pointer-events-none absolute -inset-4 sm:-inset-8 flex items-center justify-center opacity-55"
                aria-hidden="true"
              >
                <motion.svg
                  viewBox="0 0 360 360"
                  className="w-[340px] sm:w-[440px] h-auto"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 96, repeat: Infinity, ease: 'linear' }}
                >
                  <circle
                    cx="180"
                    cy="180"
                    r="164"
                    fill="none"
                    stroke="#D4D4D8"
                    strokeWidth="1"
                    strokeDasharray="4 6"
                  />
                  <circle
                    cx="180"
                    cy="180"
                    r="138"
                    fill="none"
                    stroke="#E4E4E7"
                    strokeWidth="1"
                  />
                  {WHEEL_LABELS.map((lbl, idx) => {
                    const angleRad = ((idx * 30 - 90) * Math.PI) / 180;
                    const x = 180 + 164 * Math.cos(angleRad);
                    const y = 180 + 164 * Math.sin(angleRad);
                    return (
                      <g key={lbl}>
                        <circle
                          cx={x}
                          cy={y}
                          r="11"
                          fill="#FFFFFF"
                          stroke={lbl === activePreset.keyRoot ? '#E85D3D' : '#E4E4E7'}
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={y + 3.5}
                          textAnchor="middle"
                          fill={lbl === activePreset.keyRoot ? '#E85D3D' : '#71717A'}
                          className="font-mono text-[9px] font-semibold"
                        >
                          {lbl}
                        </text>
                      </g>
                    );
                  })}
                </motion.svg>
              </div>

              {/* Interactive Live Studio Card */}
              <div className="relative z-10 surface-card p-5 sm:p-6 shadow-[0_24px_60px_-28px_rgba(17,17,17,0.22)] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                      Prueba en vivo · Audio real
                    </p>
                    <p className="text-sm font-medium text-[var(--color-ink)] mt-0.5">
                      {activePreset.numerals} · <span className="text-[var(--color-ink-secondary)] font-normal">{activePreset.noteHint}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleLoop}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isLoopPlaying
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-ink)] text-white hover:opacity-88'
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

                {/* Preset Key Switcher */}
                <div
                  className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-[12px] bg-[var(--color-surface-subtle)] p-1"
                  role="group"
                  aria-label="Elegir tonalidad de muestra"
                >
                  {HERO_PRESETS.map((preset) => {
                    const active = preset.id === activePreset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`relative rounded-lg py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                          active
                            ? 'text-[var(--color-ink)]'
                            : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="hero-key-pill"
                            transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                            className="absolute inset-0 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xs"
                            aria-hidden="true"
                          />
                        )}
                        <span className="relative z-10">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* 4 Interactive Live Chords */}
                <div className="grid grid-cols-4 gap-2">
                  {activePreset.chords.map((chord, idx) => {
                    const isLit = idx === activeChordIdx;
                    return (
                      <motion.button
                        key={`${activePreset.id}-${chord}-${idx}`}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          setActiveChordIdx(idx);
                          onPreviewChord(chord);
                        }}
                        className={`relative overflow-hidden rounded-[12px] border py-3 px-2 text-center cursor-pointer transition-colors ${
                          isLit
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-tint)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface-board)] hover:border-[var(--color-ink-muted)]'
                        }`}
                      >
                        {isLit && (
                          <motion.span
                            layoutId="hero-active-chord"
                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                            className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
                            aria-hidden="true"
                          />
                        )}
                        <span className="block font-mono text-[10px] text-[var(--color-ink-muted)]">
                          0{idx + 1}
                        </span>
                        <span className="mt-0.5 block text-lg sm:text-xl font-medium text-[var(--color-ink)]">
                          {chord}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Dark Acoustic Soundhole & 6 Pluckable Strings */}
                <div className="relative overflow-hidden rounded-[14px] bg-[#111111] p-4 text-white">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.06]"
                    style={{ filter: `url(#${grainId})` }}
                    aria-hidden="true"
                  />
                  {/* Acoustic Rosette Circles */}
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-36 w-36 rounded-full border border-white/10"
                    aria-hidden="true"
                  />
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-28 w-28 rounded-full border border-[#E85D3D]/35 bg-black/50"
                    aria-hidden="true"
                  />

                  <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                      Boca acústica · Pulsa o desliza las cuerdas
                    </span>
                    <button
                      type="button"
                      onClick={handleStrumAllStrings}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2.5 py-1 font-mono text-[10px] text-white hover:bg-white/15 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 text-[#E85D3D]" />
                      <span>Rasguear</span>
                    </button>
                  </div>

                  <div className="relative z-10 space-y-1.5">
                    {HERO_STRINGS.map((str, idx) => {
                      const tick = pluckedStringTick[idx] ?? 0;
                      return (
                        <button
                          key={str.note}
                          type="button"
                          onPointerDown={() => {
                            pointerDownRef.current = true;
                            handlePluckHeroString(idx, str.note);
                          }}
                          onPointerEnter={() => {
                            if (pointerDownRef.current) {
                              handlePluckHeroString(idx, str.note);
                            }
                          }}
                          onClick={() => handlePluckHeroString(idx, str.note)}
                          className="group w-full flex items-center gap-3 py-1 px-1 rounded hover:bg-white/[0.04] cursor-pointer"
                          aria-label={`Tocar cuerda ${str.label}`}
                        >
                          <span className="w-9 text-left font-mono text-[10px] text-zinc-400 group-hover:text-[#E85D3D] transition-colors">
                            {str.label}
                          </span>
                          <span className="relative flex-1 h-2 flex items-center">
                            <motion.span
                              key={`s-${idx}-${tick}`}
                              animate={
                                tick > 0
                                  ? {
                                      scaleY: [1, 2.2, 0.75, 1.35, 1],
                                      backgroundColor: ['#E85D3D', '#E85D3D', '#E4E4E7'],
                                    }
                                  : undefined
                              }
                              transition={{ duration: 0.42, ease: 'easeOut' }}
                              className="block w-full rounded-full bg-zinc-400/80 group-hover:bg-[#E85D3D] transition-colors"
                              style={{ height: `${str.thickness}px` }}
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. Seamless Kinetic Marquee Ribbon */}
        <section
          aria-label="Capacidades de Acordify"
          className="overflow-hidden border-y border-[var(--color-border)] bg-[var(--color-surface)] py-3"
        >
          <div className="landing-marquee-track flex w-max items-center gap-8 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
            {[...MARQUEE_PHRASES, ...MARQUEE_PHRASES].map((text, i) => (
              <span key={`${text}-${i}`} className="inline-flex items-center gap-8">
                <span>{text}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
              </span>
            ))}
          </div>
        </section>

        {/* 4. El problema, en palabras reales */}
        <section
          id="por-que"
          className="mx-auto max-w-[1160px] px-4 sm:px-8 py-16 sm:py-24"
        >
          <motion.div
            initial={{ opacity: 0.96, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-10"
          >
            <div className="max-w-2xl space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                Por qué existe Acordify
              </p>
              <h2 className="text-3xl sm:text-5xl font-medium tracking-[-0.03em] leading-[1.08] text-[var(--color-ink)]">
                Sabes poner acordes.{' '}
                <span className="font-editorial text-[var(--color-ink-secondary)]">
                  Lo difícil era unir las piezas.
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="surface-card p-6 sm:p-7 space-y-3 bg-[var(--color-surface-board)]">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                  Lo de siempre
                </p>
                <h3 className="text-xl font-medium text-[var(--color-ink)]">
                  14 pestañas abiertas y muros de registro
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  Diagramas sueltos sin números de dedo, escalas llenas de puntitos que no dicen en qué traste empezar y sitios llenos de herramientas que te bloquean con un aviso de iniciar sesión antes de sonar un acorde.
                </p>
              </div>

              <div className="surface-card p-6 sm:p-7 space-y-3 border-[var(--color-border-strong)]">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-accent)]">
                  En Acordify
                </p>
                <h3 className="text-xl font-medium text-[var(--color-ink)]">
                  Tres herramientas conectadas, cero muros
                </h3>
                <p className="text-sm text-[var(--color-ink-secondary)] leading-relaxed">
                  Un mismo motor une progresiones de 4 acordes, las tonalidades compatibles del círculo de quintas y las 5 cajas de la pentatónica con orden y metrónomo. Entras directo a tocar.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 5. Interactive 3-Tool Bento Showcase */}
        <section
          id="herramientas"
          className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-16 sm:pb-24 space-y-8"
        >
          <motion.div
            initial={{ opacity: 0.96, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
          >
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                Herramientas integradas
              </p>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.025em] text-[var(--color-ink)]">
                Elige por dónde entrar
              </h2>
            </div>
            <p className="text-sm text-[var(--color-ink-secondary)] max-w-md">
              Cada herramienta comparte tonalidad y sonido con las demás. No hay menú laberíntico ni cuentas obligatorias.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Tool Card 1: Progresiones */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="group surface-card p-6 flex flex-col justify-between gap-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-ink)]">
                    <Music2 className="w-4 h-4" />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    01 · Componer
                  </span>
                </div>

                {/* Live Mini Preview */}
                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    {['G', 'Em', 'C', 'D'].map((sym, i) => (
                      <div
                        key={sym}
                        className={`rounded-lg border py-2 text-center font-mono text-xs font-medium transition-colors ${
                          i === 0
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-tint)] text-[var(--color-ink)]'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink-secondary)] group-hover:border-[var(--color-ink-muted)]'
                        }`}
                      >
                        {sym}
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 font-mono text-[10px] text-[var(--color-ink-muted)]">
                    Dedos 1–4 · Tónica en naranja · ○ aire · × muda
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-[var(--color-ink)]">Progresiones</h3>
                  <p className="text-sm text-[var(--color-ink-secondary)] mt-1.5 leading-relaxed">
                    Arma vueltas de 4 acordes por tonalidad y ánimo, escucha el loop con nylon o acero y cambia acordes sin salirte de tono.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleEnter('progressions')}
                className="btn-secondary w-full py-2.5 text-xs justify-between px-4 bg-[var(--color-surface)]"
              >
                <span>Abrir Progresiones</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* Tool Card 2: Círculo de Quintas */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="group surface-card p-6 flex flex-col justify-between gap-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-ink)]">
                    <Compass className="w-4 h-4" />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    02 · Conectar
                  </span>
                </div>

                {/* Mini Wheel & Neighbor Bridge */}
                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-3 flex items-center justify-between gap-3">
                  <div className="font-mono text-xs space-y-1">
                    <p className="text-[var(--color-ink)] font-medium">Sol ↔ Re</p>
                    <p className="text-[11px] text-[var(--color-accent)]">Solo cambia C → C#</p>
                    <p className="text-[10px] text-[var(--color-ink-muted)]">4 acordes puente</p>
                  </div>
                  <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0 transition-transform duration-500 group-hover:rotate-45">
                    <circle cx="32" cy="32" r="26" fill="#FFFFFF" stroke="#D4D4D8" strokeWidth="1.5" />
                    <circle cx="32" cy="32" r="15" fill="#FAFAFA" stroke="#E4E4E7" strokeWidth="1" />
                    <path d="M 32 6 A 26 26 0 0 1 54.5 19" fill="none" stroke="#E85D3D" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="32" cy="6" r="3.5" fill="#111111" />
                  </svg>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-[var(--color-ink)]">Círculo de Quintas</h3>
                  <p className="text-sm text-[var(--color-ink-secondary)] mt-1.5 leading-relaxed">
                    Entiende qué 7 acordes viven en cada tono, qué comparten con sus vecinos y con tour guiado de 5 pasos en español claro.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleEnter('circle')}
                className="btn-secondary w-full py-2.5 text-xs justify-between px-4 bg-[var(--color-surface)]"
              >
                <span>Explorar el Círculo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* Tool Card 3: Escalas paso a paso */}
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="group surface-card p-6 flex flex-col justify-between gap-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-ink)]">
                    <Layers className="w-4 h-4" />
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-ink-muted)]">
                    03 · Practicar
                  </span>
                </div>

                {/* Mini Box Diagram */}
                <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-3 space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[var(--color-ink-muted)]">
                    <span>Am Pentatónica · Caja 1</span>
                    <span>Tr. 5–8</span>
                  </div>
                  <div className="flex items-center justify-between gap-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <span
                        key={step}
                        className={`h-6 w-6 rounded-full inline-flex items-center justify-center font-mono text-[11px] font-semibold ${
                          step === 1
                            ? 'bg-[var(--color-accent)] text-white'
                            : 'bg-[var(--color-ink)] text-white opacity-85 group-hover:opacity-100'
                        }`}
                      >
                        {step}
                      </span>
                    ))}
                    <span className="font-mono text-[10px] text-[var(--color-ink-secondary)]">
                      → 12 pasos
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-[var(--color-ink)]">Escalas paso a paso</h3>
                  <p className="text-sm text-[var(--color-ink-secondary)] mt-1.5 leading-relaxed">
                    Deja de ver puntitos mudos: sigue los 5 patrones con traste inicial, dedo exacto, sonido nota por nota y conexión de cajas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleEnter('scales')}
                className="btn-secondary w-full py-2.5 text-xs justify-between px-4 bg-[var(--color-surface)]"
              >
                <span>Practicar Escalas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          </div>

          {/* Tuner Compact Strip */}
          <div className="surface-card p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface-board)]">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)]">
                <SlidersHorizontal className="w-4 h-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--color-ink)]">
                  Afinador cromático incluido dentro del estudio
                </p>
                <p className="text-xs text-[var(--color-ink-secondary)]">
                  Estándar, DADGAD, Drop D, trasposición por semitonos (±½ tono), cuerdas personalizadas y detección por micrófono en tu navegador.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleEnter('progressions')}
              className="btn-secondary shrink-0 self-start sm:self-center bg-[var(--color-surface)] px-4 py-2 text-xs"
            >
              Entrar al estudio
            </button>
          </div>
        </section>

        {/* 6. Honest Maker Story (#historia) */}
        <section
          id="historia"
          className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-16 sm:pb-24"
        >
          <motion.div
            initial={{ opacity: 0.96, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[20px] bg-[#111111] p-7 sm:p-12 text-white shadow-[0_24px_60px_-24px_rgba(17,17,17,0.45)]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{ filter: `url(#${grainId})` }}
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#E85D3D]/20 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-5">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#E85D3D]">
                  Hecho desde la práctica real
                </p>
                <blockquote className="font-editorial text-2xl sm:text-4xl leading-[1.2] text-zinc-100">
                  &ldquo;Hice Acordify porque tocaba guitarra sin saber qué acordes iban juntos ni en qué traste empezaba una escala pentatónica.&rdquo;
                </blockquote>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed max-w-2xl">
                  Proyecto construido por Félix Martínez, estudiante en UTRGV, mientras aprende armonía y programación. Sin métricas inventadas ni muros de pago: cada función existe porque hacía falta al practicar con la guitarra en la mano.
                </p>
              </div>

              <div className="lg:col-span-4 flex flex-col items-start lg:items-end gap-3">
                <div className="rounded-[14px] border border-white/12 bg-white/[0.05] p-4 text-left w-full lg:max-w-[280px] space-y-2">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                    Todo en una mesa
                  </p>
                  <ul className="space-y-1.5 text-xs text-zinc-200">
                    <li>• 36 voicings reales con dedos y tónica</li>
                    <li>• 24 tonalidades y acordes pivote</li>
                    <li>• 5 cajas por escala con metrónomo</li>
                    <li>• Libreta local + respaldo opcional</li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 7. Spring Accordion FAQ */}
        <section id="faq" className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-16 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
                Preguntas frecuentes
              </p>
              <h2 className="text-3xl font-medium tracking-[-0.025em] text-[var(--color-ink)]">
                Claro y sin letra chica
              </h2>
            </div>

            <div className="lg:col-span-8 space-y-2.5">
              {FAQ_ITEMS.map((item, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={item.q}
                    className="surface-card overflow-hidden"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-medium text-[var(--color-ink)]">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-[var(--color-ink-muted)] transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-[var(--color-accent)]' : ''
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="px-5 pb-4 text-sm text-[var(--color-ink-secondary)] leading-relaxed border-t border-[var(--color-border)] pt-3">
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

        {/* 8. Final Open-Access CTA */}
        <section className="mx-auto max-w-[1160px] px-4 sm:px-8 pb-16">
          <div className="surface-card p-8 sm:p-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.025em] text-[var(--color-ink)]">
                Saca la guitarra.{' '}
                <span className="font-editorial text-[var(--color-accent)]">Todo está abierto.</span>
              </h2>
              <p className="text-sm text-[var(--color-ink-secondary)]">
                Entra directo al estudio y empieza a armar tu siguiente vuelta sin formularios.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {isAuthConfigured && (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="btn-secondary bg-[var(--color-surface)] px-4 py-3 text-xs"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>{authUser ? 'Mi cuenta' : 'Sincronizar libreta'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleEnter('progressions')}
                className="btn-primary px-6 py-3 text-sm"
              >
                <span>Empezar a practicar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border)] py-6 px-4 sm:px-8">
        <div className="mx-auto max-w-[1160px] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-ink-muted)]">
          <span>
            Acordify · Progresiones, círculo de quintas, escalas y afinador de guitarra directo en tu navegador.
          </span>
          <div className="flex flex-wrap items-center gap-4 font-mono">
            <button
              type="button"
              onClick={() => handleEnter('progressions')}
              className="hover:text-[var(--color-ink)] cursor-pointer transition-colors"
            >
              Progresiones
            </button>
            <button
              type="button"
              onClick={() => handleEnter('circle')}
              className="hover:text-[var(--color-ink)] cursor-pointer transition-colors"
            >
              Círculo
            </button>
            <button
              type="button"
              onClick={() => handleEnter('scales')}
              className="hover:text-[var(--color-ink)] cursor-pointer transition-colors"
            >
              Escalas
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
