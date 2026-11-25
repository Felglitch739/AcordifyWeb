export interface InspirationRequest {
  chords: string[];
  keyRoot: string;
  mode: 'major' | 'minor';
  mood: string;
  bpm: number;
  degrees?: number[];
  strumPattern?: 'folk' | 'arpeggio' | 'ballad';
  theme?: string;
}

export interface InspirationResponse {
  source: 'gemini' | 'fallback';
  model: string | null;
  title: string;
  lyrics: string | null;
  strumTip: string;
  notice: string | null;
}

export const LOCAL_FALLBACK_NOTICE =
  'La sugerencia con IA no está disponible ahora; esto es un tip local.';

export function buildLocalStrumFallback(input: InspirationRequest): InspirationResponse {
  const c0 = input.chords[0] ?? input.keyRoot;
  const c1 = input.chords[1] ?? c0;
  const c2 = input.chords[2] ?? c0;
  const c3 = input.chords[3] ?? c1;
  const pattern = input.strumPattern ?? 'folk';

  let strumTip: string;
  if (pattern === 'arpeggio') {
    strumTip = `Toca ${c0} y ${c1} en arpegio suave desde el bajo hacia las tres cuerdas agudas, y deja que ${c3} suene abierto medio compás antes de volver a ${c0}.`;
  } else if (pattern === 'ballad') {
    strumTip = `A un pulso de ${input.bpm} BPM, da un rasgueo largo hacia abajo en ${c0}, sostén dos tiempos y entra con un toque ligero en ${c2} y ${c3} para enlazar la vuelta.`;
  } else {
    strumTip = `Marca el tiempo 1 con golpe hacia abajo en ${c0} y ${c1}, suelta la mano en ${c2} con dos rasgueos arriba cortos, y apaga suave al cerrar en ${c3}.`;
  }

  return {
    source: 'fallback',
    model: null,
    title: `${c0} · ${c1} · ${c2} · ${c3}`,
    lyrics: null,
    strumTip,
    notice: LOCAL_FALLBACK_NOTICE,
  };
}
