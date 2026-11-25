import { CacheStorage, HttpStorage, Soundfont } from 'smplr';
import {
  createAcousticBodyBus,
  noteNameToFrequency,
  playWoodblockClick,
  synthesizePluckedStringBuffer,
  type AcousticBodyBus,
  type GuitarTone,
} from './karplusStrong';

export type StrumPatternId = 'folk' | 'arpeggio' | 'ballad';

export interface StrumPatternOption {
  id: StrumPatternId;
  label: string;
  shortHint: string;
}

export const STRUM_PATTERN_OPTIONS: readonly StrumPatternOption[] = [
  { id: 'folk', label: 'Rasgueo', shortHint: 'Groove acústico natural' },
  { id: 'arpeggio', label: 'Arpegio', shortHint: 'Fingerpicking suave cuerda a cuerda' },
  { id: 'ballad', label: 'Balada', shortHint: 'Rasgueo lento y abierto' },
] as const;

export interface StrumOptions {
  time?: number;
  direction?: 'down' | 'up';
  velocity?: number;
  duration?: number;
  spreadSec?: number;
  maxStrings?: number;
}

const GUITAR_NOTE_RANGE: number[] = Array.from({ length: 47 }, (_, idx) => 38 + idx); // D2..C6

const TONE_INSTRUMENTS: Readonly<Record<GuitarTone, 'acoustic_guitar_nylon' | 'acoustic_guitar_steel'>> = {
  nylon: 'acoustic_guitar_nylon',
  steel: 'acoustic_guitar_steel',
};

interface ActiveVoiceCleanup {
  stopAt: (when: number) => void;
}

export class AcousticGuitarEngine {
  private ctx: AudioContext | null = null;
  private bodyBus: AcousticBodyBus | null = null;
  private soundfonts: Partial<Record<GuitarTone, Soundfont>> = {};
  private soundfontPromises: Partial<Record<GuitarTone, Promise<void>>> = {};
  private loadedTones = new Set<GuitarTone>();
  private ksBufferCache = new Map<string, AudioBuffer>();
  private activePhysicalVoices = new Set<ActiveVoiceCleanup>();
  private onModeChange?: () => void;

  constructor(onModeChange?: () => void) {
    this.onModeChange = onModeChange;
  }

  getAudioContext(): AudioContext | null {
    return this.ctx;
  }

  getEngineMode(tone: GuitarTone): 'sampled' | 'physical' {
    return this.loadedTones.has(tone) ? 'sampled' : 'physical';
  }

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const webkitWin = window as Window & { webkitAudioContext?: typeof AudioContext };
      const AudioCtx = window.AudioContext || webkitWin.webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API no está disponible en este navegador.');
      }
      this.ctx = new AudioCtx();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    if (!this.bodyBus) {
      this.bodyBus = createAcousticBodyBus(this.ctx);
    }

    return this.ctx;
  }

  async preloadTone(tone: GuitarTone): Promise<void> {
    const ctx = await this.ensureContext();
    if (!this.bodyBus) return;

    if (this.loadedTones.has(tone)) return;
    if (this.soundfontPromises[tone]) {
      return this.soundfontPromises[tone];
    }

    const storage =
      typeof caches !== 'undefined' ? CacheStorage('acordify-guitar-v1') : HttpStorage;

    const sf = Soundfont(ctx, {
      instrument: TONE_INSTRUMENTS[tone],
      destination: this.bodyBus.input,
      storage,
      extraGain: 1.75,
      volume: 100,
      notesToLoad: {
        notes: GUITAR_NOTE_RANGE,
        fallback: 'nearest',
      },
    });

    this.soundfonts[tone] = sf;

    const loadPromise = sf.ready
      .then(() => {
        if (this.soundfonts[tone] === sf) {
          this.loadedTones.add(tone);
          this.onModeChange?.();
        }
      })
      .catch(() => {
        // Offline or CDN unreachable: fall back gracefully to Karplus-Strong physical model
      });

    this.soundfontPromises[tone] = loadPromise;
    return loadPromise;
  }

  private getPhysicalBuffer(ctx: AudioContext, note: string, tone: GuitarTone): AudioBuffer {
    const key = `${tone}:${note}:${ctx.sampleRate}`;
    const existing = this.ksBufferCache.get(key);
    if (existing) return existing;

    const freq = noteNameToFrequency(note);
    const samples = synthesizePluckedStringBuffer(ctx.sampleRate, freq, 2.8, tone, 0.92);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(new Float32Array(samples), 0);

    // Keep cache bounded cleanly
    if (this.ksBufferCache.size > 160) {
      this.ksBufferCache.clear();
    }
    this.ksBufferCache.set(key, buffer);
    return buffer;
  }

  private triggerPhysicalNote(
    ctx: AudioContext,
    note: string,
    tone: GuitarTone,
    when: number,
    velocity: number,
    duration: number,
  ): void {
    if (!this.bodyBus) return;

    let buffer: AudioBuffer;
    try {
      buffer = this.getPhysicalBuffer(ctx, note, tone);
    } catch {
      return;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;

    const gain = ctx.createGain();
    const peakGain = Math.max(0.05, Math.min(0.65, velocity * 0.42));
    const safeStart = Math.max(ctx.currentTime, when);
    const releaseEnd = safeStart + Math.max(0.15, Math.min(2.6, duration));

    gain.gain.setValueAtTime(peakGain, safeStart);
    gain.gain.setValueAtTime(peakGain * 0.85, Math.max(safeStart + 0.04, releaseEnd - 0.14));
    gain.gain.exponentialRampToValueAtTime(0.0005, releaseEnd);

    src.connect(gain);
    gain.connect(this.bodyBus.input);

    const cleanupHandle: ActiveVoiceCleanup = {
      stopAt: (stopTime: number) => {
        try {
          const safeStop = Math.max(ctx.currentTime, stopTime);
          gain.gain.cancelScheduledValues(safeStop);
          gain.gain.setValueAtTime(Math.max(0.001, gain.gain.value), safeStop);
          gain.gain.exponentialRampToValueAtTime(0.0001, safeStop + 0.025);
          src.stop(safeStop + 0.03);
        } catch {
          // Ignore already stopped source
        }
      },
    };

    this.activePhysicalVoices.add(cleanupHandle);
    src.onended = () => {
      this.activePhysicalVoices.delete(cleanupHandle);
      try {
        src.disconnect();
        gain.disconnect();
      } catch {
        // Ignore cleanup errors
      }
    };

    src.start(safeStart);
    src.stop(releaseEnd + 0.03);
  }

  pluckNote(
    note: string,
    tone: GuitarTone,
    time?: number,
    velocity = 0.82,
    duration = 1.6,
  ): void {
    const ctx = this.ctx;
    if (!ctx || !this.bodyBus) return;

    const safeTime = Math.max(ctx.currentTime, time ?? ctx.currentTime);
    const clampedVel = Math.max(0.08, Math.min(1, velocity));
    const sf = this.soundfonts[tone];

    if (sf && this.loadedTones.has(tone)) {
      const midiVelocity = Math.max(12, Math.min(127, Math.round(clampedVel * 116)));
      sf.start({
        note,
        time: safeTime,
        velocity: midiVelocity,
        duration: Math.max(0.14, duration),
        ampRelease: tone === 'nylon' ? 0.34 : 0.28,
      });
      return;
    }

    this.triggerPhysicalNote(ctx, note, tone, safeTime, clampedVel, duration);
  }

  strumChord(
    notes: readonly string[],
    tone: GuitarTone,
    options: StrumOptions = {},
  ): void {
    if (!this.ctx || notes.length === 0) return;

    const direction = options.direction ?? 'down';
    const baseTime = Math.max(this.ctx.currentTime, options.time ?? this.ctx.currentTime);
    const baseVel = options.velocity ?? (direction === 'down' ? 0.86 : 0.62);
    const duration = options.duration ?? 1.5;
    const spreadSec = options.spreadSec ?? (direction === 'down' ? 0.022 : 0.015);

    let orderedNotes: string[];
    if (direction === 'down') {
      orderedNotes = options.maxStrings ? notes.slice(0, options.maxStrings) : [...notes];
    } else {
      const topStrings = options.maxStrings ? notes.slice(-options.maxStrings) : notes;
      orderedNotes = [...topStrings].reverse();
    }

    orderedNotes.forEach((note, idx) => {
      // Tiny organic timing and velocity curve across strings
      const jitter = ((idx % 3) - 1) * 0.0018;
      const offset = Math.max(0, idx * spreadSec + jitter);
      const stringCurve =
        direction === 'down'
          ? 1.0 - idx * 0.04 // Slight bass anchor warmth on downstroke
          : 0.88 - idx * 0.05; // Lighter top-string brush on upstroke

      this.pluckNote(
        note,
        tone,
        baseTime + offset,
        Math.max(0.2, Math.min(1, baseVel * stringCurve)),
        duration,
      );
    });
  }

  playPatternStep(
    notes: readonly string[],
    tone: GuitarTone,
    pattern: StrumPatternId,
    eighthStep: number,
    time: number,
    barDurationSec: number,
  ): void {
    if (notes.length === 0) return;
    const step = ((eighthStep % 8) + 8) % 8;

    if (pattern === 'ballad') {
      if (step === 0) {
        this.strumChord(notes, tone, {
          time,
          direction: 'down',
          velocity: 0.88,
          spreadSec: 0.034,
          duration: Math.max(0.6, barDurationSec * 0.96),
        });
      } else if (step === 4) {
        this.strumChord(notes, tone, {
          time,
          direction: 'down',
          velocity: 0.52,
          spreadSec: 0.026,
          maxStrings: Math.min(4, notes.length),
          duration: Math.max(0.4, barDurationSec * 0.48),
        });
      }
      return;
    }

    if (pattern === 'arpeggio') {
      const bassIdx = 0;
      const mid1Idx = Math.max(0, notes.length - 3);
      const mid2Idx = Math.max(0, notes.length - 2);
      const highIdx = notes.length - 1;
      const seq = [bassIdx, mid1Idx, mid2Idx, highIdx, mid2Idx, mid1Idx, highIdx, mid2Idx];
      const vels = [0.88, 0.66, 0.70, 0.75, 0.64, 0.67, 0.73, 0.62];

      const pickedNote = notes[seq[step]];
      const vel = vels[step];
      if (pickedNote) {
        this.pluckNote(pickedNote, tone, time, vel, Math.max(0.45, barDurationSec * 0.85));
      }
      return;
    }

    // Default 'folk': classic natural acoustic groove (D · D U · U D U on steps 0,2,3,5,6,7)
    switch (step) {
      case 0:
        this.strumChord(notes, tone, {
          time,
          direction: 'down',
          velocity: 0.90,
          spreadSec: 0.024,
          duration: Math.max(0.4, barDurationSec * 0.56),
        });
        break;
      case 2:
        this.strumChord(notes, tone, {
          time,
          direction: 'down',
          velocity: 0.76,
          spreadSec: 0.020,
          duration: Math.max(0.28, barDurationSec * 0.35),
        });
        break;
      case 3:
        this.strumChord(notes, tone, {
          time,
          direction: 'up',
          velocity: 0.58,
          spreadSec: 0.014,
          maxStrings: Math.min(4, notes.length),
          duration: Math.max(0.22, barDurationSec * 0.25),
        });
        break;
      case 5:
        this.strumChord(notes, tone, {
          time,
          direction: 'up',
          velocity: 0.62,
          spreadSec: 0.015,
          maxStrings: Math.min(4, notes.length),
          duration: Math.max(0.24, barDurationSec * 0.30),
        });
        break;
      case 6:
        this.strumChord(notes, tone, {
          time,
          direction: 'down',
          velocity: 0.78,
          spreadSec: 0.020,
          duration: Math.max(0.25, barDurationSec * 0.30),
        });
        break;
      case 7:
        this.strumChord(notes, tone, {
          time,
          direction: 'up',
          velocity: 0.54,
          spreadSec: 0.014,
          maxStrings: Math.min(3, notes.length),
          duration: Math.max(0.20, barDurationSec * 0.22),
        });
        break;
      default:
        break;
    }
  }

  playMetronomeClick(time: number, isDownbeat: boolean): void {
    if (!this.ctx) return;
    playWoodblockClick(this.ctx, time, isDownbeat);
  }

  stopAll(): void {
    const now = this.ctx?.currentTime ?? 0;

    Object.values(this.soundfonts).forEach((sf) => {
      try {
        sf?.stop();
      } catch {
        // Ignore stop errors
      }
    });

    this.activePhysicalVoices.forEach((voice) => voice.stopAt(now));
    this.activePhysicalVoices.clear();
  }

  dispose(): void {
    this.stopAll();
    Object.values(this.soundfonts).forEach((sf) => {
      try {
        sf?.dispose();
      } catch {
        // Ignore dispose errors
      }
    });
    this.soundfonts = {};
    this.soundfontPromises = {};
    this.loadedTones.clear();
    this.ksBufferCache.clear();

    this.bodyBus?.dispose();
    this.bodyBus = null;

    if (this.ctx) {
      void this.ctx.close().catch(() => undefined);
      this.ctx = null;
    }
  }
}
