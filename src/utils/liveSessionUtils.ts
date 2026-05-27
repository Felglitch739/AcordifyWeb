export interface ChordSlot {
  index: number;
  chord: string;
  durationBars: 1 | 2;
  startBeat: number;
  endBeat: number;
}

export interface LiveSessionConfig {
  chords: string[];
  durationPerChord: Record<number, 1 | 2>;
  bpm: number;
  timeSignature: 4;
}

export interface LiveSessionState {
  isLive: boolean;
  isPlaying: boolean;
  activeChordIndex: number;
  activeChord: string;
  currentBar: number;
  currentBeat: number;
  totalBars: number;
  chordSlots: ChordSlot[];
}

const BEATS_PER_BAR = 4;

const EMPTY_SLOT: ChordSlot = {
  index: 0,
  chord: '',
  durationBars: 1,
  startBeat: 0,
  endBeat: 3,
};

function positiveModulo(value: number, divisor: number): number {
  if (divisor <= 0) {
    return 0;
  }

  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

function getSlotDurationBeats(durationBars: 1 | 2, timeSignature: 4): number {
  return durationBars * timeSignature;
}

export function buildChordSchedule(config: LiveSessionConfig): ChordSlot[] {
  if (config.chords.length === 0) {
    return [];
  }

  const slots: ChordSlot[] = [];
  let cursorBeat = 0;

  config.chords.forEach((chord, index) => {
    const durationBars = config.durationPerChord[index] ?? 1;
    const durationBeats = getSlotDurationBeats(durationBars, config.timeSignature);

    slots.push({
      index,
      chord,
      durationBars,
      startBeat: cursorBeat,
      endBeat: cursorBeat + durationBeats - 1,
    });

    cursorBeat += durationBeats;
  });

  return slots;
}

export function getTotalBeats(slots: ChordSlot[]): number {
  if (slots.length === 0) {
    return 0;
  }

  return slots[slots.length - 1].endBeat + 1;
}

export function getActiveChordAtBeat(beat: number, slots: ChordSlot[]): ChordSlot {
  if (slots.length === 0) {
    return EMPTY_SLOT;
  }

  const totalBeats = getTotalBeats(slots);
  const normalizedBeat = positiveModulo(beat, totalBeats);

  const activeSlot = slots.find((slot) => normalizedBeat >= slot.startBeat && normalizedBeat < slot.endBeat + 1);

  return activeSlot ?? slots[0] ?? EMPTY_SLOT;
}

export function beatToBarAndPosition(
  beat: number,
  totalBeats: number,
): { bar: number; beatInBar: number } {
  if (totalBeats <= 0) {
    return { bar: 1, beatInBar: 1 };
  }

  const normalizedBeat = positiveModulo(beat, totalBeats);
  const bar = Math.floor(normalizedBeat / BEATS_PER_BAR) + 1;
  const beatInBar = Math.floor(normalizedBeat % BEATS_PER_BAR) + 1;

  return { bar, beatInBar };
}