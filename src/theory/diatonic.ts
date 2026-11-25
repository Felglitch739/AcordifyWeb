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
    explanation: 'Acorde principal del tono; aquí descansa y se siente resuelta la vuelta.',
  },
  {
    roman: 'ii',
    quality: 'min',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Acorde menor de paso que prepara la llegada al acorde de tensión.',
  },
  {
    roman: 'iii',
    quality: 'min',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Da un giro suave sin salirte de la escala del tono.',
  },
  {
    roman: 'IV',
    quality: 'maj',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Abre espacio y mueve la frase antes del cambio o del cierre.',
  },
  {
    roman: 'V',
    quality: 'maj',
    harmonicFunction: 'tension',
    functionLabel: 'Tensión',
    explanation: 'Empuja la frase hacia delante y pide volver al acorde principal.',
  },
  {
    roman: 'vi',
    quality: 'min',
    harmonicFunction: 'return',
    functionLabel: 'Regreso',
    explanation: 'Acompaña el giro hacia menor y suaviza la caída de la vuelta.',
  },
  {
    roman: 'vii°',
    quality: 'dim',
    harmonicFunction: 'tension',
    functionLabel: 'Tensión',
    explanation: 'Acorde tenso de paso; funciona como puente corto hacia el inicio.',
  },
];

const MINOR_DEGREE_SPECS: readonly DegreeSpec[] = [
  {
    roman: 'i',
    quality: 'min',
    harmonicFunction: 'rest',
    functionLabel: 'Descanso',
    explanation: 'Acorde principal del tono menor; marca el centro de reposo.',
  },
  {
    roman: 'ii°',
    quality: 'dim',
    harmonicFunction: 'tension',
    functionLabel: 'Tensión',
    explanation: 'Puente corto y tenso que empuja hacia el siguiente acorde.',
  },
  {
    roman: 'III',
    quality: 'maj',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Acorde mayor relativo que aclara y abre el compás dentro del tono menor.',
  },
  {
    roman: 'iv',
    quality: 'min',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Avanza un paso en menor y sostiene el pulso de la progresión.',
  },
  {
    roman: 'v',
    quality: 'min',
    harmonicFunction: 'return',
    functionLabel: 'Regreso',
    explanation: 'Prepara la vuelta al acorde principal con un paso suave.',
  },
  {
    roman: 'VI',
    quality: 'maj',
    harmonicFunction: 'movement',
    functionLabel: 'Movimiento',
    explanation: 'Acorde mayor amplio que da contraste antes de cerrar la vuelta.',
  },
  {
    roman: 'VII',
    quality: 'maj',
    harmonicFunction: 'tension',
    functionLabel: 'Tensión',
    explanation: 'Marca el impulso abierto antes de regresar al acorde i.',
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
