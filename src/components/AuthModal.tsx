import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff, Volume2, X } from 'lucide-react';
import { authClient } from '../lib/neonAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  onPluckNote?: (scientificNote: string) => void;
}

type AuthTab = 'signin' | 'signup';

const PASS_STRINGS: readonly { label: string; note: string; thickness: number }[] = [
  { label: '1ª e', note: 'E4', thickness: 1.05 },
  { label: '2ª B', note: 'B3', thickness: 1.25 },
  { label: '3ª G', note: 'G3', thickness: 1.45 },
  { label: '4ª D', note: 'D3', thickness: 1.75 },
  { label: '5ª A', note: 'A2', thickness: 2.05 },
  { label: '6ª E', note: 'E2', thickness: 2.4 },
] as const;

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    if (typeof rec.message === 'string' && rec.message.trim().length > 0) {
      return rec.message;
    }
    if (typeof rec.statusText === 'string' && rec.statusText.trim().length > 0) {
      return rec.statusText;
    }
  }
  return 'No se pudo completar el inicio de sesión. Intenta de nuevo.';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  onPluckNote,
}) => {
  const [tab, setTab] = useState<AuthTab>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stringPlucks, setStringPlucks] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const client = authClient;
  if (!client) return null;

  const tunedPegCount = (() => {
    let score = 0;
    const trimmedEmail = email.trim();
    if (trimmedEmail.length >= 3) score += 1;
    if (trimmedEmail.includes('@')) score += 1;
    if (trimmedEmail.includes('.') && trimmedEmail.indexOf('.') > trimmedEmail.indexOf('@')) {
      score += 1;
    }
    if (password.length >= 2) score += 1;
    if (password.length >= 5) score += 1;
    if (password.length >= 8) score += 1;
    return Math.min(6, score);
  })();

  const passwordStrengthBars = Math.min(4, Math.ceil(Math.min(password.length, 8) / 2));

  const pluckPassString = (idx: number, note: string) => {
    setStringPlucks((prev) => ({ ...prev, [idx]: (prev[idx] ?? 0) + 1 }));
    onPluckNote?.(note);
  };

  const handleStrumNeck = () => {
    [...PASS_STRINGS].reverse().forEach((str, step) => {
      const origIdx = PASS_STRINGS.length - 1 - step;
      window.setTimeout(() => {
        pluckPassString(origIdx, str.note);
      }, step * 48);
    });
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsPending(true);
    try {
      const res = await client.signIn.social({
        provider: 'google',
        callbackURL: `${window.location.origin}/practicar`,
      });
      if (res?.error) {
        setErrorMsg(extractErrorMessage(res.error));
        setIsPending(false);
      }
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
      setIsPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsPending(true);

    try {
      if (tab === 'signin') {
        const res = await client.signIn.email({
          email: email.trim(),
          password,
        });
        if (res?.error) {
          setErrorMsg(extractErrorMessage(res.error));
          return;
        }
      } else {
        const res = await client.signUp.email({
          name: name.trim() || email.split('@')[0],
          email: email.trim(),
          password,
        });
        if (res?.error) {
          setErrorMsg(extractErrorMessage(res.error));
          return;
        }
      }

      onAuthSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(extractErrorMessage(err));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="auth-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-backdrop)] p-3 sm:p-5 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="surface-card w-full max-w-[820px] max-h-[92vh] overflow-y-auto overflow-x-hidden p-0 shadow-[0_24px_60px_-24px_rgba(17,17,17,0.36)] grid grid-cols-1 md:grid-cols-12"
          >
            {/* Left Ebony Fretboard Pass */}
            <div className="md:col-span-5 bg-[#111111] text-white p-6 sm:p-7 flex flex-col justify-between gap-6 border-b md:border-b-0 md:border-r border-white/10">
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-[28px] font-medium leading-[1.12] tracking-[-0.025em] text-white">
                  Tu libreta,
                  <span className="font-editorial text-[#E85D3D] block">
                    en cualquier guitarra.
                  </span>
                </h3>
              </div>

              {/* Architectural Ebony Neck with 6 Interactive Strings */}
              <div
                className="relative overflow-hidden rounded-[12px] border border-white/12 bg-[#18181B] p-4 space-y-3"
                data-auth-strings="true"
              >
                {/* Vertical Nut + Fret Inlays */}
                <div
                  className="pointer-events-none absolute inset-y-10 left-[76px] right-4 grid grid-cols-3"
                  aria-hidden="true"
                >
                  <span className="border-l-[3px] border-zinc-300/75" />
                  <span className="border-l border-white/10 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/15" />
                  </span>
                  <span className="border-l border-white/10" />
                </div>

                <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                  <span>Afinación de sesión: {tunedPegCount}/6</span>
                  <button
                    type="button"
                    onClick={handleStrumNeck}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[10px] text-white hover:bg-white/12 transition-colors duration-150 cursor-pointer"
                  >
                    <Volume2 className="w-3 h-3 text-[#E85D3D]" />
                    <span>Rasguear</span>
                  </button>
                </div>

                <div className="relative z-10 space-y-1.5">
                  {PASS_STRINGS.map((str, idx) => {
                    const isLit = idx < tunedPegCount;
                    const pluckCount = stringPlucks[idx] ?? 0;
                    return (
                      <button
                        key={str.note}
                        type="button"
                        onClick={() => pluckPassString(idx, str.note)}
                        className="group w-full flex items-center gap-2.5 py-0.5 cursor-pointer"
                        aria-label={`Tocar cuerda ${str.label}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 transition-colors duration-150 ${
                            isLit ? 'bg-[#E85D3D]' : 'bg-zinc-700 group-hover:bg-zinc-400'
                          }`}
                        />
                        <span className="w-7 text-left font-mono text-[10px] text-zinc-400 group-hover:text-white transition-colors duration-150">
                          {str.label}
                        </span>
                        <span className="relative flex-1 h-2 flex items-center">
                          <motion.span
                            key={`auth-s-${idx}-${pluckCount}`}
                            animate={
                              pluckCount > 0 ? { scaleY: [1, 2.2, 0.8, 1] } : undefined
                            }
                            transition={{ duration: 0.28 }}
                            className={`block w-full rounded-full transition-colors duration-150 ${
                              isLit
                                ? 'bg-[#E85D3D]/85'
                                : 'bg-zinc-500/75 group-hover:bg-zinc-300'
                            }`}
                            style={{ height: `${str.thickness}px` }}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Opcional. Solo sirve para guardar tus progresiones en la nube; todas las herramientas funcionan sin cuenta.
              </p>
            </div>

            {/* Right Form Surface */}
            <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center bg-[var(--color-surface)]">
              <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
                <h2
                  id="auth-modal-title"
                  className="text-2xl font-medium text-[var(--color-ink)]"
                >
                  {tab === 'signin' ? 'Sincronizar libreta' : 'Crear cuenta'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary px-3 py-1.5 text-xs shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cerrar</span>
                </button>
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => void handleGoogleSignIn()}
                  className="btn-secondary w-full py-2.5 text-sm bg-[var(--color-surface-board)] border-[var(--color-border-strong)]"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </button>
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="font-mono text-[11px] uppercase text-[var(--color-ink-muted)]">
                  o con correo
                </span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>

              <div className="grid grid-cols-2 rounded-full bg-[var(--color-surface-subtle)] p-1 mb-4">
                {(
                  [
                    { id: 'signin', label: 'Iniciar sesión' },
                    { id: 'signup', label: 'Crear cuenta' },
                  ] as const
                ).map((item) => {
                  const active = tab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setTab(item.id);
                        setErrorMsg(null);
                      }}
                      className={`relative rounded-full py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                        active
                          ? 'text-white'
                          : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="auth-tab-pill"
                          transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute inset-0 rounded-full bg-[var(--color-ink)]"
                          aria-hidden="true"
                        />
                      )}
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
                <AnimatePresence initial={false}>
                  {tab === 'signup' && (
                    <motion.div
                      key="auth-name-wrap"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <label
                        htmlFor="auth-name"
                        className="block text-xs font-medium text-[var(--color-ink-secondary)] mb-1"
                      >
                        Nombre
                      </label>
                      <input
                        id="auth-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre"
                        required
                        className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label
                    htmlFor="auth-email"
                    className="block text-xs font-medium text-[var(--color-ink-secondary)] mb-1"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    required
                    className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-medium text-[var(--color-ink-secondary)] mb-1"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      required
                      className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] pl-3 pr-10 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {tab === 'signup' && (
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4].map((bar) => (
                        <span
                          key={bar}
                          className={`h-1 flex-1 rounded-full transition-colors duration-150 ${
                            passwordStrengthBars >= bar
                              ? passwordStrengthBars === 4
                                ? 'bg-[var(--color-ok)]'
                                : 'bg-[var(--color-accent)]'
                              : 'bg-[var(--color-surface-subtle)]'
                          }`}
                        />
                      ))}
                      <span className="font-mono text-[10px] text-[var(--color-ink-muted)] ml-1">
                        {password.length >= 8 ? 'Lista' : `${password.length}/8`}
                      </span>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div
                    role="alert"
                    className="rounded-[12px] border border-[var(--color-accent-border)] bg-[var(--color-accent-tint)] p-3 text-xs text-[var(--color-ink)]"
                  >
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary w-full py-2.5 text-sm"
                >
                  {isPending
                    ? 'Procesando...'
                    : tab === 'signin'
                      ? 'Entrar'
                      : 'Crear cuenta'}
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
