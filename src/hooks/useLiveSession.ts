import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';

export type ChordDurationBars = 1 | 2;

export interface UseLiveSessionOptions {
  chords: string[];
  lyrics: string;
  bpm: number;
}

export interface UseLiveSessionResult {
  isLiveSessionActive: boolean;
  activeChordIndex: number;
  activeLineIndex: number;
  currentMeasure: number;
  chordDurationsBars: ChordDurationBars[];
  enableLiveSession: () => Promise<void>;
  disableLiveSession: (options?: { stopTransport?: boolean }) => void;
  toggleLiveSession: () => Promise<void>;
  setChordDurationBars: (index: number, bars: ChordDurationBars) => void;
}

type LiveSessionState = {
  activeChordIndex: number;
  activeLineIndex: number;
  currentMeasure: number;
  measuresIntoCurrentChord: number;
};

export function useLiveSession(options: UseLiveSessionOptions): UseLiveSessionResult {
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
  const [activeChordIndex, setActiveChordIndex] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [durationOverrides, setDurationOverrides] = useState<Partial<Record<number, ChordDurationBars>>>({});

  const chordDurationsBars = useMemo(
    () =>
      Array.from({ length: options.chords.length }, (_, index) => {
        const duration = durationOverrides[index];
        return duration === 2 ? 2 : 1;
      }) as ChordDurationBars[],
    [durationOverrides, options.chords.length],
  );

  const scheduleIdRef = useRef<number | null>(null);
  const transportStartedByLiveRef = useRef(false);
  const sessionStateRef = useRef<LiveSessionState>({
    activeChordIndex: 0,
    activeLineIndex: 0,
    currentMeasure: 0,
    measuresIntoCurrentChord: 0,
  });

  const lyricsLineCount = useMemo(() => {
    const lines = options.lyrics.split('\n');
    return lines.length > 0 ? lines.length : 1;
  }, [options.lyrics]);

  useEffect(() => {
    Tone.Transport.bpm.value = options.bpm;
  }, [options.bpm]);

  const clearSchedule = useCallback(() => {
    if (scheduleIdRef.current !== null) {
      Tone.Transport.clear(scheduleIdRef.current);
      scheduleIdRef.current = null;
    }
  }, []);

  const syncReactState = useCallback(() => {
    const state = sessionStateRef.current;
    setActiveChordIndex(state.activeChordIndex);
    setActiveLineIndex(state.activeLineIndex);
    setCurrentMeasure(state.currentMeasure);
  }, []);

  const advanceSession = useCallback(() => {
    const state = sessionStateRef.current;
    const activeDuration = chordDurationsBars[state.activeChordIndex] ?? 1;

    if (state.measuresIntoCurrentChord >= activeDuration) {
      state.activeChordIndex = options.chords.length > 0 ? (state.activeChordIndex + 1) % options.chords.length : 0;
      state.measuresIntoCurrentChord = 0;
    }

    state.currentMeasure += 1;
    state.activeLineIndex = lyricsLineCount > 0 ? state.activeChordIndex % lyricsLineCount : 0;
    state.measuresIntoCurrentChord += 1;

    syncReactState();
  }, [chordDurationsBars, lyricsLineCount, options.chords.length, syncReactState]);

  const enableLiveSession = useCallback(async () => {
    if (isLiveSessionActive) {
      return;
    }

    clearSchedule();

    if (Tone.Transport.state !== 'started') {
      await Tone.start();
      Tone.Transport.start();
      transportStartedByLiveRef.current = true;
    } else {
      transportStartedByLiveRef.current = false;
    }

    sessionStateRef.current = {
      activeChordIndex: 0,
      activeLineIndex: 0,
      currentMeasure: 0,
      measuresIntoCurrentChord: 0,
    };
    syncReactState();

    const repeatId = Tone.Transport.scheduleRepeat((time) => {
      Tone.Draw.schedule(() => {
        advanceSession();
      }, time);
    }, '1m');

    scheduleIdRef.current = repeatId;
    setIsLiveSessionActive(true);
  }, [advanceSession, clearSchedule, isLiveSessionActive, syncReactState]);

  const disableLiveSession = useCallback(
    (options?: { stopTransport?: boolean }) => {
      clearSchedule();
      setIsLiveSessionActive(false);
      transportStartedByLiveRef.current = false;

      if (options?.stopTransport && Tone.Transport.state === 'started') {
        Tone.Transport.stop();
      }
    },
    [clearSchedule],
  );

  const toggleLiveSession = useCallback(async () => {
    if (isLiveSessionActive) {
      disableLiveSession({ stopTransport: transportStartedByLiveRef.current });
      return;
    }

    await enableLiveSession();
  }, [disableLiveSession, enableLiveSession, isLiveSessionActive]);

  const setChordDurationBars = useCallback((index: number, bars: ChordDurationBars) => {
    setDurationOverrides((previous) => ({
      ...previous,
      [index]: bars,
    }));
  }, []);

  useEffect(() => {
    return () => {
      clearSchedule();

      if (transportStartedByLiveRef.current && Tone.Transport.state === 'started') {
        Tone.Transport.stop();
      }
    };
  }, [clearSchedule]);

  return {
    isLiveSessionActive,
    activeChordIndex,
    activeLineIndex,
    currentMeasure,
    chordDurationsBars,
    enableLiveSession,
    disableLiveSession,
    toggleLiveSession,
    setChordDurationBars,
  };
}