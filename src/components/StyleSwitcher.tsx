import React from 'react';
import { motion } from 'motion/react';
import { STUDIO_THEMES, type StudioThemeId } from '../styles/studioThemes';
import { useStudioStyle } from '../styles/useStudioStyle';

interface StyleSwitcherProps {
  compact?: boolean;
}

export const StyleSwitcher: React.FC<StyleSwitcherProps> = ({ compact = false }) => {
  const { studioStyle, setStudioStyle } = useStudioStyle();

  const containerClass =
    studioStyle === 'vinyl'
      ? 'inline-flex items-center gap-1 rounded-md border-2 border-[#141210] bg-[#FFFDF7] p-0.5 shadow-[2px_2px_0_#141210]'
      : studioStyle === 'op1'
        ? 'inline-flex items-center gap-0.5 rounded-xl border border-[#18191B]/18 bg-[#DCD8CF] p-0.5 shadow-inner'
        : studioStyle === 'apple'
          ? 'inline-flex items-center gap-0.5 rounded-full border border-black/10 bg-white/75 backdrop-blur-md p-0.5 shadow-sm'
          : 'inline-flex items-center gap-0.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-recessed)] p-0.5';

  return (
    <div
      role="group"
      aria-label="Selector de estilo visual"
      className={containerClass}
    >
      {STUDIO_THEMES.map((theme) => {
        const active = studioStyle === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setStudioStyle(theme.id as StudioThemeId)}
            aria-pressed={active}
            title={`${theme.label} — ${theme.tagline}`}
            className={`relative inline-flex items-center gap-1.5 px-2.5 ${
              compact ? 'py-1 text-[11px]' : 'py-1.5 text-xs'
            } font-medium transition-colors cursor-pointer whitespace-nowrap ${
              studioStyle === 'vinyl' ? 'rounded-[4px]' : studioStyle === 'apple' ? 'rounded-full' : 'rounded-lg'
            } ${
              active
                ? studioStyle === 'vinyl'
                  ? 'text-[#FFFDF7]'
                  : studioStyle === 'apple'
                    ? 'text-[#1D1D1F] font-semibold'
                    : studioStyle === 'op1'
                      ? 'text-[#18191B] font-semibold'
                      : 'text-[var(--text-primary)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {active && (
              <motion.span
                layoutId={
                  compact
                    ? 'acordify-studio-style-pill-compact'
                    : 'acordify-studio-style-pill-desktop'
                }
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className={`absolute inset-0 ${
                  studioStyle === 'vinyl'
                    ? 'rounded-[4px] bg-[#141210]'
                    : studioStyle === 'apple'
                      ? 'rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.12)]'
                      : studioStyle === 'op1'
                        ? 'rounded-lg bg-[#FAF8F4] shadow-[0_2px_0_#C4BFB4]'
                        : 'rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)]'
                }`}
              />
            )}
            <span
              className="relative z-10 h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: theme.swatch }}
            />
            <span className="relative z-10">{theme.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
};
