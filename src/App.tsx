import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { BookMarked, Compass, Layers, Music2, Play, SlidersHorizontal, Square, User } from 'lucide-react';
import {
  useProgressionPlayer,
  type GuitarTone,
  type StrumPatternId,
} from './audio';
import { AcordifyLogo, AcordifyWordmark } from './components/AcordifyLogo';
import { AiInspirationPanel } from './components/AiInspirationPanel';
import { AuthModal } from './components/AuthModal';
import { KeyMoodPicker } from './components/KeyMoodPicker';
import { LandingPage, type PracticePreset } from './components/LandingPage';
import { ProgressionStrip } from './components/ProgressionStrip';
import { SavedProgressionsDrawer } from './components/SavedProgressionsDrawer';
import { ToastContainer } from './components/Toast';
import { TransportBar } from './components/TransportBar';
import { TunerPanel } from './components/TunerPanel';
import { useToast } from './hooks/useToast';
import {
  createCloudProgression,
  deleteCloudProgression,
  fetchCloudProgressions,
  isNeonApiConfigured,
} from './lib/neonApi';
import {
  authClient,
  getAuthBearerToken,
  isNeonAuthConfigured,
  type AuthUserSummary,
} from './lib/neonAuth';
import {
  decodeProgressionFromQuery,
  deleteProgression,
  encodeProgressionToQuery,
  listSavedProgressions,
  saveProgression,
  type SavedProgression,
} from './storage';
import {
  MAJOR_KEYS,
  MINOR_KEYS,
  MOOD_OPTIONS,
  buildProgressionFromDegrees,
  generateProgression,
  noteToSemitone,
  type DiatonicChord,
  type GeneratedProgression,
  type Mode,
  type MoodId,
} from './theory';

const CircleOfFifthsView = lazy(() =>
  import('./components/CircleOfFifthsView').then((module) => ({ default: module.CircleOfFifthsView })),
);
const ScalePracticeView = lazy(() =>
  import('./components/ScalePracticeView').then((module) => ({ default: module.ScalePracticeView })),
);

function NeonSessionBridge({
  client,
  onUserChange,
}: {
  client: NonNullable<typeof authClient>;
  onUserChange: (user: AuthUserSummary | null) => void;
}) {
  const session = client.useSession();
  const userId = session.data?.user?.id ?? null;
  const userEmail = session.data?.user?.email ?? '';
  const userName = session.data?.user?.name ?? '';

  useEffect(() => {
    if (userId) {
      onUserChange({ id: userId, email: userEmail, name: userName });
    } else {
      onUserChange(null);
    }
  }, [userId, userEmail, userName, onUserChange]);

  return null;
}

function resolveKeyForMode(currentRoot: string, nextMode: Mode): string {
  const pool = nextMode === 'major' ? MAJOR_KEYS : MINOR_KEYS;
  if (pool.includes(currentRoot)) {
    return currentRoot;
  }

  try {
    const targetSemitone = noteToSemitone(currentRoot);
    const match = pool.find((candidate) => noteToSemitone(candidate) === targetSemitone);
    if (match) return match;
  } catch {
    // Fall back to default root below
  }

  return pool[0];
}

type SuiteSection = 'progressions' | 'circle' | 'scales';
type AppSurface = 'landing' | 'studio';

const SUITE_TABS: readonly { id: SuiteSection; label: string; hash: string }[] = [
  { id: 'progressions', label: 'Progresiones', hash: '#progresiones' },
  { id: 'circle', label: 'Círculo de quintas', hash: '#circulo' },
  { id: 'scales', label: 'Escalas', hash: '#escalas' },
] as const;

function resolveInitialSection(): SuiteSection {
  if (typeof window === 'undefined') return 'progressions';
  const hash = window.location.hash.toLowerCase();
  if (hash === '#circulo') return 'circle';
  if (hash === '#escalas') return 'scales';
  return 'progressions';
}

function resolveInitialSurface(): AppSurface {
  if (typeof window === 'undefined') return 'landing';
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.startsWith('/practicar') || pathname.startsWith('/app')) {
    return 'studio';
  }
  if (decodeProgressionFromQuery(window.location.search) !== null) {
    return 'studio';
  }
  const hash = window.location.hash.toLowerCase();
  if (hash === '#progresiones' || hash === '#circulo' || hash === '#escalas') {
    return 'studio';
  }
  return 'landing';
}

function createInitialState(): { progression: GeneratedProgression; bpm: number } {
  if (typeof window !== 'undefined') {
    const shared = decodeProgressionFromQuery(window.location.search);
    if (shared) {
      return {
        progression: buildProgressionFromDegrees(
          shared.keyRoot,
          shared.mode,
          shared.mood,
          shared.degrees,
          'Progresión compartida',
        ),
        bpm: shared.bpm,
      };
    }
  }

  const defaultProg = generateProgression('G', 'major', 'calm', 0);
  return {
    progression: defaultProg,
    bpm: defaultProg.suggestedBpm,
  };
}

function App() {
  const [initial] = useState(createInitialState);
  const studioMainRef = useRef<HTMLElement>(null);
  const focusStudioOnEntry = useRef(false);
  const [surface, setSurface] = useState<AppSurface>(resolveInitialSurface);
  const [activeSection, setActiveSection] = useState<SuiteSection>(resolveInitialSection);
  const [progression, setProgression] = useState<GeneratedProgression>(initial.progression);
  const [variantIndex, setVariantIndex] = useState(0);
  const [bpm, setBpm] = useState(initial.bpm);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [countInEnabled, setCountInEnabled] = useState(false);
  const [guitarTone, setGuitarTone] = useState<GuitarTone>('nylon');
  const [strumPattern, setStrumPattern] = useState<StrumPatternId>('folk');
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);

  const [tunerOpen, setTunerOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserSummary | null>(null);
  const [savedItems, setSavedItems] = useState<SavedProgression[]>(() => listSavedProgressions());

  const toast = useToast();
  const chordSymbols = progression.slots.map((slot) => slot.chord.symbol);
  const isCloudMode = Boolean(authUser && isNeonApiConfigured);

  useEffect(() => {
    let cancelled = false;

    async function syncSavedProgressions() {
      if (authUser && isNeonApiConfigured) {
        const token = await getAuthBearerToken();
        if (!token) return;
        try {
          const cloudItems = await fetchCloudProgressions(token);
          if (!cancelled) {
            setSavedItems(cloudItems);
          }
        } catch {
          if (!cancelled) {
            setSavedItems(listSavedProgressions());
          }
        }
      } else {
        setSavedItems(listSavedProgressions());
      }
    }

    void syncSavedProgressions();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const player = useProgressionPlayer({
    chordSymbols,
    bpm,
    metronomeEnabled,
    countInEnabled,
    guitarTone,
    strumPattern,
  });

  // Global keyboard shortcuts: Space toggles Play/Stop loop in Studio, Escape closes chord editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (surface !== 'studio' || tunerOpen || savedOpen || authModalOpen) return;
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toUpperCase();
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          tag === 'BUTTON' ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        void player.toggle();
      } else if (
        e.key === 'Escape' &&
        editingSlotIndex !== null &&
        !tunerOpen &&
        !savedOpen &&
        !authModalOpen
      ) {
        setEditingSlotIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, surface, tunerOpen, savedOpen, authModalOpen, editingSlotIndex]);

  useEffect(() => {
    const onPopState = () => {
      setSurface(resolveInitialSurface());
      setActiveSection(resolveInitialSection());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const moodLabel =
    MOOD_OPTIONS.find((m) => m.id === progression.mood)?.label ?? progression.mood;

  const handleSelectMode = (nextMode: Mode) => {
    if (nextMode === progression.mode) return;
    const nextRoot = resolveKeyForMode(progression.keyRoot, nextMode);
    const nextProg = generateProgression(nextRoot, nextMode, progression.mood, 0);
    setVariantIndex(0);
    setEditingSlotIndex(null);
    setProgression(nextProg);
  };

  const handleSelectKey = (nextRoot: string) => {
    if (nextRoot === progression.keyRoot) return;
    const nextProg = buildProgressionFromDegrees(
      nextRoot,
      progression.mode,
      progression.mood,
      progression.degrees,
      progression.templateName,
    );
    setEditingSlotIndex(null);
    setProgression(nextProg);
  };

  const handleSelectMood = (nextMood: MoodId) => {
    const nextProg = generateProgression(progression.keyRoot, progression.mode, nextMood, 0);
    setVariantIndex(0);
    setEditingSlotIndex(null);
    setProgression(nextProg);
    setBpm(nextProg.suggestedBpm);
  };

  const handleNextVariant = () => {
    const nextVariant = variantIndex + 1;
    const nextProg = generateProgression(
      progression.keyRoot,
      progression.mode,
      progression.mood,
      nextVariant,
    );
    setVariantIndex(nextVariant);
    setEditingSlotIndex(null);
    setProgression(nextProg);
  };

  const handleToggleEditSlot = (slotIndex: number) => {
    setEditingSlotIndex((prev) => (prev === slotIndex ? null : slotIndex));
  };

  const handleReplaceChord = (slotIndex: number, newChord: DiatonicChord) => {
    const nextDegrees = [...progression.degrees];
    nextDegrees[slotIndex] = newChord.degree;

    const updated = buildProgressionFromDegrees(
      progression.keyRoot,
      progression.mode,
      progression.mood,
      nextDegrees,
      'Progresión ajustada',
    );
    setProgression(updated);
    setEditingSlotIndex(null);
    void player.previewChord(newChord.symbol);
    toast.addToast('success', `Acorde cambiado a ${newChord.symbol}`);
  };

  const handleShare = async () => {
    const query = encodeProgressionToQuery({
      keyRoot: progression.keyRoot,
      mode: progression.mode,
      mood: progression.mood,
      bpm,
      degrees: progression.degrees,
    });

    const shareUrl = `${window.location.origin}/practicar${query}`;
    try {
      window.history.replaceState(null, '', `/practicar${query}`);
    } catch {
      // Ignore history restriction in non-browser contexts
    }

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(shareUrl);
        toast.addToast('success', 'Enlace copiado al portapapeles');
      } else {
        toast.addToast('info', 'Enlace actualizado en la barra de direcciones');
      }
    } catch {
      toast.addToast('info', 'Enlace actualizado en la barra de direcciones');
    }
  };

  const handleSave = async (name: string) => {
    const payload = {
      name,
      keyRoot: progression.keyRoot,
      mode: progression.mode,
      mood: progression.mood,
      bpm,
      degrees: progression.degrees,
      chordSymbols,
    };

    if (isCloudMode) {
      const token = await getAuthBearerToken();
      if (token) {
        try {
          const created = await createCloudProgression(token, payload);
          setSavedItems((prev) => [created, ...prev]);
          toast.addToast('success', `Guardada en la nube: "${name}"`);
          return;
        } catch (err) {
          toast.addToast(
            'error',
            err instanceof Error ? err.message : 'Error al guardar en la nube',
          );
          return;
        }
      }
    }

    saveProgression(payload);
    setSavedItems(listSavedProgressions());
    toast.addToast('success', `Guardada "${name}"`);
  };

  const handleLoadSaved = (item: SavedProgression) => {
    player.stop();
    const loaded = buildProgressionFromDegrees(
      item.keyRoot,
      item.mode,
      item.mood,
      item.degrees,
      item.name,
    );
    setProgression(loaded);
    setBpm(item.bpm);
    setEditingSlotIndex(null);
    setSavedOpen(false);
    toast.addToast('info', `Cargada "${item.name}"`);
  };

  const handleDeleteSaved = async (id: string) => {
    if (isCloudMode) {
      const token = await getAuthBearerToken();
      if (token) {
        try {
          await deleteCloudProgression(token, id);
          setSavedItems((prev) => prev.filter((item) => item.id !== id));
          toast.addToast('info', 'Progresión eliminada de la nube');
          return;
        } catch (err) {
          toast.addToast(
            'error',
            err instanceof Error ? err.message : 'No se pudo eliminar de la nube',
          );
          return;
        }
      }
    }

    const remaining = deleteProgression(id);
    setSavedItems(remaining);
    toast.addToast('info', 'Progresión eliminada');
  };

  const handleOpenTuner = () => {
    if (player.isPlaying) {
      player.stop();
    }
    setTunerOpen(true);
  };

  const handleNavigateSection = (nextSection: SuiteSection) => {
    if (nextSection === activeSection) return;
    if (player.isPlaying) {
      player.stop();
    }
    setActiveSection(nextSection);
    const targetTab = SUITE_TABS.find((t) => t.id === nextSection);
    if (targetTab && typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${targetTab.hash}`);
      } catch {
        // Ignore history restriction
      }
    }
  };

  const handleComposeFromTool = (keyRoot: string, mode: Mode, degrees?: readonly number[]) => {
    if (player.isPlaying) {
      player.stop();
    }
    const nextProg = degrees
      ? buildProgressionFromDegrees(keyRoot, mode, progression.mood, degrees, 'Ejemplo del círculo de quintas')
      : generateProgression(keyRoot, mode, progression.mood, 0);
    setVariantIndex(0);
    setEditingSlotIndex(null);
    setProgression(nextProg);
    setBpm(nextProg.suggestedBpm);
    setActiveSection('progressions');
    studioMainRef.current?.focus({ preventScroll: true });
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#progresiones`);
        window.scrollTo({ top: 0 });
      } catch {
        // Ignore scroll/history errors
      }
    }
    toast.addToast(
      'info',
      `Cargada tonalidad ${keyRoot} ${mode === 'major' ? 'Mayor' : 'Menor'}`,
    );
  };

  const handleEnterStudio = (
    initialSection: SuiteSection = 'progressions',
    preset?: PracticePreset,
  ) => {
    if (player.isPlaying) {
      player.stop();
    }
    if (preset) {
      const nextProg = preset.degrees
        ? buildProgressionFromDegrees(preset.keyRoot, preset.mode, progression.mood, preset.degrees, 'Vuelta de la portada')
        : generateProgression(preset.keyRoot, preset.mode, progression.mood, 0);
      setVariantIndex(0);
      setEditingSlotIndex(null);
      setProgression(nextProg);
      setBpm(preset.bpm ?? nextProg.suggestedBpm);
    }
    setActiveSection(initialSection);
    focusStudioOnEntry.current = true;
    setSurface('studio');
    const targetTab = SUITE_TABS.find((t) => t.id === initialSection);
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', `/practicar${targetTab?.hash ?? '#progresiones'}`);
        window.scrollTo({ top: 0 });
      } catch {
        // Ignore history restriction
      }
    }
  };

  useEffect(() => {
    if (surface !== 'studio' || !focusStudioOnEntry.current) return;
    focusStudioOnEntry.current = false;
    studioMainRef.current?.focus({ preventScroll: true });
  }, [surface]);

  const handleGoToLanding = () => {
    if (player.isPlaying) {
      player.stop();
    }
    setSurface('landing');
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState(null, '', '/');
        window.scrollTo({ top: 0 });
      } catch {
        // Ignore history restriction
      }
    }
  };

  const handleSignOut = async () => {
    if (!authClient) return;
    await authClient.signOut();
    setAuthUser(null);
    setSavedItems(listSavedProgressions());
    toast.addToast('info', 'Sesión cerrada');
  };

  const defaultSaveName = `${progression.keyRoot} ${
    progression.mode === 'major' ? 'Mayor' : 'Menor'
  } · ${moodLabel}`;

  return (
    <MotionConfig reducedMotion="user">
      {authClient && (
        <NeonSessionBridge client={authClient} onUserChange={setAuthUser} />
      )}

      {surface === 'landing' ? (
        <LandingPage
          onEnterStudio={handleEnterStudio}
          onOpenAuth={() => setAuthModalOpen(true)}
          onOpenTuner={handleOpenTuner}
          authUser={authUser}
          isAuthConfigured={isNeonAuthConfigured}
          onPreviewChord={(symbol) => void player.previewChord(symbol)}
          onPluckNote={(noteName) => void player.previewNote(noteName)}
        />
      ) : (
        <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] flex flex-col">
          <a className="skip-to-content" href="#studio-main" onClick={(event) => {
            event.preventDefault();
            studioMainRef.current?.focus();
          }}>Saltar al estudio</a>
          {/* Clean Sticky Suite Header (Progresiones · Círculo · Escalas + Tools & Optional Google Auth) */}
          <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
            <div className="mx-auto max-w-[1160px] h-14 sm:h-16 px-3 sm:px-8 flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleGoToLanding}
                  title="Volver a la portada de Acordify"
                  className="acordify-brand flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <AcordifyLogo size={24} />
                  <AcordifyWordmark />
                </button>
              </div>

              {/* Desktop 3-View Suite Navigation */}
              <nav
                aria-label="Herramientas de estudio"
                className="hidden md:inline-flex items-center rounded-full bg-[var(--color-surface-subtle)] p-1"
              >
                {SUITE_TABS.map((tab) => {
                  const active = activeSection === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleNavigateSection(tab.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative min-h-10 px-3.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                        active
                          ? 'text-white'
                          : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="suite-nav-pill"
                          transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                          className="absolute inset-0 rounded-full bg-[var(--color-ink)]"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-1.5">
                        {tab.id === 'progressions' ? (
                          <Music2 className="w-3.5 h-3.5" />
                        ) : tab.id === 'circle' ? (
                          <Compass className="w-3.5 h-3.5" />
                        ) : (
                          <Layers className="w-3.5 h-3.5" />
                        )}
                        <span>{tab.label}</span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Right Actions: Afinador · Libreta · Optional Google Auth */}
              <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenTuner}
                  aria-label="Afinador"
                  className="btn-secondary bg-[var(--color-surface)] px-2 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs whitespace-nowrap"
                >
                  <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="studio-compact-label">Afinador</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSavedOpen(true)}
                  className="btn-secondary overflow-visible shrink-0 bg-[var(--color-surface)] gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs whitespace-nowrap"
                >
                  <BookMarked className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>Libreta</span>
                  <span className="min-w-[20px] text-center rounded-full bg-[var(--color-surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-[var(--color-ink)] num-tabular leading-none">
                    {savedItems.length}
                  </span>
                </button>

                {isNeonAuthConfigured && (
                  authUser ? (
                    <button
                      type="button"
                      onClick={() => setSavedOpen(true)}
                      aria-label="Mi cuenta"
                      title={`Conectado como ${authUser.name || authUser.email}`}
                      className="btn-secondary bg-[var(--color-surface)] px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs whitespace-nowrap"
                    >
                      <span className="h-2 w-2 rounded-full bg-[var(--color-ok)] shrink-0" />
                      <span className="studio-compact-label max-w-[54px] sm:max-w-[68px] truncate">
                        {(authUser.name || authUser.email).split(/[@\s]/)[0]}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAuthModalOpen(true)}
                      aria-label="Iniciar sesión"
                      className="btn-secondary bg-[var(--color-surface)] px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs whitespace-nowrap"
                    >
                      <User className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span className="studio-compact-label">Entrar</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Mobile 3-View Navigation Row */}
            <nav
              aria-label="Navegación móvil de herramientas"
              className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]/90 px-3 py-1.5"
            >
              <div className="grid grid-cols-3 gap-1 rounded-full bg-[var(--color-surface-subtle)] p-0.5">
                {SUITE_TABS.map((tab) => {
                  const active = activeSection === tab.id;
                  return (
                    <button
                      key={`mob-${tab.id}`}
                      type="button"
                      onClick={() => handleNavigateSection(tab.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`relative min-h-10 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-[var(--color-ink)] text-white'
                          : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </nav>
          </header>

          {/* Main Generous-Breathing Suite Flow */}
          <main ref={studioMainRef} id="studio-main" tabIndex={-1} className="studio-main mx-auto w-full max-w-[1240px] flex-1 px-4 sm:px-8 py-6 sm:py-9">
            <AnimatePresence mode="wait" initial={false}>
              {activeSection === 'progressions' ? (
                <motion.div
                  key="view-progressions"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-8"
                >
                  <KeyMoodPicker
                    progression={progression}
                    guitarTone={guitarTone}
                    strumPattern={strumPattern}
                    onSelectMode={handleSelectMode}
                    onSelectKey={handleSelectKey}
                    onSelectMood={handleSelectMood}
                    onNextVariant={handleNextVariant}
                    onChangeGuitarTone={setGuitarTone}
                    onChangeStrumPattern={setStrumPattern}
                  >
                    <div className="studio-playback-head">
                      <button type="button" className="studio-play" aria-pressed={player.isPlaying} onClick={() => void player.toggle()}>
                        {player.isPlaying ? <Square size={16} fill="currentColor" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}
                        {player.isPlaying ? 'Detener vuelta' : 'Escuchar vuelta'}
                      </button>
                      <span>{bpm} BPM</span>
                    </div>
                    <ProgressionStrip
                      progression={progression}
                      activeChordIndex={player.activeChordIndex}
                      activeBeat={player.activeBeat}
                      editingSlotIndex={editingSlotIndex}
                      onToggleEditSlot={handleToggleEditSlot}
                      onReplaceChord={handleReplaceChord}
                      onPreviewChord={(symbol) => void player.previewChord(symbol)}
                      onPluckNote={(noteName) => void player.previewNote(noteName)}
                    />
                    <TransportBar
                      isPlaying={player.isPlaying}
                      bpm={bpm}
                      activeBeat={player.activeBeat}
                      countInBeat={player.countInBeat}
                      metronomeEnabled={metronomeEnabled}
                      countInEnabled={countInEnabled}
                      defaultSaveName={defaultSaveName}
                      onChangeBpm={setBpm}
                      onToggleMetronome={() => setMetronomeEnabled((v) => !v)}
                      onToggleCountIn={() => setCountInEnabled((v) => !v)}
                      onShare={() => void handleShare()}
                      onSave={(name) => void handleSave(name)}
                    />

                  </KeyMoodPicker>

                  <AiInspirationPanel
                    chords={chordSymbols}
                    degrees={progression.degrees}
                    keyRoot={progression.keyRoot}
                    mode={progression.mode}
                    mood={progression.mood}
                    bpm={bpm}
                    strumPattern={strumPattern}
                  />
                </motion.div>
              ) : activeSection === 'circle' ? (
                <motion.div
                  key="view-circle"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Suspense fallback={<p role="status">Cargando herramienta…</p>}>
                    <CircleOfFifthsView
                      activeKeyRoot={progression.keyRoot}
                      activeMode={progression.mode}
                      onPreviewChord={(symbol) => void player.previewChord(symbol)}
                      onPluckNote={(noteName) => void player.previewNote(noteName)}
                      onPracticeExample={handleComposeFromTool}
                    />
                  </Suspense>
                </motion.div>
              ) : (
                <motion.div
                  key="view-scales"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Suspense fallback={<p role="status">Cargando herramienta…</p>}>
                    <ScalePracticeView
                      initialRoot={progression.keyRoot}
                      initialMode={progression.mode}
                      onPluckNote={(scientificNote) => void player.previewNote(scientificNote)}
                      onPreviewChord={(symbol) => void player.previewChord(symbol)}
                      onPracticeProgression={handleComposeFromTool}
                    />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <footer className="border-t border-[var(--color-border)] py-5 px-4 sm:px-8 text-center text-xs text-[var(--color-ink-muted)]">
            Acordify · Estudio de práctica para guitarra
          </footer>

          <SavedProgressionsDrawer
            isOpen={savedOpen}
            items={savedItems}
            defaultSaveName={defaultSaveName}
            storageMode={isCloudMode ? 'cloud' : 'local'}
            isAuthConfigured={isNeonAuthConfigured}
            authUser={authUser}
            onOpenAuth={() => setAuthModalOpen(true)}
            onSignOut={() => void handleSignOut()}
            onQuickSave={(name) => void handleSave(name)}
            onClose={() => setSavedOpen(false)}
            onLoad={handleLoadSaved}
            onDelete={(id) => void handleDeleteSaved(id)}
          />
        </div>
      )}

      <TunerPanel
        isOpen={tunerOpen}
        onClose={() => setTunerOpen(false)}
        guitarTone={guitarTone}
      />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={() => toast.addToast('success', 'Sesión iniciada')}
        onPluckNote={(noteName) => void player.previewNote(noteName)}
      />
      <ToastContainer toasts={toast.toasts} onDismiss={toast.removeToast} />
    </MotionConfig>
  );
}

export default App;
