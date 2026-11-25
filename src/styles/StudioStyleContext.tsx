import React from 'react';
import type { StudioThemeId } from './studioThemes';
import { StudioStyleContext } from './useStudioStyle';

export interface StudioStyleProviderProps {
  studioStyle: StudioThemeId;
  setStudioStyle: (style: StudioThemeId) => void;
  children: React.ReactNode;
}

export const StudioStyleProvider: React.FC<StudioStyleProviderProps> = ({
  studioStyle,
  setStudioStyle,
  children,
}) => {
  return (
    <StudioStyleContext.Provider value={{ studioStyle, setStudioStyle }}>
      {children}
    </StudioStyleContext.Provider>
  );
};
