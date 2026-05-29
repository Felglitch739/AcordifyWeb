import { detectKey, validateProgression } from '../utils/harmonicValidator';
import { recordTokenUsage } from './tokenTracker';

export interface SongLookupResult {
  found: boolean;
  title?: string;
  artist?: string;
  keyRoot?: string;
  mode?: 'major' | 'minor' | string;
  bpmSuggested?: number;
  chords?: string[];
  chordProContent?: string;
  confidence?: number;
  // Enriched fields from local validation
  coherenceScore?: number; // 0-100
  keyDetected?: string;
  keyConfidence?: number; // 0-100
  estimated?: boolean;
}

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 1000;

/**
 * Lookup a song by freeform query ("Title Artist") using Azure/GPT.
 * Returns a structured object that follows the ROADMAP schema.
 *
 * Improvements over initial version:
 * - AbortController timeout (10s)
 * - Retry with exponential backoff (max 2 retries)
 * - Token usage tracking
 */
export async function lookupSong(query: string, genre?: string): Promise<SongLookupResult> {
  const apiKey = import.meta.env.VITE_AZURE_API_KEY
    ?? (typeof process !== 'undefined' ? process.env.VITE_AZURE_API_KEY : undefined);
  const endpoint = import.meta.env.VITE_AZURE_ENDPOINT
    ?? (typeof process !== 'undefined' ? process.env.VITE_AZURE_ENDPOINT : undefined);

  if (!apiKey || !endpoint) {
    throw new Error('Azure API Key or Endpoint missing. Set VITE_AZURE_API_KEY and VITE_AZURE_ENDPOINT.');
  }

  const systemPrompt = `Eres un experto en teoría musical y acordes de guitarra que devuelve datos estructurados en JSON para Acordify.
Cuando el usuario te pida los acordes de una canción, responde con tu mejor conocimiento.
- Si conoces la canción con certeza, usa los acordes reales.
- Si no la conoces con exactitud pero puedes inferir una progresión armónicamente correcta para ese estilo/artista, hazlo.
- SOLO devuelve {"found": false} si la canción es completamente desconocida para ti.
- Nunca rechaces una canción popular o de artistas reconocidos.
Reglas estrictas:
- Responde SOLO JSON válido, sin texto adicional ni markdown.
- Esquema exacto: {"found":boolean,"title":string,"artist":string,"keyRoot":string,"mode":"major|minor","bpmSuggested":number,"chords":string[],"chordProContent":string,"confidence":number,"estimated":boolean}.
- "chordProContent" debe usar formato ChordPro estándar, con acordes entre [] y texto en líneas.
- La lista "chords" debe reflejar los acordes que aparecen en chordProContent (sin inventar símbolos nuevos).
- Usa notación de acordes estándar (Cmaj7, Am9, Dm7, G13).`;

  const userPrompt = `Encuéntrame los acordes de: "${query}"${genre ? ` (Género: ${genre})` : ''}.
Usa tu conocimiento musical para proporcionar la mejor versión posible en formato ChordPro.
Incluye la tonalidad (keyRoot, mode) y el BPM aproximado (bpmSuggested).
Incluye el campo "estimated": true si no tienes certeza absoluta de los acordes exactos.
Responde ÚNICAMENTE con JSON válido, sin markdown.`;

  let lastError: Error | null = null;
  let useTools = true;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_MS * attempt));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const requestBody: any = {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.0,
        max_tokens: 600,
      };

      if (useTools) {
        requestBody.tools = [
          { type: 'web_search_20250305', name: 'web_search' }
        ];
      }

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!resp.ok) {
        if (resp.status === 400 && useTools) {
          console.warn('songLookup: 400 Bad Request with tools parameter. Retrying without tools...');
          useTools = false;
          attempt--;
          continue;
        }
        throw new Error(`Azure API error: ${resp.status} ${resp.statusText}`);
      }

      const data = await resp.json();

      // Track token usage
      if (data.usage) {
        recordTokenUsage('songLookup', 'gpt-4o-mini', data.usage);
      }

      // Extract content from either a direct text message or a tool_result payload
      const choice = data.choices?.[0] ?? {};
      const message = choice.message ?? {};
      let content: string = '';

      // Prefer tool_result content when available
      if (message.tool_result) {
        const tr = message.tool_result;
        if (typeof tr === 'string') {
          content = tr;
        } else if (typeof tr.content === 'string') {
          content = tr.content;
        } else if (Array.isArray(tr.results) && tr.results.length) {
          const first = tr.results[0];
          if (typeof first === 'string') content = first;
          else if (first && typeof first.content === 'string') content = first.content;
          else content = JSON.stringify(first);
        } else {
          content = JSON.stringify(tr);
        }
      } else if (choice.tool_result) {
        const tr = choice.tool_result;
        content = typeof tr === 'string' ? tr : JSON.stringify(tr);
      } else {
        content = (message.content ?? '') as string;
      }

      content = (content || '').toString().trim();

      // Remove code fences if present
      if (content.startsWith('```')) {
        content = content.replace(/^```(?:json)?\n?/, '').replace(/```$/, '').trim();
      }

      try {
        const parsed = JSON.parse(content) as SongLookupResult;
        if (!parsed || typeof parsed !== 'object' || typeof parsed.found !== 'boolean') {
          return { found: false };
        }

        // If model returned chords, run local harmonic validation to compute coherence and detect key
        if (parsed.found && Array.isArray(parsed.chords) && parsed.chords.length > 0) {
          try {
            const detected = detectKey(parsed.chords);
            const validation = validateProgression(parsed.chords, detected.root, detected.mode as any);
            parsed.coherenceScore = validation.overallCoherenceScore;
            parsed.keyDetected = `${detected.root} ${detected.mode}`;
            parsed.keyConfidence = detected.confidence;
            // If model omitted keyRoot/mode, prefer detected
            if (!parsed.keyRoot) parsed.keyRoot = detected.root;
            if (!parsed.mode) parsed.mode = detected.mode;
          } catch (vErr) {
            // Non-fatal: leave parsed as-is
            console.warn('songLookup: validation failed', vErr);
          }
        }

        return parsed;
      } catch (err) {
        console.warn('songLookup: failed to parse JSON from model:', err);
        return { found: false };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        lastError = new Error('La búsqueda tardó demasiado. Intenta de nuevo.');
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Only retry on network/timeout errors, not on parse errors
      if (attempt < MAX_RETRIES) {
        console.warn(`songLookup: attempt ${attempt + 1} failed, retrying...`, lastError.message);
        continue;
      }
    }
  }

  console.error('lookupSong failed after retries:', lastError);
  throw lastError ?? new Error('Song lookup failed');
}

export default lookupSong;
