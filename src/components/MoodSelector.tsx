import React from 'react';
import { playClickSound } from '../utils';
import { PanelWrapper } from './PanelWrapper';

interface MoodSelectorProps {
  value: string;
  onChange: (mood: string) => void;
  onBypass?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const MoodSelector: React.FC<MoodSelectorProps> = ({ value, onChange, onBypass, collapsed = false, onToggleCollapse }) => {
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

  const handleSelect = (id: string) => {
    if (value !== id) {
      playClickSound('down');
      setTimeout(() => playClickSound('up'), 50); // double click sound for heavy switch
      onChange(id);
    }
  };

  return (
    <PanelWrapper
      className="bg-zinc-800"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onBypass={onBypass}
      title={(
        <label className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
          [CONTROL PANEL] // MOOD CHASSIS SELECT
        </label>
      )}
      rightSlot={(
        <span className="hidden xs:inline-block text-[10px] font-mono text-amber-500 font-bold uppercase animate-pulse">
          • ACTIVE SELECT
        </span>
      )}
      contentClassName="p-4 pt-3 flex flex-col space-y-3"
    >
      {/* Retro Physical Tape-Deck Selector Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {options.map((option) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.id)}
              className={`text-left p-3 border font-mono rounded-sm transition-all relative ${
                isSelected
                  ? 'bg-zinc-950 border-amber-500 text-stone-200 shadow-inner'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-2xs font-semibold tracking-wide">
                  {option.label}
                </span>
                <span className={`w-2 h-2 rounded-sm ${isSelected ? 'bg-amber-500' : 'bg-zinc-800'}`}></span>
              </div>
              <p className="text-[10px] text-zinc-500 font-sans tracking-tight">
                {option.desc}
              </p>
              {isSelected && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Classic Studio Fallback Select Input */}
      <div className="pt-2 flex flex-col space-y-1.5">
        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          Analogue Dial Bypass:
        </span>
        <select
          value={value}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 text-stone-200 text-xs font-mono p-2 rounded-sm focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id} className="bg-zinc-900 text-stone-200">
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </PanelWrapper>
  );
};
