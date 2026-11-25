import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { authClient } from '../lib/neonAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

type AuthTab = 'signin' | 'signup';

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
}) => {
  const [tab, setTab] = useState<AuthTab>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
  if (!isOpen || !client) return null;

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    setIsPending(true);
    try {
      const res = await client.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin,
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
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-backdrop)] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-card w-full max-w-md p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Opcional · Libreta sincronizada
            </p>
            <h2
              id="auth-modal-title"
              className="text-2xl font-medium text-[var(--color-ink)] mt-1"
            >
              {tab === 'signin' ? 'Sincronizar libreta' : 'Crear cuenta'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cerrar</span>
          </button>
        </div>

        {/* Google OAuth Button */}
        <div className="mt-5">
          <button
            type="button"
            disabled={isPending}
            onClick={() => void handleGoogleSignIn()}
            className="btn-secondary w-full py-2.5 text-sm bg-[var(--color-surface)] border-[var(--color-border-strong)]"
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
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setErrorMsg(null);
            }}
            className={`rounded-full py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              tab === 'signin'
                ? 'bg-[var(--color-ink)] text-white'
                : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setErrorMsg(null);
            }}
            className={`rounded-full py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              tab === 'signup'
                ? 'bg-[var(--color-ink)] text-white'
                : 'text-[var(--color-ink-secondary)] hover:text-[var(--color-ink)]'
            }`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3.5">
          {tab === 'signup' && (
            <div>
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
            </div>
          )}

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
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              required
              className="w-full rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-board)] px-3 py-2 text-sm text-[var(--color-ink)] focus:border-[var(--color-ink)] focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="rounded-[12px] border border-[var(--color-accent-border)] bg-[var(--color-accent-tint)] p-3 text-xs text-[var(--color-ink)]">
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
    </div>
  );
};
