import { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { transposeChord, getChordData } from '../utils';

export function useAudioEngine(
  chords: string[],
  transposeSteps: number,
  bpm: number,
  variations: number[],
  onBeatTrigger?: () => void
) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs for tracking mutable Tone.js nodes and state safely across renders
  const synthRef = useRef<Tone.PolySynth | null>(null);
  const filterRef = useRef<Tone.Filter | null>(null);
  const reverbRef = useRef<Tone.Reverb | null>(null);
  const sequenceRef = useRef<Tone.Sequence | null>(null);
  const beatRepeatIdRef = useRef<number | null>(null);

  const chordsNotesRef = useRef<string[][]>([]);
  const onBeatTriggerRef = useRef<(() => void) | undefined>(onBeatTrigger);

  // Sync latest chords, transpositions and variations using static chord dictionary
  useEffect(() => {
    chordsNotesRef.current = chords.map((chord, index) => {
      const transposed = transposeChord(chord, transposeSteps);
      const varIndex = variations[index] || 0;
      return getChordData(transposed, varIndex).midiNotes;
    });
  }, [chords, transposeSteps, variations]);

  // Sync latest beat trigger callback
  useEffect(() => {
    onBeatTriggerRef.current = onBeatTrigger;
  }, [onBeatTrigger]);

  // Sync latest BPM to Transport
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Lazy initializer to handle user interaction browser rules
  const initAudio = async () => {
    if (synthRef.current) return;

    // Unlock browser audio context
    await Tone.start();

    // 1. Subtle Tone.Reverb to simulate a studio room
    const reverb = new Tone.Reverb({
      decay: 1.2, // room size simulation
      wet: 0.1    // 10% room mix
    }).toDestination();
    reverbRef.current = reverb;

    // 2. Tone.Filter (Lowpass @ 2000Hz for warm acoustic wooden tone)
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: 2000,
      Q: 1
    }).connect(reverb);
    filterRef.current = filter;

    // 3. Guitar Plucking FMSynth Physical Modeling (using FMSynth inside PolySynth)
    const synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.01,
      modulationIndex: 12,
      oscillator: {
        type: 'triangle' // Carrier wave (gives warm, woody woodiness)
      },
      envelope: {
        attack: 0.003,  // Quick strike
        decay: 0.4,    // Natural string decay
        sustain: 0.1,   // Low sustain for plucked string
        release: 1.4    // Resonant ring out
      },
      modulation: {
        type: 'sine'
      },
      modulationEnvelope: {
        attack: 0.002,
        decay: 0.15,
        sustain: 0.05,
        release: 0.8
      }
    }).connect(filter);
    
    // Set background track volume
    synth.volume.value = -10;
    synthRef.current = synth;

    // 4. Sequence loop: plays 4 chords sequentially (each for 1 measure / 4 beats)
    const seq = new Tone.Sequence(
      (time, index) => {
        const notes = chordsNotesRef.current[index];
        if (notes && notes.length > 0) {
          // Strumming Effect: schedule each string pluck with a 25ms offset
          notes.forEach((note, noteIdx) => {
            const strumDelay = noteIdx * 0.025; // 25ms progressive pick/strum delay
            const noteTime = time + strumDelay;
            // sustain for slightly less than 1 measure to avoid overlap clicks
            synth.triggerAttackRelease(note, '1m - 0.1', noteTime);
          });
        }
      },
      [0, 1, 2, 3],
      '1m'
    );
    seq.start(0);
    sequenceRef.current = seq;

    // 5. Perfectly synced metronome beat scheduler
    const repeatId = Tone.Transport.scheduleRepeat((time) => {
      Tone.Draw.schedule(() => {
        if (onBeatTriggerRef.current) {
          onBeatTriggerRef.current();
        }
      }, time);
    }, '4n');
    beatRepeatIdRef.current = repeatId;
  };

  const startPlayback = async () => {
    try {
      await initAudio();
      Tone.Transport.start();
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to start audio engine playback:', err);
    }
  };

  const stopPlayback = () => {
    Tone.Transport.stop();
    setIsPlaying(false);
  };

  // Safe cleanup on component unmount
  useEffect(() => {
    return () => {
      // Stop transport timing
      Tone.Transport.stop();

      // Clear scheduled repeat beat triggers
      if (beatRepeatIdRef.current !== null) {
        Tone.Transport.clear(beatRepeatIdRef.current);
        beatRepeatIdRef.current = null;
      }

      // Dispose of nodes to prevent memory leaks
      if (sequenceRef.current) {
        sequenceRef.current.dispose();
        sequenceRef.current = null;
      }
      if (synthRef.current) {
        synthRef.current.dispose();
        synthRef.current = null;
      }
      if (filterRef.current) {
        filterRef.current.dispose();
        filterRef.current = null;
      }
      if (reverbRef.current) {
        reverbRef.current.dispose();
        reverbRef.current = null;
      }
    };
  }, []);

  return {
    isPlaying,
    startPlayback,
    stopPlayback
  };
}
