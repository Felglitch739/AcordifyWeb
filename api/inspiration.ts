import { buildLocalStrumFallback, type InspirationRequest } from '../src/lib/localStrumTip.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function normalizeInspirationInput(raw: Record<string, unknown>): InspirationRequest | null {
  const chords = Array.isArray(raw.chords)
    ? raw.chords
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
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
    ? raw.degrees.filter((d): d is number => typeof d === 'number' && Number.isInteger(d)).slice(0, 4)
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

function buildGeminiPrompt(input: InspirationRequest): string {
  const chordLine = input.chords.join(' - ');
  const degreeText =
    input.degrees && input.degrees.length > 0
      ? ` (grados ${input.degrees.join('-')})`
      : '';
  const themeText = input.theme
    ? `Tema elegido por quien toca: "${input.theme}".`
    : 'Elige una escena cotidiana breve (una calle, un cuarto, lluvia, camino, tarde tranquila).';

  const patternNames = {
    folk: 'rasgueo acústico folk',
    arpeggio: 'arpegio cuerda por cuerda',
    ballad: 'rasgueo lento de balada',
  } as const;

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

function extractGeminiJsonText(payload: Record<string, unknown>): Record<string, unknown> {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const firstCandidate = candidates[0] as Record<string, unknown> | undefined;
  const content = firstCandidate?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const textPart = parts.find(
    (p): p is { text: string } =>
      typeof p === 'object' && p !== null && typeof (p as { text?: unknown }).text === 'string',
  );

  if (!textPart) {
    throw new Error('Missing text part in Gemini response');
  }

  const cleaned = textPart.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    }
    throw new Error('Invalid JSON returned by Gemini');
  }
}

export async function POST(request: Request): Promise<Response> {
  let rawBody: Record<string, unknown>;
  try {
    rawBody = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const input = normalizeInspirationInput(rawBody);
  if (!input) {
    return jsonResponse({ error: 'chords array is required' }, 400);
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? '';
  if (!apiKey) {
    return jsonResponse(buildLocalStrumFallback(input), 200);
  }

  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
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
          temperature: 0.75,
          maxOutputTokens: 300,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!geminiRes.ok) {
      return jsonResponse(buildLocalStrumFallback(input), 200);
    }

    const payload = (await geminiRes.json()) as Record<string, unknown>;
    const parsed = extractGeminiJsonText(payload);

    const title = typeof parsed.title === 'string' ? parsed.title.trim() : '';
    const lyrics = typeof parsed.lyrics === 'string' ? parsed.lyrics.trim() : '';
    const strumTip = typeof parsed.strumTip === 'string' ? parsed.strumTip.trim() : '';

    if (!title || !lyrics || !strumTip) {
      return jsonResponse(buildLocalStrumFallback(input), 200);
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
  } catch {
    return jsonResponse(buildLocalStrumFallback(input), 200);
  }
}
