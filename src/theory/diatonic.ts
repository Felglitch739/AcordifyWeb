import { buildScaleNotes } from './notes';
import type { ChordQuality, DiatonicChord, HarmonicFunction, Mode } from './types';

interface DegreeSpec {
  roman: string;
  quality: ChordQuality;
  harmonicFunction: HarmonicFunction;
  functionLabel: string;
  explanation: string;
}

const MAJOR_DEGREE_SPECS: readonly DegreeSpec[] = [
  {
    roman: 'I',
    quality: 'maj',
    harmonicFunction: 'rest',
    functionLabel: 'Descanso',
    explanation: 'Es la casa de la canción; aquí todo se siente estable y resuelto.',
  },
  {
    roman: 'ii',
    quality: 'min',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Abre camino con un color suave y algo reflexivo antes de subir.',
  },
  {
    roman: 'iii',
    quality: 'min',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Aporta un matiz íntimo y nostálgico sin perder la calma del tono.',
  },
  {
    roman: 'IV',
    quality: 'maj',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Da aire y eleva la emoción; hace que la progresión respire.',
  },
  {
    roman: 'V',
    quality: 'maj',
    harmonicFunction: 'tension',
    functionLabel: 'Tensión',
    explanation: 'Empuja con fuerza hacia adelante y pide volver al acorde principal.',
  },
  {
    roman: 'vi',
    quality: 'min',
    harmonicFunction: 'return',
    functionLabel: 'Regreso',
    explanation: 'Añade profundidad emocional; suaviza el cierre o lo vuelve melancólico.',
  },
  {
    roman: 'vii°',
    quality: 'dim',
    harmonicFunction: 'tension',
    functionLabel: 'Tensión',
    explanation: 'Acorde tenso e inestable; funciona como puente corto hacia la tónica.',
  },
];

const MINOR_DEGREE_SPECS: readonly DegreeSpec[] = [
  {
    roman: 'i',
    quality: 'min',
    harmonicFunction: 'rest',
    functionLabel: 'Descanso',
    explanation: 'Centro emocional del tono menor; suena íntimo, serio y asentado.',
  },
  {
    roman: 'ii°',
    quality: 'dim',
    harmonicFunction: 'tension',
    functionLabel: 'Tensión',
    explanation: 'Crea suspenso oscuro; suele usarse de paso para preparar el cambio.',
  },
  {
    roman: 'III',
    quality: 'maj',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Abre una ventana de luz y alivio dentro de un clima menor.',
  },
  {
    roman: 'iv',
    quality: 'min',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Profundiza la nostalgia y hace crecer la historia con suavidad.',
  },
  {
    roman: 'v',
    quality: 'min',
    harmonicFunction: 'return',
    functionLabel: 'Regreso',
    explanation: 'Prepara la vuelta al acorde principal con un aire contenido y natural.',
  },
  {
    roman: 'VI',
    quality: 'maj',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Suena amplio y cinematográfico; levanta la intensidad emocional.',
  },
  {
    roman: 'VII',
    quality: 'maj',
    harmonicFunction: 'tension',
    functionLabel: 'Tensión',
    explanation: 'Da impulso épico o indie antes de aterrizar de nuevo en casa.',
  },
];

function formatChordSymbol(root: string, quality: ChordQuality): string {
  if (quality === 'maj') return root;
  if (quality === 'min') return `${root}m`;
  return `${root}dim`;
}

export function getDiatonicChords(root: string, mode: Mode): DiatonicChord[] {
  const scale = buildScaleNotes(root, mode);
  const specs = mode === 'major' ? MAJOR_DEGREE_SPECS : MINOR_DEGREE_SPECS;

  return specs.map((spec, index) => {
    const triadNotes: [string, string, string] = [
      scale[index],
      scale[(index + 2) % 7],
      scale[(index + 4) % 7],
    ];

    return {
      degree: index + 1,
      roman: spec.roman,
      symbol: formatChordSymbol(scale[index], spec.quality),
      root: scale[index],
      quality: spec.quality,
      notes: triadNotes,
      harmonicFunction: spec.harmonicFunction,
      functionLabel: spec.functionLabel,
      explanation: spec.explanation,
    };
  });
}
