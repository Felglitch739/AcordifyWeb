const LOCAL_FALLBACK_NOTICE =
  'La sugerencia con IA no está disponible ahora; esto es un tip local.';

/**
 * @param {{
 *   chords: string[];
 *   keyRoot: string;
 *   mode: 'major' | 'minor';
 *   mood: string;
 *   bpm: number;
 *   degrees?: number[];
 *   strumPattern?: 'folk' | 'arpeggio' | 'ballad';
 *   theme?: string;
 * }} input
 * @param {string} [fallbackReason='unavailable']
 */
function buildLocalStrumFallback(input, fallbackReason = 'unavailable') {
  const c0 = input.chords[0] ?? input.keyRoot;
  const c1 = input.chords[1] ?? c0;
  const c2 = input.chords[2] ?? c0;
  const c3 = input.chords[3] ?? c1;
  const pattern = input.strumPattern ?? 'folk';

  let strumTip;
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
    fallbackReason,
  };
}

/**
 * @param {unknown} body
 * @param {number} [status=200]
 * @returns {Response}
 */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** @param {Record<string, unknown>} raw */
function normalizeInspirationInput(raw) {
  const chords = Array.isArray(raw.chords)
    ? raw.chords
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, 4)
    : [];

  if (chords.length === 0) return null;

  const keyRoot =
    typeof raw.keyRoot === 'string' && raw.keyRoot.trim().length > 0
      ? raw.keyRoot.trim().slice(0, 8)
      : chords[0];
  const mode = raw.mode === 'minor' ? 'minor' : 'major';
  const mood =
    typeof raw.mood === 'string' && raw.mood.trim().length > 0
      ? raw.mood.trim().slice(0, 32)
      : 'calm';
  const bpm =
    typeof raw.bpm === 'number' && Number.isFinite(raw.bpm)
      ? Math.max(40, Math.min(200, Math.round(raw.bpm)))
      : 80;
  const degrees = Array.isArray(raw.degrees)
    ? raw.degrees
        .filter((d) => typeof d === 'number' && Number.isInteger(d))
        .slice(0, 4)
    : undefined;
  const strumPattern =
    raw.strumPattern === 'arpeggio' || raw.strumPattern === 'ballad' || raw.strumPattern === 'folk'
      ? raw.strumPattern
      : 'folk';
  const theme =
    typeof raw.theme === 'string' && raw.theme.trim().length > 0
      ? raw.theme.trim().slice(0, 120)
      : undefined;

  return { chords, keyRoot, mode, mood, bpm, degrees, strumPattern, theme };
}

/** @param {NonNullable<ReturnType<typeof normalizeInspirationInput>>} input */
function buildGeminiPrompt(input) {
  const chordLine = input.chords.join(' - ');
  const degreeText =
    input.degrees && input.degrees.length > 0 ? ` (grados ${input.degrees.join('-')})` : '';
  const themeText = input.theme
    ? `Tema elegido por quien toca: "${input.theme}".`
    : 'Elige una escena cotidiana breve (una calle, un cuarto, lluvia, camino, tarde tranquila).';

  const patternNames = {
    folk: 'rasgueo acústico folk',
    arpeggio: 'arpegio cuerda por cuerda',
    ballad: 'rasgueo lento de balada',
  };

  const linesTemplate = input.chords.map((c) => `[${c}] <verso corto en español>`).join('\n');

  return [
    'Eres un guitarrista y compositor en español directo y concreto.',
    `Progresión real: ${chordLine}${degreeText} en ${input.keyRoot} ${input.mode === 'minor' ? 'menor' : 'mayor'}, ánimo ${input.mood}, tempo ${input.bpm} BPM, toque: ${patternNames[input.strumPattern ?? 'folk']}.`,
    themeText,
    'Responde SOLO un objeto JSON válido con exactamente 3 campos de texto:',
    '- "title": título corto de 2 a 5 palabras en español.',
    `- "lyrics": exactamente ${input.chords.length} versos cortos, uno por acorde en ese orden exacto:\n${linesTemplate}`,
    `- "strumTip": 1 o 2 frases prácticas de guitarra nombrando acordes concretos de [${chordLine}] (por ejemplo cuál acentuar, pausar o arpegiar a ${input.bpm} BPM).`,
    'Prohibido usar clichés o adornos como: desbloquea, poder, épico, mágico, sinfonía, eterno, alma rota.',
  ].join('\n');
}

/** @param {Record<string, unknown>} payload */
function extractGeminiJsonText(payload) {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const firstCandidate =
    candidates[0] && typeof candidates[0] === 'object' ? candidates[0] : undefined;
  const content =
    firstCandidate && typeof firstCandidate.content === 'object'
      ? firstCandidate.content
      : undefined;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const textPart =
    parts.find(
      (p) => typeof p === 'object' && p !== null && p.thought !== true && typeof p.text === 'string',
    ) ?? parts.find((p) => typeof p === 'object' && p !== null && typeof p.text === 'string');

  if (!textPart) {
    throw new Error('Missing text part in Gemini response');
  }

  const cleaned = textPart.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Invalid JSON returned by Gemini');
  }
}

/**
 * @returns {Promise<Response>}
 */
export async function GET() {
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  return jsonResponse({ aiConfigured, model }, 200);
}

/**
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function POST(request) {
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!rawBody || typeof rawBody !== 'object') {
    return jsonResponse({ error: 'chords array is required' }, 400);
  }

  const input = normalizeInspirationInput(rawBody);
  if (!input) {
    return jsonResponse({ error: 'chords array is required' }, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  if (!apiKey) {
    return jsonResponse(buildLocalStrumFallback(input, 'missing_key'), 200);
  }

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const isFlash25 = /^gemini-2\.5-flash/i.test(model);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent`;

  try {
    const geminiRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildGeminiPrompt(input) }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              lyrics: { type: 'STRING' },
              strumTip: { type: 'STRING' },
            },
            required: ['title', 'lyrics', 'strumTip'],
          },
          temperature: 0.75,
          maxOutputTokens: 700,
          ...(isFlash25 ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!geminiRes.ok) {
      return jsonResponse(buildLocalStrumFallback(input, `http_${geminiRes.status}`), 200);
    }

    const payload = await geminiRes.json();
    const parsed = extractGeminiJsonText(payload);

    const title = typeof parsed?.title === 'string' ? parsed.title.trim() : '';
    const lyrics = Array.isArray(parsed?.lyrics)
      ? parsed.lyrics
          .filter((line) => typeof line === 'string')
          .map((line) => line.trim())
          .filter(Boolean)
          .join('\n')
      : typeof parsed?.lyrics === 'string'
        ? parsed.lyrics.trim()
        : '';
    const strumTip = typeof parsed?.strumTip === 'string' ? parsed.strumTip.trim() : '';

    if (!title || !lyrics || !strumTip) {
      return jsonResponse(buildLocalStrumFallback(input, 'missing_fields'), 200);
    }

    return jsonResponse(
      {
        source: 'gemini',
        model,
        title,
        lyrics,
        strumTip,
        notice: null,
      },
      200,
    );
  } catch (err) {
    const reason =
      err && typeof err === 'object' && 'name' in err && err.name === 'TimeoutError'
        ? 'timeout'
        : 'parse_or_network_error';
    return jsonResponse(buildLocalStrumFallback(input, reason), 200);
  }
}
