import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Copy, ExternalLink, Feather, Lock, Sparkles } from 'lucide-react';
import {
  AiGatewayCreditsError,
  fetchAiInspiration,
  isNeonApiConfigured,
  type AiInspirationResult,
} from '../lib/neonApi';
import { getAuthBearerToken } from '../lib/neonAuth';
import { useStudioStyle } from '../styles/useStudioStyle';
import type { Mode, MoodId } from '../theory';

interface AiInspirationPanelProps {
  chords: string[];
  keyRoot: string;
  mode: Mode;
  mood: MoodId;
  bpm: number;
  isSignedIn: boolean;
  onOpenAuth: () => void;
  onErrorToast: (message: string) => void;
}

export const AiInspirationPanel: React.FC<AiInspirationPanelProps> = ({
  chords,
  keyRoot,
  mode,
  mood,
  bpm,
  isSignedIn,
  onOpenAuth,
  onErrorToast,
}) => {
  const { studioStyle } = useStudioStyle();
  const isApple = studioStyle === 'apple';
  const isOp1 = studioStyle === 'op1';
  const isVinyl = studioStyle === 'vinyl';

  const [theme, setTheme] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<AiInspirationResult | null>(null);
  const [creditsNotice, setCreditsNotice] = useState<{
    message: string;
    recoveryUrl: string | null;
  } | null>(null);

  if (!isNeonApiConfigured) {
    return null;
  }

  const handleGenerate = async () => {
    setCreditsNotice(null);
    setIsLoading(true);

    try {
      const token = await getAuthBearerToken();
      if (!token) {
        onOpenAuth();
        return;
      }

      const inspiration = await fetchAiInspiration(token, {
        chords,
        keyRoot,
        mode,
        mood,
        bpm,
        theme: theme.trim() || undefined,
      });
      setResult(inspiration);
    } catch (err) {
      if (err instanceof AiGatewayCreditsError) {
        setCreditsNotice({
          message: err.message,
          recoveryUrl: err.recoveryUrl,
        });
      } else {
        onErrorToast(
          err instanceof Error ? err.message : 'No se pudo obtener inspiración con IA',
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLyrics = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${result.title}\n\n${result.lyrics}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure in constrained environments
    }
  };

  const shellClass = isVinyl
    ? 'vinyl-brutal-card p-5 sm:p-6'
    : isOp1
      ? 'op1-chassis rounded-2xl p-5 sm:p-6'
      : isApple
        ? 'apple-ceramic-card rounded-3xl p-5 sm:p-6'
        : 'studio-surface rounded-2xl p-5 sm:p-6';

  return (
    <section aria-label="Cuaderno de composición con Neon AI" className={shellClass}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 border border-[var(--border-subtle)] bg-[var(--bg-recessed)] p-2.5 text-[var(--mood-accent)] ${
              isVinyl ? 'rounded border-[#141210]' : isApple ? 'rounded-2xl' : 'rounded-xl'
            }`}
          >
            <Feather className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Cuaderno de compositor · Neon AI
            </p>
            <h3
              className={`text-2xl sm:text-3xl text-[var(--text-primary)] mt-0.5 ${
                isVinyl
                  ? 'font-poster font-bold tracking-tight'
                  : isApple
                    ? 'font-semibold tracking-[-0.025em] text-xl sm:text-2xl'
                    : isOp1
                      ? 'font-hardware font-bold text-xl sm:text-2xl'
                      : 'font-serif-editorial font-normal'
              }`}
            >
              ¿Quieres una letra y tip de rasgueo para esta vuelta?
            </h3>
          </div>
        </div>

        {!isSignedIn ? (
          <button
            type="button"
            onClick={onOpenAuth}
            className={`self-start sm:self-auto shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold transition cursor-pointer ${
              isVinyl
                ? 'rounded border-2 border-[#141210] bg-[#FFFDF7] text-[#141210] font-mono uppercase hover:bg-[#D4F350]'
                : isApple
                  ? 'rounded-full border border-[var(--mood-border)] bg-[var(--mood-tint)] text-[var(--mood-accent)] hover:brightness-95'
                  : isOp1
                    ? 'op1-keycap rounded-xl text-[#18191B] font-mono'
                    : 'rounded-xl border border-[var(--mood-border)] bg-[var(--mood-tint)] text-[var(--mood-accent)] hover:brightness-110'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Inicia sesión para activar</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void handleGenerate()}
            className={`self-start sm:self-auto shrink-0 inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[var(--mood-accent)] text-[var(--accent-ink)] hover:brightness-110 transition disabled:opacity-60 cursor-pointer ${
              isVinyl
                ? 'rounded border-2 border-[#141210] font-mono uppercase'
                : isApple
                  ? 'rounded-full shadow-sm'
                  : 'rounded-xl'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Escribiendo idea...' : 'Sugerir verso y tip'}</span>
          </button>
        )}
      </div>

      {isSignedIn && (
        <div className="mt-4">
          <label htmlFor="ai-theme-input" className="block text-xs text-[var(--text-secondary)] mb-1.5">
            Imagen o tema opcional (si lo dejas vacío, se adapta al ánimo actual)
          </label>
          <input
            id="ai-theme-input"
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Ej. café de madrugada, carretera en lluvia, volver a empezar..."
            className={`w-full border border-[var(--border-subtle)] bg-[var(--bg-recessed)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--mood-accent)] focus:outline-none ${
              isVinyl ? 'rounded border-2 border-[#141210]' : isApple ? 'rounded-2xl' : 'rounded-xl'
            }`}
          />
        </div>
      )}

      {creditsNotice && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/12 p-4 text-xs text-[var(--text-primary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{creditsNotice.message}</p>
            <p className="mt-1 text-[var(--text-secondary)]">
              El generador de acordes, la guitarra acústica, el afinador y tu libreta funcionan al 100% sin créditos. Para habilitar modelos en Neon AI Gateway, agrega saldo prepagado en tu cuenta.
            </p>
          </div>
          {creditsNotice.recoveryUrl && (
            <a
              href={creditsNotice.recoveryUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-500/20 px-3.5 py-2 text-xs font-semibold hover:brightness-110 transition"
            >
              <span>Agregar créditos</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 border border-[var(--border-subtle)] bg-[var(--bg-recessed)] p-4 sm:p-5 space-y-3 ${
            isVinyl ? 'rounded border-2 border-[#141210]' : isApple ? 'rounded-2xl' : 'rounded-xl'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-serif-editorial text-2xl text-[var(--text-primary)]">
              {result.title}
            </h4>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                {result.model}
              </span>
              <button
                type="button"
                onClick={() => void handleCopyLyrics()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-[var(--text-primary)]">
            {result.lyrics}
          </pre>

          <p className="border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--mood-accent)]">Tip de guitarra: </span>
            {result.strumTip}
          </p>
        </motion.div>
      )}
    </section>
  );
};
