// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// themeEngine.ts — Acordify Theme Engine
// Manages 9 visual themes via CSS custom properties on :root
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type ThemeId =
  | 'dark-industrial'
  | 'midnight-blue'
  | 'forest-studio'
  | 'synthwave-neon'
  | 'amber-analog'
  | 'minimal-light'
  | 'blood-red'
  | 'slate-pro'
  | 'arctic';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  vars: {
    '--bg-primary': string;
    '--bg-secondary': string;
    '--bg-tertiary': string;
    '--accent-primary': string;
    '--accent-secondary': string;
    '--text-primary': string;
    '--text-secondary': string;
    '--text-muted': string;
    '--border-color': string;
    '--status-active': string;
  };
}

const THEMES: ThemeDefinition[] = [
  {
    id: 'dark-industrial',
    name: 'DARK INDUSTRIAL',
    vars: {
      '--bg-primary': '#0a0a0a',
      '--bg-secondary': '#111111',
      '--bg-tertiary': '#1a1a1a',
      '--accent-primary': '#f97316',
      '--accent-secondary': '#22c55e',
      '--text-primary': '#ffffff',
      '--text-secondary': '#a1a1aa',
      '--text-muted': '#52525b',
      '--border-color': '#27272a',
      '--status-active': '#22c55e',
    },
  },
  {
    id: 'midnight-blue',
    name: 'MIDNIGHT BLUE',
    vars: {
      '--bg-primary': '#030712',
      '--bg-secondary': '#0f172a',
      '--bg-tertiary': '#1e293b',
      '--accent-primary': '#3b82f6',
      '--accent-secondary': '#06b6d4',
      '--text-primary': '#f1f5f9',
      '--text-secondary': '#94a3b8',
      '--text-muted': '#475569',
      '--border-color': '#1e3a5f',
      '--status-active': '#06b6d4',
    },
  },
  {
    id: 'forest-studio',
    name: 'FOREST STUDIO',
    vars: {
      '--bg-primary': '#0a0f0a',
      '--bg-secondary': '#0f1a0f',
      '--bg-tertiary': '#1a2e1a',
      '--accent-primary': '#4ade80',
      '--accent-secondary': '#a3e635',
      '--text-primary': '#f0fdf4',
      '--text-secondary': '#86efac',
      '--text-muted': '#4ade80',
      '--border-color': '#166534',
      '--status-active': '#a3e635',
    },
  },
  {
    id: 'synthwave-neon',
    name: 'SYNTHWAVE NEON',
    vars: {
      '--bg-primary': '#0d0015',
      '--bg-secondary': '#1a0030',
      '--bg-tertiary': '#2d0050',
      '--accent-primary': '#e879f9',
      '--accent-secondary': '#06b6d4',
      '--text-primary': '#fdf4ff',
      '--text-secondary': '#d946ef',
      '--text-muted': '#a855f7',
      '--border-color': '#7c3aed',
      '--status-active': '#06b6d4',
    },
  },
  {
    id: 'amber-analog',
    name: 'AMBER ANALOG',
    vars: {
      '--bg-primary': '#0c0800',
      '--bg-secondary': '#1a1200',
      '--bg-tertiary': '#2e1f00',
      '--accent-primary': '#f59e0b',
      '--accent-secondary': '#fbbf24',
      '--text-primary': '#fffbeb',
      '--text-secondary': '#fcd34d',
      '--text-muted': '#92400e',
      '--border-color': '#92400e',
      '--status-active': '#fbbf24',
    },
  },
  {
    id: 'minimal-light',
    name: 'MINIMAL LIGHT',
    vars: {
      '--bg-primary': '#f8fafc',
      '--bg-secondary': '#ffffff',
      '--bg-tertiary': '#f1f5f9',
      '--accent-primary': '#1d4ed8',
      '--accent-secondary': '#059669',
      '--text-primary': '#0f172a',
      '--text-secondary': '#475569',
      '--text-muted': '#94a3b8',
      '--border-color': '#e2e8f0',
      '--status-active': '#059669',
    },
  },
  {
    id: 'blood-red',
    name: 'BLOOD RED',
    vars: {
      '--bg-primary': '#0a0000',
      '--bg-secondary': '#1a0000',
      '--bg-tertiary': '#2e0000',
      '--accent-primary': '#ef4444',
      '--accent-secondary': '#f97316',
      '--text-primary': '#fff1f2',
      '--text-secondary': '#fca5a5',
      '--text-muted': '#991b1b',
      '--border-color': '#7f1d1d',
      '--status-active': '#f97316',
    },
  },
  {
    id: 'slate-pro',
    name: 'SLATE PRO',
    vars: {
      '--bg-primary': '#0f0f11',
      '--bg-secondary': '#18181b',
      '--bg-tertiary': '#27272a',
      '--accent-primary': '#a78bfa',
      '--accent-secondary': '#818cf8',
      '--text-primary': '#fafafa',
      '--text-secondary': '#a1a1aa',
      '--text-muted': '#52525b',
      '--border-color': '#3f3f46',
      '--status-active': '#818cf8',
    },
  },
  {
    id: 'arctic',
    name: 'ARCTIC',
    vars: {
      '--bg-primary': '#f0f4f8',
      '--bg-secondary': '#e2e8f0',
      '--bg-tertiary': '#cbd5e1',
      '--accent-primary': '#0891b2',
      '--accent-secondary': '#0284c7',
      '--text-primary': '#0f172a',
      '--text-secondary': '#334155',
      '--text-muted': '#64748b',
      '--border-color': '#94a3b8',
      '--status-active': '#0284c7',
    },
  },
];

/** Returns the full list of available themes. */
export function getThemeList(): ThemeDefinition[] {
  return THEMES;
}

/** Returns a single theme by ID, falling back to Dark Industrial. */
export function getThemeById(id: string): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Applies a theme's CSS custom properties to the :root element. */
export function applyTheme(themeId: ThemeId): void {
  const theme = getThemeById(themeId);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(key, value);
  }
}

/** Checks whether a theme uses light backgrounds (for conditional class). */
export function isLightTheme(themeId: ThemeId): boolean {
  return themeId === 'minimal-light' || themeId === 'arctic';
}

/** Default theme ID */
export const DEFAULT_THEME: ThemeId = 'dark-industrial';

/** Storage key */
export const THEME_STORAGE_KEY = 'acordify_theme';
