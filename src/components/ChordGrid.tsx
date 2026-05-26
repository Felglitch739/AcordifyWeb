import React from 'react';
import { Fretboard } from './Fretboard';
import { getChordData, transposeChord } from '../utils';

interface ChordGridProps {
  chords: string[];
  transposeSteps?: number;
  onBypass?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ChordGrid: React.FC<ChordGridProps> = ({ chords, transposeSteps = 0, onBypass, collapsed = false, onToggleCollapse }) => {
  return (
    <div className="border border-zinc-700 bg-zinc-800 p-6 rounded-sm shadow-md flex flex-col space-y-6 select-none">
      {/* Module Header Bar */}
      <div
        className="flex items-center justify-between border-b border-zinc-700 pb-2 cursor-pointer"
        onClick={onToggleCollapse}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleCollapse?.();
          }
        }}
      >
        <span className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
          [MONITOR] // SIGNAL PROGRESSION
        </span>
        <div className="flex items-center space-x-3">
          <span className="hidden xs:inline-block text-[10px] font-mono text-zinc-500 uppercase">
            CHORDS x04
          </span>
          {onBypass && (
            <button 
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onBypass();
              }}
              className="text-[9px] font-mono text-zinc-500 hover:text-red-500 border border-zinc-700 hover:border-red-900/50 px-1 py-0.5 rounded-sm bg-zinc-900 uppercase transition-colors cursor-pointer"
            >
              [ BYPASS ]
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        /* Taller Hardware Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          {chords.map((chordName, index) => {
            const transposedChordName = transposeChord(chordName, transposeSteps);
            const chordInfo = getChordData(transposedChordName);

            return (
              <div 
                key={`${chordName}-${index}`} 
                className="bg-zinc-950 border-[3px] border-zinc-800 p-6 h-105 flex flex-col justify-between rounded-sm relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.99]"
              >
                {/* Badge de Estado de Hardware */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-[10px] font-mono tracking-wider text-emerald-500 flex items-center gap-1.5 uppercase font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]"></span>
                    DICT SYNCED
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600">CH_0{index + 1}</span>
                </div>

                {/* Nombre del Acorde Gigante */}
                <div className="my-2">
                  <h3 className="font-mono text-5xl font-bold text-zinc-100 tracking-tight uppercase truncate">
                    {transposedChordName}
                  </h3>
                  <p className="text-[10px] font-mono text-zinc-500 mt-1">STANDARD VOICING</p>
                </div>

                {/* El Fretboard SVG Estirado y con Presencia */}
                <div className="w-full h-56 flex items-center justify-center bg-zinc-900/40 border border-zinc-900/60 p-2 rounded-sm">
                  <Fretboard frets={chordInfo.frets} startFret={chordInfo.startFret || 1} />
                </div>

                {/* Control Táctil de Variación de Canal */}
                <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-zinc-500">
                  <span className="text-xs font-mono text-orange-500">[VAR: 1/1]</span>
                  <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 font-semibold">Studio Core</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
