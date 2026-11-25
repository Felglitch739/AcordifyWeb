import { getDiatonicChords } from './diatonic';
import { buildScaleNotes } from './notes';
import type {
  DiatonicChord,
  GeneratedProgression,
  Mode,
  MoodId,
  MoodOption,
  ProgressionSlot,
  ReplacementSuggestion,
} from './types';

export const MOOD_OPTIONS: readonly MoodOption[] = [
  {
    id: 'calm',
    label: 'Tranquilo',
    description: 'Tempo pausado con acordes que dejan espacio al rasgueo.',
    defaultBpm: 76,
  },
  {
    id: 'melancholic',
    label: 'Melancólico',
    description: 'Giros menores suaves para tocar despacio.',
    defaultBpm: 72,
  },
  {
    id: 'nostalgic',
    label: 'Nostálgico',
    description: 'Vuelta clásica de canción fácil de cantar.',
    defaultBpm: 84,
  },
  {
    id: 'bright',
    label: 'Luminoso',
    description: 'Progresión abierta y clara para rasgueo constante.',
    defaultBpm: 102,
  },
  {
    id: 'energetic',
    label: 'Enérgico',
    description: 'Pulso más rápido con cambios marcados cada compás.',
    defaultBpm: 118,
  },
] as const;

interface ProgressionTemplate {
  name: string;
  mode: Mode;
  degrees: readonly [number, number, number, number];
  moods: readonly MoodId[];
  roleHints: readonly [string, string, string, string];
}

const PROGRESSION_TEMPLATES: readonly ProgressionTemplate[] = [
  // Major templates
  {
    name: 'Vuelta abierta',
    mode: 'major',
    degrees: [1, 5, 6, 4],
    moods: ['bright', 'nostalgic', 'energetic'],
    roleHints: [
      'Descanso: fija el tono desde el primer compás.',
      'Tensión: levanta la frase para cambiar de altura.',
      'Regreso: pasa por menor para variar la caída.',
      'Movimiento: enlaza sin corte para repetir la vuelta.',
    ],
  },
  {
    name: 'Balada cálida',
    mode: 'major',
    degrees: [1, 6, 4, 5],
    moods: ['calm', 'nostalgic', 'melancholic'],
    roleHints: [
      'Descanso: establece el tono con un pulso estable.',
      'Regreso: baja al acorde menor manteniendo el mismo color.',
      'Movimiento: abre el recorrido antes del final.',
      'Tensión: pide volver al primer acorde al repetir.',
    ],
  },
  {
    name: 'Entrada en menor',
    mode: 'major',
    degrees: [6, 4, 1, 5],
    moods: ['melancholic', 'nostalgic', 'calm'],
    roleHints: [
      'Regreso: empieza en el relativo menor en lugar de la tónica.',
      'Movimiento: avanza con un paso claro hacia el centro.',
      'Descanso: resuelve en el acorde principal a mitad de vuelta.',
      'Tensión: empuja la frase para volver a empezar.',
    ],
  },
  {
    name: 'Acústica directa',
    mode: 'major',
    degrees: [1, 4, 5, 4],
    moods: ['bright', 'energetic', 'calm'],
    roleHints: [
      'Descanso: base directa para marcar el ritmo desde el inicio.',
      'Movimiento: sube un paso con acordes abiertos.',
      'Tensión: punto más alto de la vuelta en el tercer compás.',
      'Movimiento: vuelve al IV para cerrar el ciclo con calma.',
    ],
  },
  {
    name: 'Folk en cuatro tiempos',
    mode: 'major',
    degrees: [1, 4, 6, 5],
    moods: ['calm', 'bright', 'nostalgic'],
    roleHints: [
      'Descanso: acorde principal para entrar sin prisa.',
      'Movimiento: da espacio a la melodía en el segundo compás.',
      'Regreso: cambia a menor antes del empuje final.',
      'Tensión: prepara el regreso limpio al acorde I.',
    ],
  },
  {
    name: 'Paso ascendente',
    mode: 'major',
    degrees: [4, 1, 5, 6],
    moods: ['energetic', 'bright', 'melancholic'],
    roleHints: [
      'Movimiento: entra en movimiento desde el primer tiempo.',
      'Descanso: asienta la frase en el segundo compás.',
      'Tensión: sube un punto antes del acorde final.',
      'Regreso: cierra en menor para enlazar de nuevo con el IV.',
    ],
  },

  // Minor templates
  {
    name: 'Vuelta directa en menor',
    mode: 'minor',
    degrees: [1, 6, 3, 7],
    moods: ['energetic', 'nostalgic', 'melancholic'],
    roleHints: [
      'Descanso: fija la raíz menor como centro de la vuelta.',
      'Movimiento: cambia a un acorde mayor amplio y claro.',
      'Movimiento: pasa por el relativo mayor a mitad del ciclo.',
      'Tensión: da el último impulso antes de regresar al acorde i.',
    ],
  },
  {
    name: 'Cadencia menor suave',
    mode: 'minor',
    degrees: [1, 4, 7, 3],
    moods: ['melancholic', 'calm', 'nostalgic'],
    roleHints: [
      'Descanso: acorde principal para centrar el oído en menor.',
      'Movimiento: camina en menor manteniendo el ritmo contenido.',
      'Tensión: prepara el salto hacia el acorde mayor relativo.',
      'Movimiento: resuelve claro en el III para volver a empezar.',
    ],
  },
  {
    name: 'Pulso rock acústico',
    mode: 'minor',
    degrees: [1, 7, 6, 7],
    moods: ['energetic', 'melancholic', 'bright'],
    roleHints: [
      'Descanso: fija la raíz menor como punto de apoyo.',
      'Tensión: baja un tono en acorde mayor con rasgueo firme.',
      'Movimiento: pasa por el sexto grado antes de volver a subir.',
      'Tensión: repite el VII para lanzarse otra vez al acorde i.',
    ],
  },
  {
    name: 'Cuatro pasos en calma',
    mode: 'minor',
    degrees: [1, 4, 5, 1],
    moods: ['calm', 'melancholic'],
    roleHints: [
      'Descanso: presenta el tono menor desde el primer compás.',
      'Movimiento: sostiene el pulso sin saltos bruscos.',
      'Regreso: prepara el cierre suave en el quinto grado menor.',
      'Descanso: vuelve al acorde principal para cerrar la vuelta.',
    ],
  },
  {
    name: 'Giro abierto en menor',
    mode: 'minor',
    degrees: [6, 7, 1, 3],
    moods: ['bright', 'nostalgic', 'energetic'],
    roleHints: [
      'Movimiento: arranca en mayor para abrir el compás.',
      'Tensión: sube un paso rumbo al acorde principal menor.',
      'Descanso: aterriza en el acorde i en el tercer compás.',
      'Movimiento: cierra hacia el III para reiniciar el loop.',
    ],
  },
  {
    name: 'Caminata acústica',
    mode: 'minor',
    degrees: [1, 3, 7, 4],
    moods: ['calm', 'nostalgic', 'bright'],
    roleHints: [
      'Descanso: punto de partida tranquilo sobre la raíz menor.',
      'Movimiento: aclara el compás con el relativo mayor.',
      'Tensión: mantiene vivo el avance rumbo al cuarto compás.',
      'Movimiento: cierra en iv para volver al acorde inicial.',
    ],
  },
];

function getMoodOption(mood: MoodId): MoodOption {
  return MOOD_OPTIONS.find((item) => item.id === mood) ?? MOOD_OPTIONS[0];
}

function defaultRoleHintForSlot(chord: DiatonicChord, slotIndex: number): string {
  if (slotIndex === 0) {
    return `${chord.functionLabel}: marca el punto de partida de la vuelta.`;
  }
  if (slotIndex === 3) {
    return `${chord.functionLabel}: prepara el enlace para repetir el loop.`;
  }
  return `${chord.functionLabel}: ${chord.explanation}`;
}

function clampDegree(degree: number): number {
  if (!Number.isFinite(degree)) return 1;
  const rounded = Math.round(degree);
  if (rounded < 1) return 1;
  if (rounded > 7) return 7;
  return rounded;
}

export function buildProgressionFromDegrees(
  keyRoot: string,
  mode: Mode,
  mood: MoodId,
  degrees: readonly number[],
  templateName = 'Progresión ajustada',
  roleHints?: readonly string[],
): GeneratedProgression {
  const diatonic = getDiatonicChords(keyRoot, mode);
  const scaleNotes = buildScaleNotes(keyRoot, mode);
  const moodOption = getMoodOption(mood);
  const safeDegrees = degrees.slice(0, 4).map(clampDegree);

  while (safeDegrees.length < 4) {
    safeDegrees.push(1);
  }

  const slots: ProgressionSlot[] = safeDegrees.map((degree, slotIndex) => {
    const chord = diatonic[degree - 1] ?? diatonic[0];
    return {
      slotIndex,
      chord,
      roleHint: roleHints?.[slotIndex] ?? defaultRoleHintForSlot(chord, slotIndex),
    };
  });

  return {
    keyRoot,
    mode,
    mood,
    templateName,
    degrees: safeDegrees,
    slots,
    scaleNotes,
    suggestedBpm: moodOption.defaultBpm,
  };
}

export function generateProgression(
  keyRoot: string,
  mode: Mode,
  mood: MoodId,
  variantIndex = 0,
): GeneratedProgression {
  const modeTemplates = PROGRESSION_TEMPLATES.filter((t) => t.mode === mode);
  const moodMatches = modeTemplates.filter((t) => t.moods.includes(mood));
  const pool = moodMatches.length > 0 ? moodMatches : modeTemplates;

  const safeIndex = ((variantIndex % pool.length) + pool.length) % pool.length;
  const selected = pool[safeIndex];

  return buildProgressionFromDegrees(
    keyRoot,
    mode,
    mood,
    selected.degrees,
    selected.name,
    selected.roleHints,
  );
}

function describeReplacementMoodEffect(
  candidate: DiatonicChord,
  mode: Mode,
  slotIndex: number,
): string {
  if (candidate.quality === 'dim') {
    return 'Añade tensión corta de paso; úsalo como puente hacia el siguiente acorde.';
  }

  if (mode === 'major') {
    switch (candidate.degree) {
      case 1:
        return slotIndex === 3
          ? 'Cierra la vuelta en el acorde principal para darle un final estable.'
          : 'Mantiene el compás en descanso con mucha estabilidad.';
      case 2:
        return 'Introduce un acorde menor suave que prepara bien la tensión del V.';
      case 3:
        return 'Cambia hacia un color menor discreto sin salirte de la escala.';
      case 4:
        return 'Abre la progresión con un acorde mayor amplio y fácil de cantar.';
      case 5:
        return 'Agrega tensión clara para pedir el regreso al acorde principal.';
      case 6:
        return 'Cambia el paso a menor y vuelve la vuelta más íntima.';
      default:
        return candidate.explanation;
    }
  }

  switch (candidate.degree) {
    case 1:
      return 'Vuelve al acorde principal menor para asentar el compás.';
    case 3:
      return 'Aclara el compás con el acorde mayor relativo del tono.';
    case 4:
      return 'Sostiene el pulso menor un paso antes del regreso.';
    case 5:
      return 'Suaviza la vuelta al primer acorde sin demasiada tensión.';
    case 6:
      return 'Abre la frase en mayor para contrastar con los acordes menores.';
    case 7:
      return 'Marca un empujón en mayor antes de regresar al acorde i.';
    default:
      return candidate.explanation;
  }
}

export function getReplacementSuggestions(
  keyRoot: string,
  mode: Mode,
  currentDegrees: readonly number[],
  slotIndex: number,
): ReplacementSuggestion[] {
  const diatonic = getDiatonicChords(keyRoot, mode);
  const currentDegree = currentDegrees[slotIndex] ?? 1;
  const prevDegree = slotIndex > 0 ? currentDegrees[slotIndex - 1] : undefined;
  const nextDegree = slotIndex < currentDegrees.length - 1 ? currentDegrees[slotIndex + 1] : undefined;

  const candidates = diatonic.filter((chord) => chord.degree !== currentDegree);

  const scored = candidates.map((chord) => {
    let score = 0;

    if (chord.quality === 'dim') {
      score -= 100;
    } else {
      score += 20;
    }

    const repeatsNeighbor = chord.degree === prevDegree || chord.degree === nextDegree;
    if (!repeatsNeighbor) {
      score += 15;
    } else {
      score -= 15;
    }

    if (slotIndex === 0 && (chord.harmonicFunction === 'rest' || chord.degree === 6 || chord.degree === 4)) {
      score += 10;
    } else if (slotIndex === 3 && (chord.harmonicFunction === 'tension' || chord.harmonicFunction === 'return' || chord.degree === 4)) {
      score += 10;
    } else if ((slotIndex === 1 || slotIndex === 2) && chord.harmonicFunction === 'movement') {
      score += 8;
    }

    return {
      chord,
      score,
      moodEffect: describeReplacementMoodEffect(chord, mode, slotIndex),
      isRecommended: chord.quality !== 'dim' && !repeatsNeighbor,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map(({ chord, moodEffect, isRecommended }) => ({
    chord,
    moodEffect,
    isRecommended,
  }));
}
