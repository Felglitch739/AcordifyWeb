import {
  createInternalNeonAuth,
  type ReactBetterAuthClient,
} from '@neon/auth';
import {
  BetterAuthReactAdapter,
  type BetterAuthReactAdapterInstance,
} from '@neon/auth/react/adapters';

const AUTH_URL =
  typeof import.meta !== 'undefined'
    ? (import.meta.env.VITE_NEON_AUTH_URL as string | undefined)?.trim() ?? ''
    : '';

export const isNeonAuthConfigured = AUTH_URL.length > 0;

const internalAuth = isNeonAuthConfigured
  ? createInternalNeonAuth<BetterAuthReactAdapterInstance>(AUTH_URL, {
      adapter: BetterAuthReactAdapter(),
    })
  : null;

export const authClient: ReactBetterAuthClient | null = internalAuth?.adapter ?? null;

export interface AuthUserSummary {
  id: string;
  email: string;
  name: string;
}

export async function getAuthBearerToken(): Promise<string | null> {
  if (!internalAuth || !authClient) return null;
  try {
    const jwt = await internalAuth.getJWTToken();
    if (typeof jwt === 'string' && jwt.split('.').length === 3) {
      return jwt;
    }

    const tokenRes = await authClient.$fetch<{ token?: string }>('/token', {
      method: 'GET',
    });
    const fallbackJwt = tokenRes?.data?.token;
    return typeof fallbackJwt === 'string' && fallbackJwt.length > 0
      ? fallbackJwt
      : null;
  } catch {
    return null;
  }
}
