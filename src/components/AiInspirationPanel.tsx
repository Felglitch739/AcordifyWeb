import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Feather, Sparkles } from 'lucide-react';
import type { StrumPatternId } from '../audio';
import {
  fetchInspirationStatus,
  requestInspiration,
  type InspirationResponse,
} from '../lib/geminiClient';
import type { Mode, MoodId } from '../theory';

interface AiInspirationPanelProps {
  chords: string[];
  degrees: number[];
  keyRoot: string;
  mode: Mode;
  mood: MoodId;
  bpm: number;
  strumPattern: StrumPatternId;
}

export const AiInspirationPanel: React.FC<AiInspirationPanelProps> = ({
  chords,
  degrees,
  keyRoot,
  mode,
  mood,
  bpm,
  strumPattern,
}) => {
  const [theme, setTheme] = useState('');
  const [aiConfigured, setAiConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<InspirationResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchInspirationStatus().then((status) => {
      if (!cancelled) {
        setAiConfigured(status.aiConfigured);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    setIsLoading(true);
    setCopied(false);
    try {
      const response = await requestInspiration({
        chords,
        degrees,
        keyRoot,
        mode,
        mood,
        bpm,
        strumPattern,
        theme: theme.trim() || undefined,
      });
      setResult(response);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLyrics = async () => {
    if (!result) return;
    const textToCopy = result.lyrics
      ? `${result.title}\n\n${result.lyrics}\n\nTip: ${result.strumTip}`
      : `${result.title}\n\nTip: ${result.strumTip}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure in constrained environments
    }
  };

  return (
    <section aria-label="Letra y rasgueo" className="surface-card p-5 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-border)]">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-2.5 text-[var(--color-ink)]">
            <Feather className="w-4 h-4" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              {aiConfigured ? 'Extra opcional · IA conectada' : 'Práctica local · Sin IA conectada'}
            </p>
            <h2 className="text-2xl font-medium text-[var(--color-ink)] mt-0.5">
              {aiConfigured ? 'Letra y rasgueo' : 'Sugerencia de rasgueo'}
            </h2>
            <p className="text-sm text-[var(--color-ink-secondary)] mt-1">
              {aiConfigured
                ? 'Te sugiero una letra corta para esta vuelta, con tus acordes.'
                : 'Sugerencia local de rasgueo para esta vuelta. Agrega GEMINI_API_KEY en Vercel para activar versos con IA.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => void handleGenerate()}
          className="btn-primary self-start sm:self-auto shrink-0 px-4 py-2.5 text-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>
            {isLoading
              ? aiConfigured
                ? 'Escribiendo idea...'
                : 'Generando tip...'
              : aiConfigured
                ? 'Sugerir verso y tip'
                : 'Sugerir tip de rasgueo'}
          </span>
        </button>
      </div>

      {aiConfigured && (
        <div>
          <label
            htmlFor="ai-theme-input"
            className="block text-xs font-medium text-[var(--color-ink-secondary)] mb-1.5"
          >
            Tema opcional (ej. lluvia en la ventana, café de mañana, volver a empezar)
          </label>
          <input
            id="ai-theme-input"
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Escribe una idea o déjalo vacío"
            className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-ink)] focus:outline-none"
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={`${result.title}-${result.source}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.18 }}
            className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] p-4 sm:p-5 space-y-3"
          >
            {result.notice && (
              <p className="text-xs text-[var(--color-ink-muted)] border-b border-[var(--color-border)] pb-2.5">
                {result.notice}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-medium text-[var(--color-ink)]">
                {result.title}
              </h3>
              <button
                type="button"
                onClick={() => void handleCopyLyrics()}
                className="btn-secondary px-3 py-1 text-xs bg-[var(--color-surface)]"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--color-ok)]" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {result.lyrics && (
              <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--color-ink)]">
                {result.lyrics}
              </pre>
            )}

            <p className="border-t border-[var(--color-border)] pt-3 text-sm text-[var(--color-ink-secondary)] leading-relaxed">
              <span className="font-medium text-[var(--color-ink)]">Tip de rasgueo: </span>
              {result.strumTip}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
