export type StudioThemeId = 'apple' | 'op1' | 'vinyl' | 'luthier';

export interface StudioThemeOption {
  id: StudioThemeId;
  label: string;
  shortLabel: string;
  tagline: string;
  swatch: string;
  themeColor: string;
  isDark: boolean;
}

export const STUDIO_THEMES: readonly StudioThemeOption[] = [
  {
    id: 'apple',
    label: 'Apple Studio',
    shortLabel: 'Apple',
    tagline: 'Liquid Glass & Cerámica',
    swatch: '#0071E3',
    themeColor: '#F5F5F7',
    isDark: false,
  },
  {
    id: 'op1',
    label: 'OP-1 Field',
    shortLabel: 'OP-1',
    tagline: 'Hardware Táctil & Cinta',
    swatch: '#FF5722',
    themeColor: '#E6E4DE',
    isDark: false,
  },
  {
    id: 'vinyl',
    label: 'Vinilo Zine',
    shortLabel: 'Vinilo',
    tagline: 'Editorial & Risografía',
    swatch: '#E8432D',
    themeColor: '#F3EDE0',
    isDark: false,
  },
  {
    id: 'luthier',
    label: 'Luthier Nocturno',
    shortLabel: 'Luthier',
    tagline: 'Nogal & Estudio Cálido',
    swatch: '#E29552',
    themeColor: '#11100E',
    isDark: true,
  },
] as const;

const STUDIO_STORAGE_KEY = 'acordify_ui_style';

export function isValidStudioTheme(value: unknown): value is StudioThemeId {
  return value === 'apple' || value === 'op1' || value === 'vinyl' || value === 'luthier';
}

export function readInitialStudioTheme(): StudioThemeId {
  if (typeof window === 'undefined') return 'apple';

  try {
    const params = new URLSearchParams(window.location.search);
    const paramStyle = params.get('style');
    if (isValidStudioTheme(paramStyle)) {
      return paramStyle;
    }

    const stored = window.localStorage.getItem(STUDIO_STORAGE_KEY);
    if (isValidStudioTheme(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage/URL restrictions
  }

  return 'apple';
}

export function persistStudioTheme(id: StudioThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STUDIO_STORAGE_KEY, id);
  } catch {
    // Ignore storage write errors
  }
}
