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
    description: 'Acordes abiertos que respiran sin prisa.',
    defaultBpm: 76,
  },
  {
    id: 'melancholic',
    label: 'Melancólico',
    description: 'Giros íntimos y suaves con aire introspectivo.',
    defaultBpm: 72,
  },
  {
    id: 'nostalgic',
    label: 'Nostálgico',
    description: 'Progresiones cálidas que recuerdan a una canción conocida.',
    defaultBpm: 84,
  },
  {
    id: 'bright',
    label: 'Luminoso',
    description: 'Brillante, optimista y fácil de cantar encima.',
    defaultBpm: 102,
  },
  {
    id: 'energetic',
    label: 'Enérgico',
    description: 'Con empuje constante para rasgueos más marcados.',
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
    name: 'Clásica abierta (I–V–vi–IV)',
    mode: 'major',
    degrees: [1, 5, 6, 4],
    moods: ['bright', 'nostalgic', 'energetic'],
    roleHints: [
      'Arranca en casa para fijar el tono desde el primer compás.',
      'Sube la energía y abre el horizonte de la frase.',
      'Giro emocional que suaviza el recorrido con nostalgia.',
      'Deja la canción flotando lista para repetir el loop.',
    ],
  },
  {
    name: 'Balada cálida (I–vi–IV–V)',
    mode: 'major',
    degrees: [1, 6, 4, 5],
    moods: ['calm', 'nostalgic', 'melancholic'],
    roleHints: [
      'Establece el centro con un pulso tranquilo y claro.',
      'Cae hacia el lado íntimo sin perder calidez.',
      'Amplía la armonía y prepara el cierre de la vuelta.',
      'Crea expectativa justa para volver al inicio.',
    ],
  },
  {
    name: 'Agridulce indie (vi–IV–I–V)',
    mode: 'major',
    degrees: [6, 4, 1, 5],
    moods: ['melancholic', 'nostalgic', 'calm'],
    roleHints: [
      'Empieza desde un color reflexivo en lugar de la tónica.',
      'Aporta respiro y sensación de avance gradual.',
      'Ilumina la mitad de la frase al tocar tierra firme.',
      'Empuja con tensión limpia para reiniciar el ciclo.',
    ],
  },
  {
    name: 'Acústica directa (I–IV–V–IV)',
    mode: 'major',
    degrees: [1, 4, 5, 4],
    moods: ['bright', 'energetic', 'calm'],
    roleHints: [
      'Base sólida y luminosa para marcar el ritmo.',
      'Levanta la frase con movimiento abierto.',
      'Pico de energía en la tercera parte del compás.',
      'Relaja un paso antes de volver a empezar.',
    ],
  },
  {
    name: 'Indie folk fluido (I–IV–vi–V)',
    mode: 'major',
    degrees: [1, 4, 6, 5],
    moods: ['calm', 'bright', 'nostalgic'],
    roleHints: [
      'Acorde de descanso que invita a entrar sin prisas.',
      'Abre espacio para la melodía principal.',
      'Cambia a un matiz más cercano y confesional.',
      'Impulsa suavemente el regreso al primer acorde.',
    ],
  },
  {
    name: 'Impulso ascendente (IV–I–V–vi)',
    mode: 'major',
    degrees: [4, 1, 5, 6],
    moods: ['energetic', 'bright', 'melancholic'],
    roleHints: [
      'Entra ya en movimiento, como si la historia hubiera empezado.',
      'Asienta la idea en el segundo compás.',
      'Sube la tensión antes del giro final.',
      'Cierra con un matiz emotivo que pide otra vuelta.',
    ],
  },

  // Minor templates
  {
    name: 'Épica nocturna (i–VI–III–VII)',
    mode: 'minor',
    degrees: [1, 6, 3, 7],
    moods: ['energetic', 'nostalgic', 'melancholic'],
    roleHints: [
      'Arranca en terreno serio y envolvente.',
      'Se abre hacia un acorde mayor amplio y cinematográfico.',
      'Trae un instante de claridad en medio de la noche.',
      'Da impulso hacia adelante para cerrar el ciclo.',
    ],
  },
  {
    name: 'Nostalgia acústica (i–iv–VII–III)',
    mode: 'minor',
    degrees: [1, 4, 7, 3],
    moods: ['melancholic', 'calm', 'nostalgic'],
    roleHints: [
      'Acorde principal de descanso en tono menor.',
      'Profundiza el sentimiento con paso contenido.',
      'Empuja la frase hacia un cambio luminoso.',
      'Resuelve en el relativo mayor con alivio suave.',
    ],
  },
  {
    name: 'Tensión indie (i–VII–VI–VII)',
    mode: 'minor',
    degrees: [1, 7, 6, 7],
    moods: ['energetic', 'melancholic', 'bright'],
    roleHints: [
      'Fija la raíz menor con carácter firme.',
      'Da un paso atrás con aire de carretera o rock suave.',
      'Aterriza con peso emocional en el sexto grado.',
      'Vuelve a subir para lanzarse otra vez al acorde i.',
    ],
  },
  {
    name: 'Íntima y serena (i–iv–v–i)',
    mode: 'minor',
    degrees: [1, 4, 5, 1],
    moods: ['calm', 'melancholic'],
    roleHints: [
      'Presenta la idea en calma total.',
      'Camina un peldaño abajo manteniendo la intimidad.',
      'Prepara el regreso sin estridencias ni dureza.',
      'Vuelve a casa para descansar al final del loop.',
    ],
  },
  {
    name: 'Luz entre nubes (VI–VII–i–III)',
    mode: 'minor',
    degrees: [6, 7, 1, 3],
    moods: ['bright', 'nostalgic', 'energetic'],
    roleHints: [
      'Comienza con amplitud y optimismo contenido.',
      'Toma impulso hacia el centro de la canción.',
      'Asienta la raíz menor con firmeza.',
      'Cierra abriendo aire hacia el acorde mayor relativo.',
    ],
  },
  {
    name: 'Paseo de lluvia (i–III–VII–iv)',
    mode: 'minor',
    degrees: [1, 3, 7, 4],
    moods: ['calm', 'nostalgic', 'bright'],
    roleHints: [
      'Tono base sereno para empezar a rasguear.',
      'Ilumina la progresión con el tercer grado mayor.',
      'Mantiene el ritmo vivo rumbo al cierre.',
      'Termina con un suspiro suave que enlaza al inicio.',
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
  templateName = 'Progresión personalizada',
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
    return 'Añade tensión pasajera e inestable; úsalo como puente corto hacia el siguiente acorde.';
  }

  if (mode === 'major') {
    switch (candidate.degree) {
      case 1:
        return slotIndex === 3
          ? 'Resuelve el final en casa para que la vuelta suene más cerrada.'
          : 'Aterriza en descanso total y da mucha estabilidad.';
      case 2:
        return 'Cambia hacia un tono menor suave y reflexivo que prepara bien el V.';
      case 3:
        return 'Vuelve el paso más íntimo, melancólico y delicado.';
      case 4:
        return 'Abre la armonía con un color cálido, luminoso y amplio.';
      case 5:
        return 'Suma empuje y tensión clara para pedir el regreso al inicio.';
      case 6:
        return 'Agrega nostalgia o emoción contenida sin salirte del tono.';
      default:
        return candidate.explanation;
    }
  }

  switch (candidate.degree) {
    case 1:
      return 'Ancla el compás en el centro oscuro y sereno del tono menor.';
    case 3:
      return 'Mete un rayo de luz mayor y alivio instantáneo en la frase.';
    case 4:
      return 'Profundiza la nostalgia con un color menor más denso.';
    case 5:
      return 'Suaviza el retorno sin la dureza de un acorde tenso.';
    case 6:
      return 'Da amplitud cinematográfica y levanta la emoción del compás.';
    case 7:
      return 'Aporta impulso abierto estilo rock acústico o indie.';
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

    // Prefer usable major/minor triads before diminished chords
    if (chord.quality === 'dim') {
      score -= 100;
    } else {
      score += 20;
    }

    // Avoid immediate adjacent duplicates when possible
    const repeatsNeighbor = chord.degree === prevDegree || chord.degree === nextDegree;
    if (!repeatsNeighbor) {
      score += 15;
    } else {
      score -= 15;
    }

    // Slot-specific musical fit
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
