import { recordTokenUsage } from './tokenTracker';

export interface SongConceptResponse {
  chords: string[];
  scale: string;
  lyrics: string;
}

/**
 * Calls Azure OpenAI to generate a dynamic song concept based on a mood.
 * Expects VITE_AZURE_API_KEY and VITE_AZURE_ENDPOINT in .env.local
 */
export async function generateSongConcept(mood: string, genre?: string, prevChords?: string[]): Promise<SongConceptResponse> {
  const apiKey = import.meta.env.VITE_AZURE_API_KEY;
  const endpoint = import.meta.env.VITE_AZURE_ENDPOINT;

  if (!apiKey || !endpoint) {
    throw new Error('Azure API Key or Endpoint is missing in .env.local. Please set VITE_AZURE_API_KEY and VITE_AZURE_ENDPOINT.');
  }

  const systemPrompt = `Eres un compositor de música Indie Alternativa y productor experimentado. Tu objetivo es generar conceptos de canciones con alta coherencia lírica y musical.

Reglas Líricas Estrictas:
1. EVITA rimas clichés, predecibles o infantiles (no uses amor/dolor, canción/corazón de forma obvia). Busca una métrica natural, metafórica y cruda, estilo Jorge Drexler o Cuarteto de Nos.
2. Cada línea debe tener un ritmo interno (métrica regular de aproximadamente 8 a 11 sílabas por verso) para que sea fácil de cantar.

Reglas de Acordes Estrictas:
1. Los acordes en corchetes [] NO deben ir al azar. Debe colocarse EXACTAMENTE antes de la sílaba donde cae el pulso fuerte del compás (el ritmo).
2. No satures. Pon máximo 2 o 3 acordes por verso, idealmente al inicio del verso o en el cambio de ritmo de la frase.
3. Asegúrate de que los acordes en la letra coincidan exactamente con los 4 acordes del arreglo 'chords'.

Formato de Respuesta: Devuelve ÚNICAMENTE un objeto JSON plano, sin bloques de código markdown (\`\`\`), con esta estructura:
{
  "chords": ["Acorde1", "Acorde2", "Acorde3", "Acorde4"],
  "scale": "Nombre de la escala",
  "lyrics": "[Acorde1]Línea uno de la letra\\n[Acorde2]Línea dos con ritmo..."
}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a fresh, unique, and creative song concept for the mood/style: "${mood}"${genre ? ` and sub-style: "${genre}"` : ''}.
${prevChords && prevChords.length > 0 ? `Avoid repeating the exact chord progression or theme from the previous session: ${JSON.stringify(prevChords)}. Create something harmonically distinct and fresh.` : ''}
Make it innovative and avoid standard cliches. Current trigger: ${Date.now()}` }
        ],
        temperature: 0.85,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Track token usage
    if (data.usage) {
      recordTokenUsage('generateConcept', 'gpt-4o-mini', data.usage);
    }

    let content = data.choices[0].message.content.trim();

    // Cleanup any accidental markdown blocks the AI might output despite instructions
    if (content.startsWith('```json')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsed: SongConceptResponse = JSON.parse(content);
    return parsed;
  } catch (error) {
    console.error('Failed to generate song concept:', error);
    throw error;
  }
}
