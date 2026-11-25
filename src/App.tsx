import { useEffect, useState } from 'react';
import { BookMarked, SlidersHorizontal } from 'lucide-react';
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
  ProgressionStrip,
  SavedProgressionsDrawer,
  ToastContainer,
  TransportBar,
  TunerPanel,
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

  // Global keyboard shortcuts: Space toggles Play/Stop loop, Escape closes chord editor
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

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] flex flex-col">
      {authClient && (
        <NeonSessionBridge client={authClient} onUserChange={setAuthUser} />
      )}

      {/* Clean 64px Monochrome Header (no login button clutter) */}
      <header className="sticky top-0 z-30 h-16 border-b border-[var(--color-border)] bg-[var(--color-bg)]/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1160px] h-full px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <AcordifyLogo size={28} />
            <span className="text-lg font-medium tracking-[-0.02em] text-[var(--color-ink)]">
              Acordify
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenTuner}
              className="btn-secondary bg-[var(--color-surface)] px-3.5 py-1.5 text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Afinador</span>
            </button>

            <button
              type="button"
              onClick={() => setSavedOpen(true)}
              className="btn-secondary bg-[var(--color-surface)] px-3.5 py-1.5 text-xs"
            >
              <BookMarked className="w-3.5 h-3.5" />
              <span>Libreta</span>
              <span className="rounded-full bg-[var(--color-surface-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-ink)] num-tabular leading-none">
                {savedItems.length}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Generous-Breathing Single Flow */}
      <main className="mx-auto w-full max-w-[1160px] flex-1 px-4 sm:px-8 py-8 sm:py-12 space-y-8">
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
        />

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
          onTogglePlay={() => void player.toggle()}
          onChangeBpm={setBpm}
          onToggleMetronome={() => setMetronomeEnabled((v) => !v)}
          onToggleCountIn={() => setCountInEnabled((v) => !v)}
          onShare={() => void handleShare()}
          onSave={(name) => void handleSave(name)}
        />

        <AiInspirationPanel
          chords={chordSymbols}
          degrees={progression.degrees}
          keyRoot={progression.keyRoot}
          mode={progression.mode}
          mood={progression.mood}
          bpm={bpm}
          strumPattern={strumPattern}
        />
      </main>

      <footer className="border-t border-[var(--color-border)] py-5 px-4 sm:px-8 text-center text-xs text-[var(--color-ink-muted)]">
        Acordify · Teoría, guitarra acústica y afinador directo en tu navegador.
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
        isAuthConfigured={isNeonAuthConfigured}
        authUser={authUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onSignOut={() => void handleSignOut()}
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
  );
}

export default App;
