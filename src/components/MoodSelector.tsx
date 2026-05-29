import React from 'react';
import { playClickSound } from '../utils';
import { PanelWrapper } from './PanelWrapper';

interface MoodSelectorProps {
  value: string;
  onChange: (mood: string) => void;
  customMood: string;
  onCustomMoodChange: (value: string) => void;
  onBypass?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const MAX_CUSTOM_CHARS = 40;

export const MoodSelector: React.FC<MoodSelectorProps> = ({
  value,
  onChange,
  customMood,
  onCustomMoodChange,
  onBypass,
  collapsed = false,
  onToggleCollapse,
}) => {
  const options = [
    { id: 'Jazzy Melancólico', label: 'JAZZ MELANCOLICO', desc: 'Muted minor extensions & slow temp' },
    { id: 'Indie Rock Energético', label: 'INDIE ROCK ENERGETICO', desc: 'Overdriven drive, grit & raw power' },
    { id: 'Pop Acústico Relajado', label: 'POP ACUSTICO RELAJADO', desc: 'Warm open chords & bright textures' },
    { id: 'Neo-Soul Cálido', label: 'NEO SOUL CALIDO', desc: 'Lush 9ths, silky voicings, late-night groove' },
    { id: 'Lo-Fi Chill', label: 'LO-FI CHILL', desc: 'Dusty chords, mellow swing, soft edges' },
    { id: 'Synthwave Nocturno', label: 'SYNTHWAVE NOCTURNO', desc: 'Retro pads, minor keys, neon drive' },
    { id: 'Bossa Nova Suave', label: 'BOSSA NOVA SUAVE', desc: 'Syncopated sway, jazz colors, light touch' },
    { id: 'Cumbia Urbana', label: 'CUMBIA URBANA', desc: 'Percussive pulse, festive minor vibes' },
    { id: 'Folk Íntimo', label: 'FOLK INTIMO', desc: 'Acoustic warmth, storytelling focus' },
  ];

  const isCustomActive = customMood.trim().length > 0;

  const handleSelect = (id: string) => {
    if (value !== id || isCustomActive) {
      playClickSound('down');
      setTimeout(() => playClickSound('up'), 50);
      // Clear custom mood when selecting a preset
      if (isCustomActive) {
        onCustomMoodChange('');
      }
      onChange(id);
    }
  };

  const handleCustomChange = (text: string) => {
    const clamped = text.slice(0, MAX_CUSTOM_CHARS);
    onCustomMoodChange(clamped);
    if (clamped.trim().length > 0) {
      // Trigger mood change with custom text
      onChange(clamped);
    }
  };

  return (
    <PanelWrapper
      className="bg-[var(--bg-tertiary)]"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onBypass={onBypass}
      title={(
        <label className="text-2xs font-mono font-bold tracking-wider text-[var(--text-secondary)] uppercase">
          [CONTROL PANEL] // MOOD CHASSIS SELECT
        </label>
      )}
      rightSlot={(
        <span className="hidden xs:inline-block text-[10px] font-mono text-[var(--accent-primary)] font-bold uppercase animate-pulse">
          • ACTIVE SELECT
        </span>
      )}
      contentClassName="p-4 pt-3 flex flex-col space-y-3"
    >
      {/* Retro Physical Tape-Deck Selector Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {options.map((option) => {
          const isSelected = value === option.id && !isCustomActive;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`text-left p-3 border font-mono rounded-sm transition-all relative ${
                isSelected
                  ? 'bg-[var(--bg-primary)] border-[var(--accent-primary)] text-[var(--text-primary)] shadow-inner'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xs font-semibold tracking-wide">
                  {option.label}
                </span>
                <span className={`w-2 h-2 rounded-sm ${isSelected ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-primary)]'}`}></span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] font-sans tracking-tight">
                {option.desc}
              </p>
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--accent-primary)]"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Genre Input */}
      <div className="pt-2 border-t border-[var(--border-color)] flex flex-col space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
            [CUSTOM] // GÉNERO LIBRE
          </span>
          <span className="text-[9px] font-mono text-[var(--text-muted)]">
            {customMood.length}/{MAX_CUSTOM_CHARS}
          </span>
        </div>
        <input
          type="text"
          value={customMood}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="ej: bolero, trap melancólico, bossa nova..."
          maxLength={MAX_CUSTOM_CHARS}
          className={`w-full bg-[var(--bg-primary)] border text-[var(--text-primary)] text-xs font-mono p-2 rounded-sm focus:outline-none transition-colors ${
            isCustomActive
              ? 'border-[var(--accent-primary)] shadow-[0_0_0_1px_var(--accent-primary)]'
              : 'border-[var(--border-color)] focus:border-[var(--accent-primary)]'
          }`}
        />
      </div>

      {/* Classic Studio Fallback Select Input */}
      <div className="flex flex-col space-y-1.5">
        <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
          Analogue Dial Bypass:
        </span>
        <select
          value={isCustomActive ? '' : value}
          onChange={(e) => {
            if (e.target.value) {
              handleSelect(e.target.value);
            }
          }}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs font-mono p-2 rounded-sm focus:outline-none focus:border-[var(--accent-primary)] cursor-pointer"
        >
          {isCustomActive && (
            <option value="" className="bg-[var(--bg-secondary)]">
              CUSTOM: {customMood}
            </option>
          )}
          {options.map((option) => (
            <option key={option.id} value={option.id} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </PanelWrapper>
  );
};
