import React, { useState } from 'react';
import { TactileButton } from './TactileButton';
import type { SongLookupResult } from '../services/songLookupService';
import { lookupSong } from '../services/songLookupService';

interface Props {
  onLoad?: (result: SongLookupResult) => void;
}

export const SongLookup: React.FC<Props> = ({ onLoad }) => {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SongLookupResult | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await lookupSong(query.trim(), genre.trim() || undefined);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-950 p-4 rounded-sm h-fit">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <input
            aria-label="Buscar canción (Título Artista)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: Wonderwall Oasis"
            className="bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-sm w-full"
          />
          <TactileButton variant="zinc" onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? 'BUSCANDO…' : 'BUSCAR'}
          </TactileButton>
        </div>

        <input
          aria-label="Género o estilo (opcional)"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          placeholder="Genero/estilo (opcional) ej: indie rock, bolero"
          className="bg-zinc-900 border border-zinc-800 rounded-sm px-3 py-2 text-xs w-full"
        />
      </div>

      <div className="mt-3" aria-live="polite">
        {error && <div className="text-sm text-red-400">{error}</div>}

        {result && (
          <div className="mt-2 border border-zinc-800 bg-zinc-900 p-3 rounded-sm">
            {!result.found ? (
              <div className="text-sm text-zinc-400">No se encontraron datos confiables.</div>
            ) : (
              <div className="text-xs text-zinc-200 space-y-1">
                <div className="font-mono font-bold text-amber-400">{result.title} — {result.artist}</div>
                <div className="text-zinc-500">Key: {result.keyRoot} {result.mode}</div>
                <div className="text-zinc-500">Key detectada: {result.keyDetected ?? '—'} ({result.keyConfidence ?? '—'}%)</div>
                <div className="text-zinc-500">BPM sugerido: {result.bpmSuggested ?? '—'}</div>
                <div className="text-zinc-500">Confidence: {(result.confidence ?? 0).toFixed(2)} • Coherencia: {result.coherenceScore ?? '—'}</div>
                {typeof result.confidence === 'number' && result.confidence < 0.7 && (
                  <div className="text-amber-400">⚠ Acordes aproximados — verifica antes de tocar</div>
                )}
                <div className="mt-2 text-zinc-300 whitespace-pre-wrap font-mono text-xs">{result.chordProContent}</div>

                <div className="mt-3 flex gap-2">
                  <TactileButton variant="zinc" onClick={() => onLoad?.(result)}>
                    CARGAR EN NOTEBOOK
                  </TactileButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SongLookup;
