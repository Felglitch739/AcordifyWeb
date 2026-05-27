import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { SongConcept } from './types';
import { Header, MoodSelector, ChordGrid, ScalePanel, LyricsSheet, TactileButton, LyricsControlPanel, LiveSessionOverlay, SessionVaultPanel, StrumsVisualizer, PanelWrapper, SortableToggle } from './components';
import useWorkspaceLayout from './hooks/useWorkspaceLayout';
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { generateSongConcept } from './services';
import { useAudioEngine, useLiveSession, useLyricsControls, useStorage, useStrumSync } from './hooks';
import { buildSessionSnapshot, detectKey, parseSessionSnapshot, serializeSessionSnapshot } from './utils';

const MOOD_DATA: Record<string, { chords: string[]; scale: string; lyrics: string; continuation: string }> = {
  'Jazzy Melancólico': {
    chords: ['Cmaj7', 'Am9', 'Dm7', 'G13'],
    scale: 'La Menor Pentatónica (con 9na)',
    lyrics: `[Cmaj7]Bajo la luz del [Am9]neón apagado,\n[Dm7]busco acordes que [G13]no hagan ruido.\n[Cmaj7]El piano llora un [Am9]tono oxidado,\n[Dm7]mientras se pierde lo [G13]compartido.`,
    continuation: `\n\n[Cmaj7]La lluvia cae de [Am9]forma síncopada,\n[Dm7]un solo limpio em[G13]pieza a sonar.\n[Cmaj7]En esta noche [Am9]fría y cansada,\n[Dm7]solo nos queda a[G13]prender a esperar.`
  },
  'Indie Rock Energético': {
    chords: ['E5', 'B5', 'C#5', 'A5'],
    scale: 'Mi Menor Pentatónica / Blues Scale',
    lyrics: `[E5]Gritos sordos en [B5]la autopista,\n[C#5]cuerdas rotas en el [A5]amplificador.\n[E5]No me llames si [B5]pierdo la pista,\n[C#5]ya no queda rastro [A5]del dolor.`,
    continuation: `\n\n[E5]Subo el volumen a [B5]ver si me escapo,\n[C#5]distorsión pura en [A5]el corazón.\n[E5]Bajo las reglas de [B5]ningún trato,\n[C#5]somos la rabia de [A5]esta canción.`
  },
  'Pop Acústico Relajado': {
    chords: ['G', 'D/F#', 'Em7', 'Cadd9'],
    scale: 'Sol Mayor (Escala Diatónica)',
    lyrics: `[G]El café se enfría en [D/F#]la mañana,\n[Em7]mientras el sol entra por la [Cadd9]ventana.\n[G]No hay prisa si el [D/F#]tiempo se detiene,\n[Em7]lo bueno de la vida [Cadd9]ya se viene.`,
    continuation: `\n\n[G]Tomo la guitarra y [D/F#]empiezo a cantar,\n[Em7]melodías simples para [Cadd9]despertar.\n[G]Aunque afuera el mundo [D/F#]quiera acelerar,\n[Em7]siempre hay un camino [Cadd9]a donde regresar.`
  }
};

function App() {
  const initialMood = 'Jazzy Melancólico';
  const initialData = MOOD_DATA[initialMood];

  const [concept, setConcept] = useState<SongConcept>({
    mood: initialMood,
    chords: initialData.chords,
    scale: initialData.scale,
    lyrics: initialData.lyrics,
    hasContinued: false
  });
  const [chordProContent, setChordProContent] = useState(initialData.lyrics);

  const [transposeSteps, setTransposeSteps] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  interface ModuleConfig {
    id: string;
    name: string;
    isVisible: boolean;
  }

  const [modules, setModules] = useState<ModuleConfig[]>([
    { id: 'control_panel', name: 'CONTROL', isVisible: true },
    { id: 'transposer', name: 'PITCH', isVisible: true },
    { id: 'chord_monitor', name: 'MONITOR', isVisible: true },
    { id: 'lyrics_sheet', name: 'SHEET', isVisible: true },
    { id: 'scale_visualizer', name: 'RECEIVER', isVisible: true }
  ]);

  const workspaceLayout = useWorkspaceLayout(modules.map(m => m.id), (nextOrder) => {
    setModules(prev => nextOrder.map(id => prev.find(p => p.id === id) || { id, name: id, isVisible: true }));
  });

  const [dragActiveId, setDragActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const isTouchDevice = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

  const isModuleVisible = (id: string) => {
    return modules.find(m => m.id === id)?.isVisible ?? false;
  };

  const toggleModule = (id: string) => {
    setModules(prev =>
      prev.map(m => (m.id === id ? { ...m, isVisible: !m.isVisible } : m))
    );
  };

  const handleBypass = (id: string) => {
    setModules(prev =>
      prev.map(m => (m.id === id ? { ...m, isVisible: false } : m))
    );
  };

  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [bpm, setBpm] = useState(90);
  const [isLedOn, setIsLedOn] = useState(false);
  const sessionFileInputRef = useRef<HTMLInputElement>(null);
  const [panelCollapsed, setPanelCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem('acordify_panels');
      return raw ? JSON.parse(raw) as Record<string, boolean> : {};
    } catch {
      return {};
    }
  });

  const syncNotebookContent = (nextContent: string) => {
    setChordProContent(nextContent);
    setConcept(prev => ({
      ...prev,
      lyrics: nextContent,
    }));
  };

  const togglePanelCollapsed = (panelId: string) => {
    setPanelCollapsed(prev => ({
      ...prev,
      [panelId]: !prev[panelId],
    }));
  };

  const isPanelCollapsed = (panelId: string) => panelCollapsed[panelId] ?? false;

  useEffect(() => {
    window.localStorage.setItem('acordify_panels', JSON.stringify(panelCollapsed));
  }, [panelCollapsed]);

  const triggerLedPulse = () => {
    setIsLedOn(true);
    setTimeout(() => {
      setIsLedOn(false);
    }, 150);
  };

  const { isPlaying, startPlayback, stopPlayback } = useAudioEngine(
    concept.chords,
    transposeSteps,
    bpm,
    triggerLedPulse
  );

  const detected = detectKey(concept.chords);
  const lyricsControls = useLyricsControls({
    activeChords: concept.chords,
    keyRoot: detected.root,
    mode: detected.mode,
    bpm,
    mood: concept.mood,
  });
  const strums = useStrumSync({
    initialMood: concept.mood,
    bpm,
  });
  const liveSession = useLiveSession({
    chords: concept.chords,
    bpm,
  });
  const storage = useStorage();

  useEffect(() => {
    strums.setMood(concept.mood);
  }, [concept.mood]);

  // Synchronized metronome logic
  useEffect(() => {
    // If loop player is active, Tone.js drives the LED pulse via callback.
    // If stopped but practice mode is active, fallback to JS timer.
    if (!isPracticeMode || isPlaying) {
      return;
    }

    const intervalId = setInterval(triggerLedPulse, (60 / bpm) * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isPracticeMode, isPlaying, bpm]);

  const handlePracticeModeToggle = () => {
    if (isPracticeMode) {
      setIsPracticeMode(false);
      if (isPlaying) {
        stopPlayback();
      }
    } else {
      setIsPracticeMode(true);
    }
  };

  const handlePlayLoopToggle = () => {
    if (isPlaying) {
      if (liveSession.isLive) {
        liveSession.stopLive();
      }
      stopPlayback();
      setIsPracticeMode(false);
    } else {
      startPlayback();
      setIsPracticeMode(true);
    }
  };

  const isPlaybackDisabled = isLoading || concept.chords.some(c => c === 'LOAD' || c === 'ERR' || c === 'SYS_ERR');

  const handleMoodChange = async (newMood: string) => {
    setTransposeSteps(0);
    setIsLoading(true);

    // 1. Enter hardware "loading" state
    setConcept({
      mood: newMood,
      chords: ['LOAD', 'LOAD', 'LOAD', 'LOAD'],
      scale: 'AWAITING AZURE SIGNAL...',
      lyrics: '\n\n[LOAD]ESTABLECIENDO CONEXIÓN...\n[LOAD]PROCESANDO TIMBRE MENTAL...\n[LOAD]EXTRAYENDO ACORDES...\n[LOAD]ESPERE...',
      hasContinued: false
    });
    setChordProContent('\n\n[LOAD]ESTABLECIENDO CONEXIÓN...\n[LOAD]PROCESANDO TIMBRE MENTAL...\n[LOAD]EXTRAYENDO ACORDES...\n[LOAD]ESPERE...');

    try {
      // 2. Fetch from AI Service
      const aiConcept = await generateSongConcept(newMood);
      
      // 3. Update with real signal
      setConcept({
        mood: newMood,
        chords: aiConcept.chords,
        scale: aiConcept.scale,
        lyrics: aiConcept.lyrics,
        hasContinued: false
      });
      setChordProContent(aiConcept.lyrics);
    } catch (err) {
      console.error(err);
      // Show connection error in the UI so the user knows the AI failed
      setConcept({
        mood: newMood,
        chords: ['ERR', 'ERR', 'ERR', 'ERR'],
        scale: 'SYS_ERR: CONNECTION FAILED',
        lyrics: `\n\n[ERR]ERROR DE CONEXIÓN CON AZURE.\n[ERR]Revisa la consola del navegador (F12) para más detalles.\n[ERR]Asegúrate de que VITE_AZURE_API_KEY y VITE_AZURE_ENDPOINT sean correctos.\n[ERR]y reinicia el servidor con 'npm run dev'.`,
        hasContinued: false
      });
      setChordProContent(`\n\n[ERR]ERROR DE CONEXIÓN CON AZURE.\n[ERR]Revisa la consola del navegador (F12) para más detalles.\n[ERR]Asegúrate de que VITE_AZURE_API_KEY y VITE_AZURE_ENDPOINT sean correctos.\n[ERR]y reinicia el servidor con 'npm run dev'.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueLyrics = () => {
    const data = MOOD_DATA[concept.mood];
    if (data && !concept.hasContinued) {
      const nextLyrics = chordProContent + data.continuation;
      syncNotebookContent(nextLyrics);
      setConcept(prev => ({
        ...prev,
        lyrics: nextLyrics,
        hasContinued: true
      }));
    }
  };

  const handleExportSession = () => {
    const snapshot = buildSessionSnapshot({
      title: `${concept.mood} Session`,
      mood: concept.mood,
      bpm,
      keyRoot: detected.root,
      mode: detected.mode,
      chords: concept.chords,
      capo: transposeSteps,
      chordProContent: chordProContent,
      language: lyricsControls.language,
      rhymeScheme: lyricsControls.rhymeScheme,
      transposition: transposeSteps,
      autoScrollSpeed: isPracticeMode ? 1 : 0,
    });

    const json = serializeSessionSnapshot(snapshot);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${snapshot.metadata.title.replace(/\s+/g, '_').toLowerCase()}.acordify.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSessionClick = () => {
    sessionFileInputRef.current?.click();
  };

  const handleImportSessionFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const raw = await file.text();
    const snapshot = parseSessionSnapshot(raw);

    if (isPlaying) {
      stopPlayback();
    }

    if (liveSession.isLive) {
      liveSession.stopLive();
    }

    setIsPracticeMode(false);
    setTransposeSteps(snapshot.player.transposition);
    setBpm(snapshot.player.bpm);
    syncNotebookContent(snapshot.lyrics.chordProContent);
    setConcept({
      mood: snapshot.metadata.mood,
      chords: snapshot.music.chords,
      scale: `${snapshot.music.keyRoot} ${snapshot.music.mode === 'major' ? 'Mayor' : 'Menor'}`,
      lyrics: snapshot.lyrics.chordProContent,
      hasContinued: true,
    });
  };

  const handleSaveCurrentSession = async () => {
    await storage.saveSession(
      buildSessionSnapshot({
        title: `${concept.mood} Session`,
        mood: concept.mood,
        bpm,
        keyRoot: detected.root,
        mode: detected.mode,
        chords: concept.chords,
        capo: transposeSteps,
        chordProContent: chordProContent,
        language: lyricsControls.language,
        rhymeScheme: lyricsControls.rhymeScheme,
        transposition: transposeSteps,
        autoScrollSpeed: isPracticeMode ? 1 : 0,
      }),
    );
  };

  const handleLoadStoredSession = async (id: string) => {
    const snapshot = await storage.loadSession(id);

    if (isPlaying) {
      stopPlayback();
    }

    if (liveSession.isLive) {
      liveSession.stopLive();
    }

    setIsPracticeMode(false);
    setTransposeSteps(snapshot.player.transposition);
    setBpm(snapshot.player.bpm);
    syncNotebookContent(snapshot.lyrics.chordProContent);
    setConcept({
      mood: snapshot.metadata.mood,
      chords: snapshot.music.chords,
      scale: `${snapshot.music.keyRoot} ${snapshot.music.mode === 'major' ? 'Mayor' : 'Menor'}`,
      lyrics: snapshot.lyrics.chordProContent,
      hasContinued: true,
    });
  };

  const handleDeleteStoredSession = async (id: string) => {
    await storage.deleteSession(id);
  };

  const handleExportBackup = async () => {
    const backup = await storage.exportBackup();
    const url = URL.createObjectURL(backup.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = backup.filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    await storage.importBackup(file);
  };

    const isLeftVisible = isModuleVisible('chord_monitor') || isModuleVisible('scale_visualizer');
    const isRightVisible = isModuleVisible('lyrics_sheet');

    return (
      <div className="bg-zinc-900 min-h-screen text-stone-200 flex flex-col font-sans antialiased selection:bg-amber-600/30 selection:text-amber-500 relative">
        {/* Powder-coated Texture Noise Overlay */}
        <div 
          className="fixed inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay z-50"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        ></div>
        {/* Brutalist Top Navigation Bar */}
        <Header />

        {/* Workspace Desk Manager Panel */}
        <div className="w-full border-b border-zinc-800 bg-zinc-950 px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between select-none space-y-2.5 sm:space-y-0 shadow-inner z-10">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase">
              [ WORKSPACE DESK MANAGER ]
            </span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {/* Screen-reader instructions for keyboard DnD */}
            <div id="workspace-dnd-instructions" className="sr-only">
              Usa Barra espaciadora para levantar, Flechas para mover, Esc para cancelar.
            </div>
            {!isTouchDevice ? (
              <DndContext
                sensors={useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))}
                onDragStart={(ev) => setDragActiveId(String(ev.active.id))}
                onDragOver={(ev) => setDragOverId(ev.over ? String(ev.over.id) : null)}
                onDragEnd={(event: DragEndEvent) => {
                  const { active, over } = event;
                  setDragActiveId(null);
                  setDragOverId(null);
                  if (!over) return;
                  workspaceLayout.handleDragEnd(String(active.id), String(over.id));
                }}
                onDragCancel={() => { setDragActiveId(null); setDragOverId(null); }}
              >
                <SortableContext items={modules.map(m => m.id)} strategy={rectSortingStrategy}>
                  {modules.map((mod, idx) => (
                    <div key={mod.id} className="relative">
                      {/* Drop placeholder appears before the hovered target */}
                      {dragOverId === mod.id && dragActiveId && dragActiveId !== mod.id && (
                        <div className="absolute -top-3 left-0 right-0 flex justify-center pointer-events-none">
                          <div className="bg-amber-500/10 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-md transition-all duration-200 ease-out transform -translate-y-1 opacity-100">
                            <svg width="18" height="10" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-amber-400">
                              <path d="M2 7h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M12 1l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        </div>
                      )}

                      <SortableToggle key={mod.id} id={mod.id}>
                        <div className={`transition-all duration-200 ${dragOverId === mod.id ? 'ring-2 ring-amber-500/30 shadow-[0_8px_20px_rgba(245,158,11,0.12)] scale-102' : ''}`}>
                          <button
                            type="button"
                            onClick={() => toggleModule(mod.id)}
                            className={`flex items-center space-x-2 px-2.5 py-1 border rounded-sm font-mono text-[9px] uppercase tracking-wider font-semibold select-none transition-all duration-150 cursor-pointer ${
                              mod.isVisible
                                ? 'bg-zinc-900 text-stone-200 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                                : 'bg-zinc-950 text-zinc-600 border-zinc-900 hover:bg-zinc-900'
                            }`}
                          >
                            <div 
                              className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${
                                mod.isVisible 
                                  ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' 
                                  : 'bg-red-700/50'
                              }`}
                            ></div>
                            <span>
                              {mod.isVisible ? `[ON] ${mod.name}` : `[OFF] ${mod.name}`}
                            </span>
                          </button>
                        </div>
                      </SortableToggle>
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              // Touch devices: render static controls without drag handles
              modules.map(mod => (
                <div key={mod.id} className="inline-block">
                  <button
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`flex items-center space-x-2 px-2.5 py-1 border rounded-sm font-mono text-[9px] uppercase tracking-wider font-semibold select-none transition-all duration-100 cursor-pointer ${
                      mod.isVisible
                        ? 'bg-zinc-900 text-stone-200 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600'
                        : 'bg-zinc-950 text-zinc-600 border-zinc-900 hover:bg-zinc-900'
                    }`}
                  >
                    <div 
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-75 ${
                        mod.isVisible 
                          ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' 
                          : 'bg-red-700/50'
                      }`}
                    ></div>
                    <span>
                      {mod.isVisible ? `[ON] ${mod.name}` : `[OFF] ${mod.name}`}
                    </span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
  
        {/* Main Screen Layout */}
        <main className="max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grow flex flex-col space-y-8">
          
          {/* Top Control Panel: Mood, Smart Transposer & Practice Engine */}
          <div className="flex flex-wrap gap-6 items-start">
            {isModuleVisible('control_panel') && (
              <div className="grow min-w-75 md:flex-[2_2_0%]">
                <MoodSelector 
                  value={concept.mood} 
                  onChange={handleMoodChange} 
                  onBypass={() => handleBypass('control_panel')}
                  collapsed={isPanelCollapsed('mood_selector')}
                  onToggleCollapse={() => togglePanelCollapsed('mood_selector')}
                />

                <div className="mt-4">
                  <LyricsControlPanel
                    rhymeScheme={lyricsControls.rhymeScheme}
                    emotionalMood={lyricsControls.emotionalMood}
                    narrativePerson={lyricsControls.narrativePerson}
                    metaphorDensity={lyricsControls.metaphorDensity}
                    thematicConcept={lyricsControls.thematicConcept}
                    language={lyricsControls.language}
                    linesToGenerate={lyricsControls.linesToGenerate}
                    isGenerating={lyricsControls.isGenerating}
                    error={lyricsControls.error}
                    result={lyricsControls.result}
                    onRhymeSchemeChange={lyricsControls.setRhymeScheme}
                    onEmotionalMoodChange={lyricsControls.setEmotionalMood}
                    onNarrativePersonChange={lyricsControls.setNarrativePerson}
                    onMetaphorDensityChange={lyricsControls.setMetaphorDensity}
                    onThematicConceptChange={lyricsControls.setThematicConcept}
                    onLanguageChange={lyricsControls.setLanguage}
                    onLinesToGenerateChange={lyricsControls.setLinesToGenerate}
                    onGenerate={async () => {
                      try {
                        const res = await lyricsControls.generateLyrics();
                        console.log('[App] generateLyrics returned:', res);
                        syncNotebookContent(res.chordProOutput);
                        setConcept((prev) => ({
                          ...prev,
                          lyrics: res.chordProOutput,
                          hasContinued: true,
                        }));
                      } catch (e) {
                        console.error('Failed to generate lyrics:', e);
                      }
                    }}
                    onBypass={() => handleBypass('control_panel')}
                    collapsed={isPanelCollapsed('lyrics_controls')}
                    onToggleCollapse={() => togglePanelCollapsed('lyrics_controls')}
                  />
                </div>
              </div>
            )}

            {isModuleVisible('transposer') && (
              <PanelWrapper
                className="grow min-w-50 md:flex-1 bg-zinc-800"
                collapsed={isPanelCollapsed('transposer')}
                onToggleCollapse={() => togglePanelCollapsed('transposer')}
                onBypass={() => handleBypass('transposer')}
                title={(
                  <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
                    [PITCH] // SMART TRANSPOSER
                  </label>
                )}
                contentClassName="p-4 flex flex-col space-y-3"
              >
                <div className="grow flex items-center justify-center space-x-3">
                  <TactileButton variant="zinc" onClick={() => setTransposeSteps(s => s - 1)} className="px-3! py-2! text-2xs!">
                    -1 ST
                  </TactileButton>
                  <div className="bg-zinc-950 px-3 py-2 border border-zinc-800 rounded-sm font-mono text-xs text-amber-500 font-bold uppercase w-24 text-center shadow-inner">
                    CAPO: {transposeSteps > 0 ? `+${transposeSteps}` : transposeSteps}
                  </div>
                  <TactileButton variant="zinc" onClick={() => setTransposeSteps(s => s + 1)} className="px-3! py-2! text-2xs!">
                    +1 ST
                  </TactileButton>
                </div>
                <StrumsVisualizer
                  state={strums.state}
                  onPrevPattern={strums.prevPattern}
                  onNextPattern={strums.nextPattern}
                  onTogglePlay={strums.toggle}
                  onBypass={() => handleBypass('transposer')}
                />
              </PanelWrapper>
            )}

            <div className="grow min-w-50 md:flex-1">
              <SessionVaultPanel
                sessions={storage.sessions}
                isLoading={storage.isLoading}
                error={storage.error}
                onSaveCurrent={handleSaveCurrentSession}
                onLoadSession={handleLoadStoredSession}
                onDeleteSession={handleDeleteStoredSession}
                onExportBackup={handleExportBackup}
                onImportBackup={handleImportBackup}
                onRefresh={storage.refreshSessions}
              />
            </div>
  
            {/* Practice Engine Module - Always Visible */}
              <div className="grow min-w-50 md:flex-1 border border-zinc-700 bg-zinc-800 p-4 rounded-sm flex flex-col space-y-3 shadow-md select-none justify-between">
              <div className="flex items-center justify-between border-b border-zinc-700 pb-2">
                <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
                  [SESSION] // PRACTICE ENGINE
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">LED</span>
                  <div 
                    className={`w-3 h-3 rounded-full transition-all duration-75 ${
                      isPracticeMode && isLedOn 
                        ? 'bg-orange-500 shadow-[0_0_8px_#f97316]' 
                        : 'bg-zinc-800'
                    }`}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col space-y-3 grow justify-center">
                <TactileButton 
                  variant={isPracticeMode ? 'orange' : 'zinc'} 
                  onClick={handlePracticeModeToggle}
                  className={`py-1.5 text-xs font-bold font-mono tracking-widest ${
                    isPracticeMode ? 'bg-orange-500! text-zinc-950! hover:bg-orange-400!' : ''
                  }`}
                >
                  {isPracticeMode ? '[ ACTIVE ]' : '[ PRACTICE MODE ]'}
                </TactileButton>
                <LiveSessionOverlay
                  state={liveSession.state}
                  onToggle={liveSession.isLive ? liveSession.stopLive : liveSession.startLive}
                  onSetChordDuration={liveSession.setChordDuration}
                />
                <div className="flex items-center justify-center space-x-2">
                  <TactileButton 
                    variant="zinc" 
                    onClick={() => setBpm(b => Math.max(40, b - 5))} 
                    className="px-2! py-1! text-2xs! font-mono"
                  >
                    -5
                  </TactileButton>
                  <div className="grow bg-zinc-950 px-2 py-1 border border-zinc-800 rounded-sm font-mono text-xs text-amber-500 font-bold uppercase text-center shadow-inner flex items-center justify-center space-x-1">
                    <span>{bpm}</span>
                    <span className="text-[9px] text-zinc-600">BPM</span>
                  </div>
                  <TactileButton 
                    variant="zinc" 
                    onClick={() => setBpm(b => Math.min(240, b + 5))} 
                    className="px-2! py-1! text-2xs! font-mono"
                  >
                    +5
                  </TactileButton>
                </div>
              </div>
            </div>
          </div>
  
          {/* Studio Rack Grid Layout */}
          {(isLeftVisible || isRightVisible) ? (
            <div className={`grid gap-6 items-start ${
              isLeftVisible && isRightVisible 
                ? 'grid-cols-1 lg:grid-cols-2' 
                : 'grid-cols-1'
            }`}>
              
              {/* Left Column: Chords Console & Solo Tuning */}
              {isLeftVisible && (
                <div className="flex flex-col space-y-6">
                  {/* Chords Visualiser */}
                  {isModuleVisible('chord_monitor') && (
                    <ChordGrid 
                      chords={concept.chords} 
                      transposeSteps={transposeSteps} 
                      onBypass={() => handleBypass('chord_monitor')}
                      collapsed={isPanelCollapsed('chord_monitor')}
                      onToggleCollapse={() => togglePanelCollapsed('chord_monitor')}
                    />
                  )}
                  
                  {/* Fretboard Tuning / Solo Scale */}
                  {isModuleVisible('scale_visualizer') && (
                    <ScalePanel 
                      scale={concept.scale} 
                      onBypass={() => handleBypass('scale_visualizer')}
                      collapsed={isPanelCollapsed('scale_visualizer')}
                      onToggleCollapse={() => togglePanelCollapsed('scale_visualizer')}
                    />
                  )}
      
                  {/* Extra Hardware/Rack details for visual premium texture */}
                  <div className="border border-zinc-800 bg-zinc-950 p-4 rounded-sm flex justify-between items-center text-3xs font-mono text-zinc-600">
                    <div className="flex space-x-3">
                      <span>RACK: 01A</span>
                      <span>PATCH: COLD-STATE</span>
                      <span className={isLoading ? "text-amber-500 animate-pulse" : ""}>
                        STATUS: {isLoading ? "RECEIVING SIGNAL..." : "READY"}
                      </span>
                    </div>
                    <div className={`w-1.5 h-1.5 ${isLoading ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></div>
                  </div>
                </div>
              )}
      
              {/* Right Column: Lyrics Sheet and Action Deck */}
              {isRightVisible && (
                <div className="flex flex-col space-y-4 h-full justify-between">
                  {/* Sheet showing monospace typography */}
                  <div className="grow">
                    <LyricsSheet 
                      lyrics={chordProContent} 
                      transposeSteps={transposeSteps} 
                      isPracticeMode={isPracticeMode}
                      isLive={liveSession.isLive}
                      activeChord={liveSession.state.activeChord}
                      onBypass={() => handleBypass('lyrics_sheet')}
                      collapsed={isPanelCollapsed('lyrics_sheet')}
                      onToggleCollapse={() => togglePanelCollapsed('lyrics_sheet')}
                    />
                  </div>
      
                  {/* Actions Controller deck */}
                  <div className="border border-zinc-700 bg-zinc-800 p-4 rounded-sm shadow-md flex items-center justify-between">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        [SEQUENCER CONTROL]
                      </span>
                      <span className="text-3xs font-mono text-zinc-500">
                        {isPlaying ? 'BACKING LOOP RUNNING' : 'LOOP PLAYER & WRITER DECK'}
                      </span>
                    </div>
      
                    <div className="flex items-center space-x-3">
                      {/* Play/Stop Loop Button */}
                      <TactileButton
                        variant={isPlaying ? 'red' : 'green'}
                        onClick={handlePlayLoopToggle}
                        disabled={isPlaybackDisabled}
                        className="font-bold min-w-27.5"
                      >
                        {isPlaying ? 'STOP LOOP' : 'PLAY LOOP'}
                      </TactileButton>
      
                      {/* Physical Clicky Tactile Button */}
                      <TactileButton
                        variant={concept.hasContinued ? 'zinc' : 'orange'}
                        onClick={handleContinueLyrics}
                        disabled={concept.hasContinued}
                      >
                        {concept.hasContinued ? 'LETRA COMPLETADA' : 'CONTINUAR LETRA'}
                      </TactileButton>

                      <TactileButton
                        variant="zinc"
                        onClick={handleExportSession}
                        className="font-bold min-w-27.5"
                      >
                        EXPORT JSON
                      </TactileButton>

                      <TactileButton
                        variant="zinc"
                        onClick={handleImportSessionClick}
                        className="font-bold min-w-27.5"
                      >
                        IMPORT JSON
                      </TactileButton>
                    </div>
                  </div>

                </div>
              )}
            </div>
          ) : (
            /* Standby State when all lower grid modules are hidden */
            <div className="border border-dashed border-zinc-800 bg-zinc-950/20 p-12 rounded-sm text-center flex flex-col items-center justify-center space-y-3 shadow-inner my-4">
              <span className="text-3xs font-mono text-zinc-600 uppercase tracking-widest">[ RACK CONTROL STATE: STANDBY ]</span>
              <h4 className="text-zinc-500 font-mono text-xs uppercase tracking-wider">All Workstation Modules Bypassed</h4>
              <p className="text-[10px] text-zinc-600 max-w-xs font-mono">Use the Workspace Desk Manager sub-header toggles at the top of the console to re-enable control blocks.</p>
            </div>
          )}
        </main>

        <input
          ref={sessionFileInputRef}
          type="file"
          accept=".acordify.json,application/json"
          className="hidden"
          onChange={handleImportSessionFile}
        />
      </div>
    );
}

export default App;
