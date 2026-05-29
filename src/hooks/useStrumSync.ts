import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import type { StrumPattern, StrumState } from '../utils/strumPatterns';
import { getPatternByMood, getAllPatterns } from '../utils/strumPatterns';

interface UseStrumSyncOptions {
  initialMood?: string;
  bpm: number;
}

export function useStrumSync(opts: UseStrumSyncOptions) {
  const { initialMood = 'Pop Acústico Relajado', bpm } = opts;
  const initialPattern = getPatternByMood(initialMood);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentBar, setCurrentBar] = useState(0);
  const [activeMood, setActiveMood] = useState(initialMood);
  const [pattern, setPattern] = useState<StrumPattern>(initialPattern);

  // Pending pattern swap at next bar boundary
  const pendingPatternRef = useRef<StrumPattern | null>(null);

  // Keep track of scheduled event ids so we can clear them per-bar
  const scheduledIdsRef = useRef<number[]>([]);
  const barScheduleIdRef = useRef<number | null>(null);

  // Sync BPM to Transport
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const clearScheduled = useCallback(() => {
    scheduledIdsRef.current.forEach((id) => {
      try {
        Tone.Transport.clear(id);
      } catch {
        // ignore
      }
    });
    scheduledIdsRef.current = [];
  }, []);

  const scheduleBar = useCallback((barStartTime: number) => {
    // Clear previously scheduled beats for safety
    clearScheduled();

    const beats = pattern.beats;
    const barDuration = Tone.Time('1m').toSeconds();

    beats.forEach((b, idx) => {
      const offsetSeconds = ((b.beat - 1) / pattern.beatsPerBar) * barDuration;
      const eventTime = barStartTime + offsetSeconds;

      const id = Tone.Transport.scheduleOnce((time) => {
        // Use Tone.Draw for UI-synced updates
        Tone.Draw.schedule(() => {
          setCurrentBeat(idx);
        }, time);
      }, eventTime);

      scheduledIdsRef.current.push(id);
    });
  }, [pattern, clearScheduled]);

  const onBar = useCallback((time: number) => {
    // Update bar counter (use Tone.Draw to sync DOM updates)
    Tone.Draw.schedule(() => {
      setCurrentBar((b) => b + 1);
      setCurrentBeat(0);
    }, time);

    // If we have a pending pattern, apply it at bar boundary
    if (pendingPatternRef.current) {
      setPattern(pendingPatternRef.current);
      setActiveMood(pendingPatternRef.current.mood);
      pendingPatternRef.current = null;
    }

    // schedule beats for this new bar
    scheduleBar(time);
  }, [scheduleBar]);

  const start = useCallback(async () => {
    try {
      await Tone.start();
      // ensure we don't double-schedule
      if (barScheduleIdRef.current !== null) return;

      // schedule repeat per bar
      const id = Tone.Transport.scheduleRepeat((time) => {
        onBar(time);
      }, '1m');

      barScheduleIdRef.current = id;
      Tone.Transport.start();
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to start strum sync:', err);
    }
  }, [onBar]);

  const stop = useCallback(() => {
    Tone.Transport.stop();
    // clear bar schedule
    if (barScheduleIdRef.current !== null) {
      try {
        Tone.Transport.clear(barScheduleIdRef.current);
      } catch {
        // ignore
      }
      barScheduleIdRef.current = null;
    }
    clearScheduled();
    setIsPlaying(false);
    setCurrentBeat(0);
    setCurrentBar(0);
  }, [clearScheduled]);

  const toggle = useCallback(() => {
    if (isPlaying) stop(); else start();
  }, [isPlaying, start, stop]);

  // Switch pattern at next bar boundary
  const setPatternNextBar = useCallback((p: StrumPattern) => {
    pendingPatternRef.current = p;
  }, []);

  const nextPattern = useCallback(() => {
    const all = getAllPatterns();
    const idx = all.findIndex((x) => x.id === pattern.id);
    const next = all[(idx + 1) % all.length];
    setPatternNextBar(next);
  }, [pattern, setPatternNextBar]);

  const prevPattern = useCallback(() => {
    const all = getAllPatterns();
    const idx = all.findIndex((x) => x.id === pattern.id);
    const prev = all[(idx - 1 + all.length) % all.length];
    setPatternNextBar(prev);
  }, [pattern, setPatternNextBar]);

  const setMood = useCallback((mood: string) => {
    // auto-select corresponding pattern at next bar
    const p = getPatternByMood(mood);
    setPatternNextBar(p);
  }, [setPatternNextBar]);

  useEffect(() => {
    return () => {
      // cleanup all transport schedules created by this hook
      if (barScheduleIdRef.current !== null) {
        try {
          Tone.Transport.clear(barScheduleIdRef.current);
        } catch {
          // ignore
        }
        barScheduleIdRef.current = null;
      }
      clearScheduled();
    };
  }, [clearScheduled]);

  const state: StrumState = {
    isPlaying,
    currentBeat,
    currentBar,
    activeMood,
    pattern,
  };

  return {
    state,
    start,
    stop,
    toggle,
    nextPattern,
    prevPattern,
    setMood,
    setPatternNow: (p: StrumPattern) => setPattern(p),
  };
}

export default useStrumSync;
