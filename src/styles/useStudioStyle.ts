import { createContext, useContext } from 'react';
import type { StudioThemeId } from './studioThemes';

export interface StudioStyleContextValue {
  studioStyle: StudioThemeId;
  setStudioStyle: (style: StudioThemeId) => void;
}

export const StudioStyleContext = createContext<StudioStyleContextValue>({
  studioStyle: 'luthier',
  setStudioStyle: () => undefined,
});

export function useStudioStyle(): StudioStyleContextValue {
  return useContext(StudioStyleContext);
}
