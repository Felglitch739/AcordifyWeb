import { detectKey, validateProgression } from '../utils/harmonicValidator';

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
}

/**
 * Lookup a song by freeform query ("Title Artist") using Azure/GPT.
 * Returns a structured object that follows the ROADMAP schema.
 */
export async function lookupSong(query: string, genre?: string): Promise<SongLookupResult> {
  const apiKey = import.meta.env.VITE_AZURE_API_KEY
    ?? (typeof process !== 'undefined' ? process.env.VITE_AZURE_API_KEY : undefined);
  const endpoint = import.meta.env.VITE_AZURE_ENDPOINT
    ?? (typeof process !== 'undefined' ? process.env.VITE_AZURE_ENDPOINT : undefined);

  if (!apiKey || !endpoint) {
    throw new Error('Azure API Key or Endpoint missing. Set VITE_AZURE_API_KEY and VITE_AZURE_ENDPOINT.');
  }

  const systemPrompt = `Eres un buscador musical que devuelve datos estructurados en JSON para Acordify.
Reglas estrictas:
- Responde SOLO JSON válido, sin texto adicional ni markdown.
- Esquema exacto: {"found":boolean,"title":string,"artist":string,"keyRoot":string,"mode":"major|minor","bpmSuggested":number,"chords":string[],"chordProContent":string,"confidence":number}.
- Si no estás seguro de la canción o de los acordes reales, responde {"found":false}.
- "chordProContent" debe usar formato ChordPro estándar, con acordes entre [] y texto en líneas.
- La lista "chords" debe reflejar los acordes que aparecen en chordProContent (sin inventar símbolos nuevos).
- Usa notación de acordes estándar (Cmaj7, Am9, Dm7, G13).`;

  const userPrompt = `Busca la canción y devuelve acordes reales cuando estés seguro.
Query: "${query}"${genre ? `, género: "${genre}"` : ''}.
Incluye tonalidad, modo y BPM aproximado.
Entrega ChordPro con acordes mapeados por línea. Busca en la web las fuentes oficiales o las transcripciones más fiables y prioriza aquellas con acordes claramente indicados.
Si usas una herramienta de búsqueda web, incorpora solo la información verificada y devuelve un único objeto JSON siguiendo el esquema exacto indicado por el sistema.
Si hay dudas, responde {\"found\": false}.`;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.0,
        max_tokens: 600,
        // Allow the model to call the web search tool for higher-fidelity chord charts
        tools: [
          { type: 'web_search_20250305', name: 'web_search' }
        ],
      }),
    });

    if (!resp.ok) {
      throw new Error(`Azure API error: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();

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
    console.error('lookupSong failed:', error);
    throw error;
  }
}

export default lookupSong;
