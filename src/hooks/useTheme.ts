import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyTheme,
  DEFAULT_THEME,
  getThemeById,
  getThemeList,
  THEME_STORAGE_KEY,
  type ThemeId,
  type ThemeDefinition,
} from '../utils/themeEngine';

export interface UseThemeReturn {
  currentTheme: ThemeId;
  themes: ThemeDefinition[];
  setTheme: (id: ThemeId) => void;
  previewTheme: (id: ThemeId) => void;
  resetPreview: () => void;
  currentDefinition: ThemeDefinition;
}

function loadPersistedTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      // Validate it's a real theme
      const found = getThemeList().find((t) => t.id === stored);
      if (found) return found.id;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_THEME;
}

/**
 * Hook that manages the active Acordify theme.
 * - Reads persisted theme from localStorage on mount
 * - Applies CSS variables to :root
 * - Supports hover-preview (applies temporarily without saving)
 */
export function useTheme(): UseThemeReturn {
  const [currentTheme, setCurrentThemeState] = useState<ThemeId>(loadPersistedTheme);
  const previewRef = useRef<ThemeId | null>(null);

  // Apply on mount
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = useCallback((id: ThemeId) => {
    previewRef.current = null;
    setCurrentThemeState(id);
    applyTheme(id);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // ignore write failures
    }
  }, []);

  const previewTheme = useCallback((id: ThemeId) => {
    previewRef.current = id;
    applyTheme(id);
  }, []);

  const resetPreview = useCallback(() => {
    if (previewRef.current !== null) {
      previewRef.current = null;
      applyTheme(currentTheme);
    }
  }, [currentTheme]);

  return {
    currentTheme,
    themes: getThemeList(),
    setTheme,
    previewTheme,
    resetPreview,
    currentDefinition: getThemeById(currentTheme),
  };
}
