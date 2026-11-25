export type GuitarTone = 'nylon' | 'steel';

const NOTE_NAME_SEMITONES: Readonly<Record<string, number>> = {
  C: 0,
  'B#': 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  'E#': 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

/**
 * Converts a scientific pitch note name (e.g. "E2", "F#3", "Bb3", "A4") to Hz.
 */
export function noteNameToFrequency(noteName: string): number {
  const trimmed = noteName.trim();
  const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid note name: "${noteName}"`);
  }

  const letter = match[1].toUpperCase();
  const accidental = match[2];
  const octave = Number.parseInt(match[3], 10);
  const semitone = NOTE_NAME_SEMITONES[`${letter}${accidental}`];

  if (semitone === undefined || !Number.isFinite(octave)) {
    throw new Error(`Unsupported pitch name: "${noteName}"`);
  }

  const midi = (octave + 1) * 12 + semitone;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Deterministic PRNG (Mulberry32) so synthesized buffers are clean and reproducible.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Synthesizes a realistic acoustic plucked guitar string via Extended Karplus-Strong
 * physical modeling:
 * - Soundhole pluck-position comb filter (~1/5 of string length) for woody warmth
 * - Fractional delay linear interpolation for accurate intonation across frets
 * - One-pole string damping inside the feedback loop (nylon vs phosphor-bronze steel)
 */
export function synthesizePluckedStringBuffer(
  sampleRate: number,
  frequency: number,
  durationSec: number,
  tone: GuitarTone,
  velocity = 0.85,
): Float32Array {
  const safeRate = Math.max(8000, Math.floor(sampleRate));
  const safeFreq = Math.max(55, Math.min(2400, frequency));
  const safeDur = Math.max(0.15, Math.min(6, durationSec));
  const totalSamples = Math.max(1, Math.round(safeRate * safeDur));
  const output = new Float32Array(totalSamples);

  const exactPeriod = safeRate / safeFreq;
  // Delay buffer size accounts for the 0.5-sample average group delay of loop lowpass
  const loopDelay = Math.max(2, exactPeriod - (tone === 'nylon' ? 0.55 : 0.45));
  const intDelay = Math.floor(loopDelay);
  const fracDelay = loopDelay - intDelay;

  const delayLength = Math.max(4, intDelay + 2);
  const delayLine = new Float32Array(delayLength);
  const rand = createSeededRandom(Math.round(safeFreq * 100) + (tone === 'steel' ? 7919 : 104729));

  // Shaped pink-ish / triangular excitation noise
  const rawNoise = new Float32Array(delayLength);
  let runningLp = 0;
  const excBrightness = tone === 'nylon' ? 0.34 : 0.56;
  for (let i = 0; i < delayLength; i++) {
    const white = rand() * 2 - 1;
    runningLp = runningLp * (1 - excBrightness) + white * excBrightness;
    // Soften high-frequency pick transient
    const env = Math.sin((Math.PI * (i + 1)) / (delayLength + 1));
    rawNoise[i] = runningLp * (0.45 + 0.55 * env);
  }

  // Pluck position comb filter (~1/5 of string length = warm soundhole pluck)
  const pickPos = Math.max(1, Math.round(delayLength * (tone === 'nylon' ? 0.22 : 0.17)));
  for (let i = 0; i < delayLength; i++) {
    const delayedPick = i >= pickPos ? rawNoise[i - pickPos] : 0;
    delayLine[i] = rawNoise[i] - delayedPick * 0.72;
  }

  // Tone-dependent physical parameters
  // Lower bass notes naturally ring slightly longer than high treble strings
  const pitchDecayComp = Math.min(0.0012, (220 / safeFreq) * 0.00028);
  const decayFactor =
    (tone === 'nylon' ? 0.9962 : 0.9974) + pitchDecayComp * 0.5;
  const clampedDecay = Math.min(0.9988, decayFactor);
  // One-pole lowpass blend inside feedback loop (lower = warmer/more damped highs)
  const dampBlend = tone === 'nylon' ? 0.38 : 0.54;

  let readIndex = 0;
  let prevFiltered = 0;

  const attackSamples = Math.max(1, Math.round(safeRate * 0.0022));
  const fadeOutSamples = Math.max(1, Math.round(safeRate * 0.045));
  const fadeStart = Math.max(0, totalSamples - fadeOutSamples);

  for (let i = 0; i < totalSamples; i++) {
    const idx0 = (readIndex - intDelay + delayLength) % delayLength;
    const idx1 = (idx0 - 1 + delayLength) % delayLength;
    // Linear fractional-delay interpolation
    const interpolated = delayLine[idx0] * (1 - fracDelay) + delayLine[idx1] * fracDelay;

    // One-pole lowpass damping in string feedback loop
    const damped = prevFiltered * (1 - dampBlend) + interpolated * dampBlend;
    prevFiltered = damped;

    delayLine[readIndex] = damped * clampedDecay;
    readIndex = (readIndex + 1) % delayLength;

    let sample = interpolated;
    if (i < attackSamples) {
      sample *= i / attackSamples;
    } else if (i >= fadeStart) {
      sample *= Math.max(0, (totalSamples - i) / fadeOutSamples);
    }
    output[i] = sample;
  }

  // Peak normalize safely within [-0.82, 0.82] * velocity
  let maxAbs = 0;
  for (let i = 0; i < totalSamples; i++) {
    const abs = Math.abs(output[i]);
    if (abs > maxAbs) maxAbs = abs;
  }

  const clampedVelocity = Math.max(0.1, Math.min(1, velocity));
  const targetPeak = 0.82 * clampedVelocity;
  if (maxAbs > 1e-6) {
    const scale = targetPeak / maxAbs;
    for (let i = 0; i < totalSamples; i++) {
      output[i] *= scale;
    }
  }

  return output;
}

function createWoodenRoomImpulse(ctx: AudioContext): AudioBuffer {
  const durationSec = 0.72;
  const length = Math.max(1, Math.round(ctx.sampleRate * durationSec));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const rand = createSeededRandom(424242);

  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // Smooth wooden-studio room envelope (early reflections + warm decay)
      const envelope = Math.pow(1 - t, 3.2) * (i < 400 ? i / 400 : 1);
      const white = rand() * 2 - 1;
      lp = lp * 0.78 + white * 0.22;
      data[i] = lp * envelope * 0.45;
    }
  }
  return impulse;
}

export interface AcousticBodyBus {
  input: GainNode;
  dispose: () => void;
}

/**
 * Creates a warm wooden acoustic guitar body resonance & small studio room bus.
 * Shapes plucked notes with spruce top-plate warmth, Helmholtz air resonance,
 * gentle high-frequency taming, subtle wood room ambience, and soft limiting.
 */
export function createAcousticBodyBus(ctx: AudioContext): AcousticBodyBus {
  const input = ctx.createGain();
  input.gain.value = 1.0;

  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 75;
  hp.Q.value = 0.7;

  // Helmholtz soundhole air resonance
  const airResonance = ctx.createBiquadFilter();
  airResonance.type = 'peaking';
  airResonance.frequency.value = 112;
  airResonance.Q.value = 2.6;
  airResonance.gain.value = 3.2;

  // Spruce soundboard body warmth
  const woodResonance = ctx.createBiquadFilter();
  woodResonance.type = 'peaking';
  woodResonance.frequency.value = 240;
  woodResonance.Q.value = 2.1;
  woodResonance.gain.value = 2.2;

  // Tame harsh digital transients above 3.8 kHz
  const highTame = ctx.createBiquadFilter();
  highTame.type = 'highshelf';
  highTame.frequency.value = 3800;
  highTame.gain.value = -2.0;

  const dryGain = ctx.createGain();
  dryGain.gain.value = 0.88;

  const wetGain = ctx.createGain();
  wetGain.gain.value = 0.16;

  const convolver = ctx.createConvolver();
  convolver.buffer = createWoodenRoomImpulse(ctx);

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 8;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.008;
  compressor.release.value = 0.18;

  const masterOut = ctx.createGain();
  masterOut.gain.value = 0.92;

  input.connect(hp);
  hp.connect(airResonance);
  airResonance.connect(woodResonance);
  woodResonance.connect(highTame);

  highTame.connect(dryGain);
  highTame.connect(convolver);
  convolver.connect(wetGain);

  dryGain.connect(compressor);
  wetGain.connect(compressor);
  compressor.connect(masterOut);
  masterOut.connect(ctx.destination);

  return {
    input,
    dispose: () => {
      try {
        input.disconnect();
        hp.disconnect();
        airResonance.disconnect();
        woodResonance.disconnect();
        highTame.disconnect();
        dryGain.disconnect();
        convolver.disconnect();
        wetGain.disconnect();
        compressor.disconnect();
        masterOut.disconnect();
      } catch {
        // Ignore teardown errors when context already closed
      }
    },
  };
}

let cachedNoiseBuffer: AudioBuffer | null = null;
let cachedNoiseRate = 0;

function getNoiseBurstBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer && cachedNoiseRate === ctx.sampleRate) {
    return cachedNoiseBuffer;
  }
  const length = Math.max(1, Math.round(ctx.sampleRate * 0.025));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const rand = createSeededRandom(918273);
  for (let i = 0; i < length; i++) {
    data[i] = (rand() * 2 - 1) * Math.exp((-6 * i) / length);
  }
  cachedNoiseBuffer = buffer;
  cachedNoiseRate = ctx.sampleRate;
  return buffer;
}

/**
 * Plays a warm organic wooden clave/woodblock metronome click instead of an electronic beep.
 */
export function playWoodblockClick(
  ctx: AudioContext,
  time: number,
  isDownbeat: boolean,
): void {
  const safeTime = Math.max(ctx.currentTime, time);

  // Wooden resonant body pitch sweep
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  if (isDownbeat) {
    osc.frequency.setValueAtTime(1180, safeTime);
    osc.frequency.exponentialRampToValueAtTime(860, safeTime + 0.032);
  } else {
    osc.frequency.setValueAtTime(840, safeTime);
    osc.frequency.exponentialRampToValueAtTime(640, safeTime + 0.028);
  }

  const peakGain = isDownbeat ? 0.22 : 0.14;
  gain.gain.setValueAtTime(0.0001, safeTime);
  gain.gain.linearRampToValueAtTime(peakGain, safeTime + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, safeTime + 0.042);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(safeTime);
  osc.stop(safeTime + 0.05);

  // Subtle woody stick attack transient
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = getNoiseBurstBuffer(ctx);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = isDownbeat ? 2200 : 1750;
  bp.Q.value = 3.2;

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(isDownbeat ? 0.09 : 0.055, safeTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, safeTime + 0.02);

  noiseSrc.connect(bp);
  bp.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noiseSrc.start(safeTime);
  noiseSrc.stop(safeTime + 0.025);
}
