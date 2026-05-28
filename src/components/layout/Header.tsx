import React, { useRef, useState, useEffect } from 'react';
import type { ThemeId, ThemeDefinition } from '../../utils/themeEngine';
import { isLightTheme } from '../../utils/themeEngine';

interface HeaderProps {
  currentTheme: ThemeId;
  themes: ThemeDefinition[];
  onSetTheme: (id: ThemeId) => void;
  onPreviewTheme: (id: ThemeId) => void;
  onResetPreview: () => void;
  isLoading?: boolean;
  isPlaying?: boolean;
  onOpenDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTheme,
  themes,
  onSetTheme,
  onPreviewTheme,
  onResetPreview,
  onOpenDashboard,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        onResetPreview();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen, onResetPreview]);

  const currentDef = themes.find((t) => t.id === currentTheme) ?? themes[0];
  const light = isLightTheme(currentTheme);

  // Get real sample rate from Tone.js context (captured once)
  const [sampleRate, setSampleRate] = useState('44.1');
  useEffect(() => {
    const tryGetRate = async () => {
      try {
        const Tone = await import('tone');
        const rate = Tone.getContext().sampleRate;
        setSampleRate((rate / 1000).toFixed(1));
      } catch {
        // Tone not available yet
      }
    };
    tryGetRate();
  }, []);

  return (
    <header className={`w-full border-b px-6 py-4 flex items-center justify-between select-none ${light ? 'border-[var(--border-color)] bg-[var(--bg-secondary)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'}`}>
      <div className="flex items-center space-x-4">
        {/* Brutalist Bold Title */}
        <h1 className="text-xl font-bold tracking-widest text-[var(--text-primary)] font-sans">
          ACORDIFY
        </h1>
        {/* Subtitle/Mode Indicator */}
        <span className="hidden sm:inline-block border border-[var(--border-color)] px-2 py-0.5 text-2xs font-mono uppercase tracking-widest text-[var(--text-secondary)] bg-[var(--bg-tertiary)]">
          STUDIO CORE v1.0
        </span>
      </div>
      
      {/* Decorative Hardware Info (Analogue Vibe) */}
      <div className="flex items-center space-x-6 text-2xs font-mono text-[var(--text-muted)]">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 bg-[var(--accent-primary)] animate-pulse rounded-none"></span>
          <span className="uppercase tracking-wider text-[var(--text-secondary)]">
            THEME: {currentDef.name.split(' ')[0]}
          </span>
        </div>
        <div className="hidden md:flex items-center space-x-3">
          <span>INPUT: LINE/MIC</span>
          <span>•</span>
          <span>OUT: MONO</span>
          <span>•</span>
          <span className="text-[var(--text-secondary)]">{sampleRate} KHZ</span>
        </div>

        {/* Dashboard Button */}
        {onOpenDashboard && (
          <button
            type="button"
            onClick={onOpenDashboard}
            className="border border-[var(--border-color)] px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
          >
            [ DASHBOARD ]
          </button>
        )}

        {/* Theme Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="border border-[var(--border-color)] px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
          >
            [ THEME: {currentDef.name} ▾ ]
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-lg z-50 max-h-80 overflow-y-auto">
              {themes.map((theme) => {
                const isActive = theme.id === currentTheme;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      onSetTheme(theme.id);
                      setDropdownOpen(false);
                    }}
                    onMouseEnter={() => onPreviewTheme(theme.id)}
                    onMouseLeave={onResetPreview}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[var(--bg-tertiary)] text-[var(--accent-primary)]'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {/* Color Preview Swatches */}
                    <div className="flex gap-0.5 shrink-0">
                      <div className="w-3 h-3 rounded-none border border-black/20" style={{ backgroundColor: theme.vars['--bg-primary'] }} />
                      <div className="w-3 h-3 rounded-none border border-black/20" style={{ backgroundColor: theme.vars['--bg-secondary'] }} />
                      <div className="w-3 h-3 rounded-none border border-black/20" style={{ backgroundColor: theme.vars['--bg-tertiary'] }} />
                      <div className="w-3 h-3 rounded-none border border-black/20" style={{ backgroundColor: theme.vars['--accent-primary'] }} />
                    </div>
                    <span className="flex-1">{theme.name}</span>
                    {isActive && (
                      <span className="text-[var(--accent-secondary)] text-[8px]">●</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
