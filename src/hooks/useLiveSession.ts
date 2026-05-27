import { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  beatToBarAndPosition,
  buildChordSchedule,
  getActiveChordAtBeat,
  getTotalBeats,
  type ChordSlot,
  type LiveSessionConfig,
  type LiveSessionState,
} from '../utils';

export type ChordDurationBars = 1 | 2;

export interface UseLiveSessionOptions {
  chords: string[];
  bpm: number;
}

export interface UseLiveSessionResult {
  state: LiveSessionState;
  startLive: () => Promise<void>;
  stopLive: () => void;
  setChordDuration: (chordIndex: number, bars: ChordDurationBars) => void;
  isLive: boolean;
}

function createDurationMap(chords: string[]): Record<number, ChordDurationBars> {
  return chords.reduce<Record<number, ChordDurationBars>>((accumulator, _chord, index) => {
    accumulator[index] = 1;
    return accumulator;
  }, {});
}

function createInitialState(chordSlots: ChordSlot[] = []): LiveSessionState {
  return {
    isLive: false,
    isPlaying: false,
    activeChordIndex: 0,
    activeChord: '',
    currentBar: 1,
    currentBeat: 1,
    totalBars: 0,
    chordSlots,
  };
}

function buildLiveConfig(
  chords: string[],
  durationPerChord: Record<number, ChordDurationBars>,
  bpm: number,
): LiveSessionConfig {
  return {
    chords,
    durationPerChord,
    bpm,
    timeSignature: 4,
  };
}

function isAtBarBoundary(beatPosition: number): boolean {
  const roundedBeat = Math.round(beatPosition);
  return Math.abs(beatPosition - roundedBeat) < 0.001 && roundedBeat % 4 === 0;
}

export function useLiveSession(options: UseLiveSessionOptions): UseLiveSessionResult {
  const [durationPerChord, setDurationPerChordState] = useState<Record<number, ChordDurationBars>>(() =>
    createDurationMap(options.chords),
  );
  const [state, setState] = useState<LiveSessionState>(() => createInitialState());

  const scheduleIdRef = useRef<number | null>(null);
  const startedTransportByHookRef = useRef(false);
  const latestBpmRef = useRef(options.bpm);
  const latestChordsRef = useRef(options.chords);
  const latestDurationPerChordRef = useRef(durationPerChord);
  const activeScheduleRef = useRef<ChordSlot[]>([]);
  const pendingDurationUpdateRef = useRef(false);
  const isLiveRef = useRef(false);

  const buildStateFromBeat = useCallback((beat: number, chordSlots: ChordSlot[]): LiveSessionState => {
    const totalBeats = getTotalBeats(chordSlots);
    const activeSlot = getActiveChordAtBeat(beat, chordSlots);
    const { bar, beatInBar } = beatToBarAndPosition(beat, totalBeats);

    return {
      isLive: true,
      isPlaying: true,
      activeChordIndex: activeSlot.index,
      activeChord: activeSlot.chord,
      currentBar: bar,
      currentBeat: beatInBar,
      totalBars: totalBeats > 0 ? totalBeats / 4 : 0,
      chordSlots,
    };
  }, []);

  const rebuildSchedule = useCallback((durationMap: Record<number, ChordDurationBars>) => {
    const chordSlots = buildChordSchedule(
      buildLiveConfig(latestChordsRef.current, durationMap, latestBpmRef.current),
    );

    activeScheduleRef.current = chordSlots;
    return chordSlots;
  }, []);

  const clearScheduledRepeat = useCallback(() => {
    if (scheduleIdRef.current !== null) {
      Tone.Transport.clear(scheduleIdRef.current);
      scheduleIdRef.current = null;
    }
  }, []);

  const syncFromTransport = useCallback(() => {
    const chordSlots = activeScheduleRef.current;
    if (chordSlots.length === 0) {
      return;
    }

    const positionSeconds = Tone.Transport.toSeconds(Tone.Transport.position);
    const beatPosition = positionSeconds * (latestBpmRef.current / 60);

    if (pendingDurationUpdateRef.current && isAtBarBoundary(beatPosition)) {
      pendingDurationUpdateRef.current = false;
      const nextSchedule = buildChordSchedule(
        buildLiveConfig(latestChordsRef.current, latestDurationPerChordRef.current, latestBpmRef.current),
      );

      activeScheduleRef.current = nextSchedule;
      setState(() => buildStateFromBeat(beatPosition, nextSchedule));
      return;
    }

    setState(() => buildStateFromBeat(beatPosition, chordSlots));
  }, [buildStateFromBeat]);

  useEffect(() => {
    latestBpmRef.current = options.bpm;
    Tone.Transport.bpm.value = options.bpm;
  }, [options.bpm]);

  useEffect(() => {
    latestChordsRef.current = options.chords;
  }, [options.chords]);

  useEffect(() => {
    latestDurationPerChordRef.current = durationPerChord;
  }, [durationPerChord]);

  useEffect(() => {
    isLiveRef.current = state.isLive;
  }, [state.isLive]);

  useEffect(() => {
    if (options.chords.length === 0) {
      pendingDurationUpdateRef.current = false;
      activeScheduleRef.current = [];
      setDurationPerChordState({});
      setState(createInitialState());
      clearScheduledRepeat();
      return;
    }

    setDurationPerChordState((previous) => {
      const shouldResetDurations = Object.keys(previous).length !== options.chords.length;
      const next = shouldResetDurations ? createDurationMap(options.chords) : previous;

      if (shouldResetDurations) {
        latestDurationPerChordRef.current = next;
      }

      const nextSchedule = buildChordSchedule(buildLiveConfig(options.chords, next, options.bpm));
      activeScheduleRef.current = nextSchedule;

      if (isLiveRef.current) {
        pendingDurationUpdateRef.current = true;
      } else {
        setState(createInitialState(nextSchedule));
      }

      return next;
    });
  }, [clearScheduledRepeat, options.bpm, options.chords]);

  const startLive = useCallback(async () => {
    if (options.chords.length === 0) {
      return;
    }

    clearScheduledRepeat();

    await Tone.start();

    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
      startedTransportByHookRef.current = true;
    } else {
      startedTransportByHookRef.current = false;
    }

    const chordSlots = rebuildSchedule(latestDurationPerChordRef.current);
    const initialBeat = Tone.Transport.toSeconds(Tone.Transport.position) * (latestBpmRef.current / 60);

    setState(buildStateFromBeat(initialBeat, chordSlots));

    const repeatId = Tone.Transport.scheduleRepeat((time) => {
      Tone.Draw.schedule(() => {
        syncFromTransport();
      }, time);
    }, '4n');

    scheduleIdRef.current = repeatId;
  }, [buildStateFromBeat, clearScheduledRepeat, options.chords.length, rebuildSchedule, syncFromTransport]);

  const stopLive = useCallback(() => {
    clearScheduledRepeat();
    pendingDurationUpdateRef.current = false;
    const chordSlots = activeScheduleRef.current.length > 0
      ? activeScheduleRef.current
      : buildChordSchedule(buildLiveConfig(latestChordsRef.current, latestDurationPerChordRef.current, latestBpmRef.current));

    activeScheduleRef.current = chordSlots;
    setState(createInitialState(chordSlots));
  }, [clearScheduledRepeat]);

  const setChordDuration = useCallback((chordIndex: number, bars: ChordDurationBars) => {
    setDurationPerChordState((previous) => {
      const next = {
        ...previous,
        [chordIndex]: bars,
      };

      latestDurationPerChordRef.current = next;

      if (isLiveRef.current) {
        pendingDurationUpdateRef.current = true;
      } else {
        const nextSchedule = buildChordSchedule(
          buildLiveConfig(latestChordsRef.current, next, latestBpmRef.current),
        );
        activeScheduleRef.current = nextSchedule;
        setState(createInitialState(nextSchedule));
      }

      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      clearScheduledRepeat();

      if (startedTransportByHookRef.current && Tone.Transport.state === 'started') {
        Tone.Transport.stop();
      }

      Tone.Transport.cancel(0);
    };
  }, [clearScheduledRepeat]);

  return {
    state,
    startLive,
    stopLive,
    setChordDuration,
    isLive: state.isLive,
  };
}