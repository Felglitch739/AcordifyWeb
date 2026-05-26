export type StrumDirection = 'down' | 'up' | 'mute' | 'rest';

export interface StrumBeat {
  beat: number; // 1, 1.5, 2, 2.5 ...
  direction: StrumDirection;
  accent: boolean;
  palmMute: boolean;
}

export interface StrumPattern {
  id: string;
  mood: string;
  name: string;
  timeSignature: '4/4' | '3/4';
  beatsPerBar: number;
  beats: StrumBeat[];
  description: string;
  difficulty: 'básico' | 'intermedio' | 'avanzado';
}

export interface StrumState {
  isPlaying: boolean;
  currentBeat: number; // index into beats[]
  currentBar: number;
  activeMood: string;
  pattern: StrumPattern;
}

const patterns: StrumPattern[] = [
  {
    id: 'swing-melancolico',
    mood: 'Jazz Melancólico',
    name: 'Swing Melancólico',
    timeSignature: '4/4',
    beatsPerBar: 8,
    beats: [
      { beat: 1, direction: 'down', accent: true, palmMute: false },
      { beat: 1.5, direction: 'rest', accent: false, palmMute: false },
      { beat: 2, direction: 'rest', accent: false, palmMute: false },
      { beat: 2.5, direction: 'up', accent: false, palmMute: false },
      { beat: 3, direction: 'down', accent: false, palmMute: false },
      { beat: 3.5, direction: 'rest', accent: false, palmMute: false },
      { beat: 4, direction: 'mute', accent: false, palmMute: false },
      { beat: 4.5, direction: 'rest', accent: false, palmMute: false },
    ],
    description: 'Énfasis en tiempos débiles',
    difficulty: 'intermedio',
  },

  {
    id: 'drive-alternado',
    mood: 'Indie Rock Energético',
    name: 'Drive Alternado',
    timeSignature: '4/4',
    beatsPerBar: 8,
    beats: [
      { beat: 1, direction: 'down', accent: false, palmMute: true },
      { beat: 1.5, direction: 'up', accent: false, palmMute: false },
      { beat: 2, direction: 'down', accent: true, palmMute: false },
      { beat: 2.5, direction: 'up', accent: false, palmMute: false },
      { beat: 3, direction: 'down', accent: false, palmMute: true },
      { beat: 3.5, direction: 'up', accent: false, palmMute: false },
      { beat: 4, direction: 'down', accent: true, palmMute: false },
      { beat: 4.5, direction: 'up', accent: false, palmMute: false },
    ],
    description: 'Alternancia agresiva con backbeat marcado',
    difficulty: 'intermedio',
  },

  {
    id: 'arpegio-fluido',
    mood: 'Pop Acústico Relajado',
    name: 'Arpegio Fluido',
    timeSignature: '4/4',
    beatsPerBar: 8,
    beats: [
      { beat: 1, direction: 'down', accent: true, palmMute: false },
      { beat: 1.5, direction: 'up', accent: false, palmMute: false },
      { beat: 2, direction: 'rest', accent: false, palmMute: false },
      { beat: 2.5, direction: 'up', accent: false, palmMute: false },
      { beat: 3, direction: 'down', accent: false, palmMute: false },
      { beat: 3.5, direction: 'up', accent: false, palmMute: false },
      { beat: 4, direction: 'rest', accent: false, palmMute: false },
      { beat: 4.5, direction: 'up', accent: false, palmMute: false },
    ],
    description: 'Aireado y suave, énfasis en 1',
    difficulty: 'básico',
  },

  {
    id: 'pulso-lento',
    mood: 'Balada Oscura',
    name: 'Pulso Lento',
    timeSignature: '3/4',
    beatsPerBar: 3,
    beats: [
      { beat: 1, direction: 'down', accent: true, palmMute: false },
      { beat: 2, direction: 'up', accent: false, palmMute: false },
      { beat: 3, direction: 'up', accent: false, palmMute: false },
    ],
    description: 'Waltz melancólico, pulso sobre 1',
    difficulty: 'básico',
  },

  {
    id: 'fingerpicking-simulado',
    mood: 'Folk Íntimo',
    name: 'Fingerpicking Simulado',
    timeSignature: '4/4',
    beatsPerBar: 6,
    beats: [
      { beat: 1, direction: 'down', accent: true, palmMute: false },
      { beat: 1.5, direction: 'up', accent: false, palmMute: false },
      { beat: 2, direction: 'up', accent: false, palmMute: false },
      { beat: 3, direction: 'down', accent: false, palmMute: false },
      { beat: 3.5, direction: 'up', accent: false, palmMute: false },
      { beat: 4, direction: 'up', accent: false, palmMute: false },
    ],
    description: 'Imita fingerpicking con acento en nota baja',
    difficulty: 'intermedio',
  },
];

export function getPatternByMood(mood: string): StrumPattern {
  const found = patterns.find((p) => p.mood === mood);
  return found ?? patterns[0];
}

export function getAllPatterns(): StrumPattern[] {
  return patterns.slice();
}

export function getNextBeat(pattern: StrumPattern, currentIndex: number): number {
  return (currentIndex + 1) % pattern.beats.length;
}

export default patterns;
