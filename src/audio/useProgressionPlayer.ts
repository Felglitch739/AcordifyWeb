import { useCallback, useEffect, useRef, useState } from 'react';
import { getGuitarChord } from '../data/chords';
import { AcousticGuitarEngine, type StrumPatternId } from './guitarEngine';
import type { GuitarTone } from './karplusStrong';

export interface UseProgressionPlayerParams {
  chordSymbols: string[];
  bpm: number;
  metronomeEnabled: boolean;
  countInEnabled: boolean;
  guitarTone?: GuitarTone;
  strumPattern?: StrumPatternId;
}

export interface UseProgressionPlayerResult {
  isPlaying: boolean;
  activeChordIndex: number;
  activeBeat: number;
  countInBeat: number | null;
  audioMode: 'sampled' | 'physical';
  start: () => Promise<void>;
  stop: () => void;
  toggle: () => Promise<void>;
  previewChord: (symbol: string) => Promise<void>;
  previewNote: (noteName: string) => Promise<void>;
}

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;

export function useProgressionPlayer({
  chordSymbols,
  bpm,
  metronomeEnabled,
  countInEnabled,
  guitarTone = 'nylon',
  strumPattern = 'folk',
}: UseProgressionPlayerParams): UseProgressionPlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChordIndex, setActiveChordIndex] = useState(-1);
  const [activeBeat, setActiveBeat] = useState(-1);
  const [countInBeat, setCountInBeat] = useState<number | null>(null);
  const [audioMode, setAudioMode] = useState<'sampled' | 'physical'>('physical');

  const engineRef = useRef<AcousticGuitarEngine | null>(null);
  const chordsNotesRef = useRef<string[][]>([]);
  const bpmRef = useRef(bpm);
  const metronomeRef = useRef(metronomeEnabled);
  const countInRef = useRef(countInEnabled);
  const guitarToneRef = useRef<GuitarTone>(guitarTone);
  const strumPatternRef = useRef<StrumPatternId>(strumPattern);

  const isPlayingRef = useRef(false);
  const stepIndexRef = useRef(0);
  const nextStepTimeRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);
  const uiTimersRef = useRef<Set<number>>(new Set());

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AcousticGuitarEngine(() => {
        const currentEngine = engineRef.current;
        if (currentEngine) {
          setAudioMode(currentEngine.getEngineMode(guitarToneRef.current));
        }
      });
    }
    return engineRef.current;
  }, []);

  useEffect(() => {
    chordsNotesRef.current = chordSymbols.map((symbol) => getGuitarChord(symbol).midiNotes);
  }, [chordSymbols]);

  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  useEffect(() => {
    metronomeRef.current = metronomeEnabled;
  }, [metronomeEnabled]);

  useEffect(() => {
    countInRef.current = countInEnabled;
  }, [countInEnabled]);

  useEffect(() => {
    guitarToneRef.current = guitarTone;
    if (engineRef.current) {
      setAudioMode(engineRef.current.getEngineMode(guitarTone));
      if (engineRef.current.getAudioContext()) {
        void engineRef.current.preloadTone(guitarTone);
      }
    }
  }, [guitarTone]);

  useEffect(() => {
    strumPatternRef.current = strumPattern;
  }, [strumPattern]);

  const clearScheduledUiTimers = useCallback(() => {
    uiTimersRef.current.forEach((id) => window.clearTimeout(id));
    uiTimersRef.current.clear();
  }, []);

  const scheduleUiSync = useCallback(
    (audioTime: number, ctx: AudioContext, callback: () => void) => {
      const delayMs = Math.max(0, (audioTime - ctx.currentTime) * 1000);
      const id = window.setTimeout(() => {
        uiTimersRef.current.delete(id);
        if (isPlayingRef.current) {
          callback();
        }
      }, delayMs);
      uiTimersRef.current.add(id);
    },
    [],
  );

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (timerIdRef.current !== null) {
      window.clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    clearScheduledUiTimers();
    engineRef.current?.stopAll();
    stepIndexRef.current = 0;
    setIsPlaying(false);
    setActiveChordIndex(-1);
    setActiveBeat(-1);
    setCountInBeat(null);
  }, [clearScheduledUiTimers]);

  const scheduleStep = useCallback(
    (step: number, time: number, ctx: AudioContext) => {
      const engine = getEngine();
      const beatDurationSec = 60 / Math.max(40, bpmRef.current);
      const barDurationSec = beatDurationSec * 4;

      // Negative steps are quarter-note count-in beats (-8, -6, -4, -2 -> beats 1..4)
      if (step < 0) {
        if (step % 2 === 0) {
          const countBeat = 5 + step / 2; // 1..4
          engine.playMetronomeClick(time, countBeat === 1);
          scheduleUiSync(time, ctx, () => {
            setCountInBeat(countBeat);
            setActiveChordIndex(-1);
            setActiveBeat(countBeat - 1);
          });
        }
        return;
      }

      const totalChords = Math.max(1, chordsNotesRef.current.length);
      const totalEighthsPerLoop = totalChords * 8;
      const loopEighth = step % totalEighthsPerLoop;
      const chordIdx = Math.floor(loopEighth / 8);
      const eighthInBar = loopEighth % 8;
      const beatInBar = Math.floor(eighthInBar / 2);

      const notes = chordsNotesRef.current[chordIdx];
      if (notes && notes.length > 0) {
        engine.playPatternStep(
          notes,
          guitarToneRef.current,
          strumPatternRef.current,
          eighthInBar,
          time,
          barDurationSec,
        );
      }

      if (eighthInBar % 2 === 0) {
        if (metronomeRef.current) {
          engine.playMetronomeClick(time, beatInBar === 0);
        }

        scheduleUiSync(time, ctx, () => {
          setCountInBeat(null);
          setActiveChordIndex(chordIdx);
          setActiveBeat(beatInBar);
        });
      }
    },
    [getEngine, scheduleUiSync],
  );

  const start = useCallback(async () => {
    try {
      stop();

      const engine = getEngine();
      const ctx = await engine.ensureContext();
      void engine.preloadTone(guitarToneRef.current);
      setAudioMode(engine.getEngineMode(guitarToneRef.current));

      isPlayingRef.current = true;
      setIsPlaying(true);
      stepIndexRef.current = countInRef.current ? -8 : 0;
      nextStepTimeRef.current = ctx.currentTime + 0.03;

      const pumpScheduler = () => {
        if (!isPlayingRef.current) return;
        const activeCtx = engine.getAudioContext();
        if (!activeCtx) return;

        const eighthDurationSec = 60 / Math.max(40, bpmRef.current) / 2;

        while (nextStepTimeRef.current < activeCtx.currentTime + SCHEDULE_AHEAD_SEC) {
          const step = stepIndexRef.current;
          scheduleStep(step, nextStepTimeRef.current, activeCtx);
          stepIndexRef.current += 1;
          nextStepTimeRef.current += eighthDurationSec;
        }
      };

      pumpScheduler();
      timerIdRef.current = window.setInterval(pumpScheduler, LOOKAHEAD_MS);
    } catch (err) {
      console.error('Failed to start progression player:', err);
      stop();
    }
  }, [getEngine, scheduleStep, stop]);

  const toggle = useCallback(async () => {
    if (isPlayingRef.current) {
      stop();
    } else {
      await start();
    }
  }, [start, stop]);

  const previewChord = useCallback(
    async (symbol: string) => {
      try {
        const engine = getEngine();
        const ctx = await engine.ensureContext();
        void engine.preloadTone(guitarToneRef.current);
        setAudioMode(engine.getEngineMode(guitarToneRef.current));

        const notes = getGuitarChord(symbol).midiNotes;
        if (notes.length === 0) return;

        engine.strumChord(notes, guitarToneRef.current, {
          time: ctx.currentTime + 0.01,
          direction: 'down',
          velocity: 0.86,
          spreadSec: 0.025,
          duration: 1.85,
        });
      } catch (err) {
        console.error('Failed to preview chord:', err);
      }
    },
    [getEngine],
  );

  const previewNote = useCallback(
    async (noteName: string) => {
      try {
        const engine = getEngine();
        const ctx = await engine.ensureContext();
        void engine.preloadTone(guitarToneRef.current);
        setAudioMode(engine.getEngineMode(guitarToneRef.current));

        engine.pluckNote(noteName, guitarToneRef.current, ctx.currentTime + 0.01, 0.85, 1.8);
      } catch (err) {
        console.error('Failed to preview note:', err);
      }
    },
    [getEngine],
  );

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (timerIdRef.current !== null) {
        window.clearInterval(timerIdRef.current);
        timerIdRef.current = null;
      }
      clearScheduledUiTimers();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [clearScheduledUiTimers]);

  return {
    isPlaying,
    activeChordIndex,
    activeBeat,
    countInBeat,
    audioMode,
    start,
    stop,
    toggle,
    previewChord,
    previewNote,
  };
}
