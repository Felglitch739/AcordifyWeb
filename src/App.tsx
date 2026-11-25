import { useEffect, useState } from 'react';
import { BookMarked, LogOut, SlidersHorizontal, User } from 'lucide-react';
import {
  useProgressionPlayer,
  type GuitarTone,
  type StrumPatternId,
} from './audio';
import {
  AcordifyLogo,
  AiInspirationPanel,
  AuthModal,
  KeyMoodPicker,
  Op1HardwareDeck,
  ProgressionStrip,
  SavedProgressionsDrawer,
  StyleSwitcher,
  ToastContainer,
  TransportBar,
  TunerPanel,
  VinylRecordHero,
} from './components';
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
import { StudioStyleProvider } from './styles/StudioStyleContext';
import {
  STUDIO_THEMES,
  persistStudioTheme,
  readInitialStudioTheme,
  type StudioThemeId,
} from './styles/studioThemes';
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
  const [studioStyle, setStudioStyleState] = useState<StudioThemeId>(readInitialStudioTheme);
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

  const handleChangeStudioStyle = (nextStyle: StudioThemeId) => {
    setStudioStyleState(nextStyle);
    persistStudioTheme(nextStyle);
  };

  // Sync browser colorScheme & meta theme-color with active world
  useEffect(() => {
    const themeMeta = STUDIO_THEMES.find((t) => t.id === studioStyle);
    if (!themeMeta) return;
    document.documentElement.style.colorScheme = themeMeta.isDark ? 'dark' : 'light';
    const metaTag = document.querySelector('meta[name="theme-color"]');
    if (metaTag) {
      metaTag.setAttribute('content', themeMeta.themeColor);
    }
  }, [studioStyle]);

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

  // Global keyboard shortcuts: Space to Play/Stop loop, Escape to close chord editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (tunerOpen || savedOpen || authModalOpen) return;
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
  }, [player, tunerOpen, savedOpen, authModalOpen, editingSlotIndex]);

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

    const shareUrl = `${window.location.origin}${window.location.pathname}${query}`;
    try {
      window.history.replaceState(null, '', query);
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

  const isVinyl = studioStyle === 'vinyl';
  const isApple = studioStyle === 'apple';
  const isOp1 = studioStyle === 'op1';

  const wordmarkClass = isVinyl
    ? 'font-poster font-extrabold sm:uppercase tracking-tight'
    : isOp1
      ? 'font-hardware font-bold tracking-tight'
      : isApple
        ? 'font-semibold tracking-[-0.03em]'
        : 'font-serif-editorial font-normal';

  const headerBtnClass = isVinyl
    ? 'inline-flex items-center gap-1 sm:gap-1.5 rounded border-2 border-[#141210] bg-[#FFFDF7] px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-mono font-bold text-[#141210] hover:bg-[#D4F350] transition cursor-pointer whitespace-nowrap'
    : isApple
      ? 'inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-black/[0.08] bg-white/80 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-[#1D1D1F] hover:bg-white shadow-sm transition cursor-pointer whitespace-nowrap'
      : isOp1
        ? 'op1-keycap inline-flex items-center gap-1 sm:gap-1.5 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-mono font-semibold text-[#18191B] cursor-pointer whitespace-nowrap'
        : 'inline-flex items-center gap-1 sm:gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-elevated)] transition cursor-pointer whitespace-nowrap';

  return (
    <StudioStyleProvider studioStyle={studioStyle} setStudioStyle={handleChangeStudioStyle}>
      <div
        data-studio={studioStyle}
        data-mood={progression.mood}
        className={`studio-world-${studioStyle} relative min-h-screen text-[var(--text-primary)] flex flex-col overflow-x-hidden`}
      >
        {(studioStyle === 'luthier' || isVinyl) && (
          <div aria-hidden="true" className="studio-grain" />
        )}

        {authClient && (
          <NeonSessionBridge client={authClient} onUserChange={setAuthUser} />
        )}

        {/* Adaptive 60px Sticky Header */}
        <header
          className={`sticky top-0 z-30 h-[58px] sm:h-[60px] backdrop-blur-xl ${
            isVinyl
              ? 'border-b-2 border-[#141210] bg-[var(--header-bg)]'
              : 'border-b border-[var(--border-subtle)] bg-[var(--header-bg)]'
          }`}
        >
          <div className="mx-auto max-w-6xl h-full px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <AcordifyLogo size={28} theme={studioStyle} className="sm:w-8 sm:h-8" />
              <div className="flex items-baseline gap-2.5">
                <h1
                  className={`${
                    isVinyl ? 'text-base sm:text-xl' : 'text-lg sm:text-2xl'
                  } text-[var(--text-primary)] leading-none whitespace-nowrap ${wordmarkClass}`}
                >
                  Acordify
                </h1>
                <span className="hidden lg:inline-block xl:hidden text-xs text-[var(--text-muted)]">
                  Estudio acústico
                </span>
              </div>
            </div>

            {/* Desktop Inline 4-Style Switcher */}
            <div className="hidden xl:flex items-center justify-center">
              <StyleSwitcher />
            </div>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenTuner}
                aria-label="Afinador"
                className={headerBtnClass}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--mood-accent)] shrink-0" />
                <span className="sm:hidden">Afinar</span>
                <span className="hidden sm:inline">Afinador</span>
              </button>

              <button
                type="button"
                onClick={() => setSavedOpen(true)}
                aria-label="Libreta de progresiones guardadas"
                className={headerBtnClass}
              >
                <BookMarked className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0" />
                <span className="hidden sm:inline">Libreta</span>
                <span className="rounded-full bg-[var(--bg-recessed)] border border-[var(--border-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--mood-accent)] num-tabular leading-none">
                  {savedItems.length}
                </span>
              </button>

              {isNeonAuthConfigured && (
                authUser ? (
                  <div className="flex items-center gap-1.5">
                    <span className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] max-w-[150px] truncate">
                      <User className="w-3.5 h-3.5 text-[var(--mood-accent)] shrink-0" />
                      <span className="truncate">{authUser.name || authUser.email}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      title="Cerrar sesión"
                      className={headerBtnClass}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Salir</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAuthModalOpen(true)}
                    className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      isVinyl
                        ? 'rounded border-2 border-[#141210] bg-[var(--mood-accent)] text-[var(--accent-ink)] font-mono uppercase'
                        : isApple
                          ? 'rounded-full bg-[var(--mood-accent)] text-[var(--accent-ink)] shadow-sm hover:brightness-110'
                          : 'rounded-xl border border-[var(--mood-border)] bg-[var(--mood-tint)] text-[var(--mood-accent)] hover:brightness-110'
                    }`}
                  >
                    <span className="sm:hidden">Entrar</span>
                    <span className="hidden sm:inline">Iniciar sesión</span>
                  </button>
                )
              )}
            </div>
          </div>
        </header>

        {/* Responsive Style Switcher Ribbon (< xl viewports) */}
        <div className="xl:hidden relative z-20 border-b border-[var(--border-subtle)] bg-[var(--header-bg)]/80 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-3 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)] shrink-0 hidden sm:inline">
              Estilo UI:
            </span>
            <div className="mx-auto sm:mx-0">
              <StyleSwitcher compact />
            </div>
          </div>
        </div>

        {/* Main Adaptive Studio Workspace */}
        <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 pt-6 pb-10 space-y-6">
          {studioStyle === 'op1' ? (
            <Op1HardwareDeck
              progression={progression}
              bpm={bpm}
              isPlaying={player.isPlaying}
              activeChordIndex={player.activeChordIndex}
              activeBeat={player.activeBeat}
              guitarTone={guitarTone}
              strumPattern={strumPattern}
              onSelectMode={handleSelectMode}
              onSelectKey={handleSelectKey}
              onSelectMood={handleSelectMood}
              onNextVariant={handleNextVariant}
              onChangeBpm={setBpm}
              onChangeGuitarTone={setGuitarTone}
              onChangeStrumPattern={setStrumPattern}
            />
          ) : studioStyle === 'vinyl' ? (
            <VinylRecordHero
              progression={progression}
              bpm={bpm}
              isPlaying={player.isPlaying}
              guitarTone={guitarTone}
              strumPattern={strumPattern}
              onSelectMode={handleSelectMode}
              onSelectKey={handleSelectKey}
              onSelectMood={handleSelectMood}
              onNextVariant={handleNextVariant}
              onTogglePlay={() => void player.toggle()}
              onChangeGuitarTone={setGuitarTone}
              onChangeStrumPattern={setStrumPattern}
            />
          ) : (
            <KeyMoodPicker
              keyRoot={progression.keyRoot}
              mode={progression.mode}
              mood={progression.mood}
              templateName={progression.templateName}
              scaleNotes={progression.scaleNotes}
              guitarTone={guitarTone}
              strumPattern={strumPattern}
              onSelectMode={handleSelectMode}
              onSelectKey={handleSelectKey}
              onSelectMood={handleSelectMood}
              onNextVariant={handleNextVariant}
              onChangeGuitarTone={setGuitarTone}
              onChangeStrumPattern={setStrumPattern}
            />
          )}

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
            audioMode={player.audioMode}
            onTogglePlay={() => void player.toggle()}
            onChangeBpm={setBpm}
            onToggleMetronome={() => setMetronomeEnabled((v) => !v)}
            onToggleCountIn={() => setCountInEnabled((v) => !v)}
            onShare={() => void handleShare()}
            onSave={(name) => void handleSave(name)}
          />

          <AiInspirationPanel
            chords={chordSymbols}
            keyRoot={progression.keyRoot}
            mode={progression.mode}
            mood={progression.mood}
            bpm={bpm}
            isSignedIn={Boolean(authUser)}
            onOpenAuth={() => setAuthModalOpen(true)}
            onErrorToast={(msg) => toast.addToast('error', msg)}
          />
        </main>

        <footer className="relative z-10 border-t border-[var(--border-subtle)] py-4 px-4 sm:px-6 text-center text-xs text-[var(--text-muted)]">
          Acordify · Guitarra acústica real, afinador y libreta sincronizada con Neon.
        </footer>

        <TunerPanel
          isOpen={tunerOpen}
          onClose={() => setTunerOpen(false)}
          onPlayReferenceNote={(noteName) => void player.previewNote(noteName)}
        />
        <SavedProgressionsDrawer
          isOpen={savedOpen}
          items={savedItems}
          storageMode={isCloudMode ? 'cloud' : 'local'}
          onClose={() => setSavedOpen(false)}
          onLoad={handleLoadSaved}
          onDelete={(id) => void handleDeleteSaved(id)}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={() => toast.addToast('success', 'Sesión iniciada')}
        />
        <ToastContainer toasts={toast.toasts} onDismiss={toast.removeToast} />
      </div>
    </StudioStyleProvider>
  );
}

export default App;
