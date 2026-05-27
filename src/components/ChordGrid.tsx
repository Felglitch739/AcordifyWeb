import React from 'react';
import { Fretboard } from './Fretboard';
import { PanelWrapper } from './PanelWrapper';
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
    <PanelWrapper
      className="bg-zinc-800"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onBypass={onBypass}
      title={(
        <span className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
          [MONITOR] // SIGNAL PROGRESSION
        </span>
      )}
      rightSlot={(
        <span className="hidden xs:inline-block text-[10px] font-mono text-zinc-500 uppercase">
          CHORDS x04
        </span>
      )}
      contentClassName="p-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {chords.map((chordName, index) => {
          const transposedChordName = transposeChord(chordName, transposeSteps);
          const chordInfo = getChordData(transposedChordName);

          return (
            <div
              key={`${chordName}-${index}`}
              className="bg-zinc-950 border-[3px] border-zinc-800 p-6 h-105 flex flex-col justify-between rounded-sm relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.99]"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                <span className="text-[10px] font-mono tracking-wider text-emerald-500 flex items-center gap-1.5 uppercase font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]"></span>
                  DICT SYNCED
                </span>
                <span className="text-[10px] font-mono text-zinc-600">CH_0{index + 1}</span>
              </div>

              <div className="my-2">
                <h3 className="font-mono text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight uppercase leading-none">
                  {transposedChordName}
                </h3>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">STANDARD VOICING</p>
              </div>

              <div className="w-full h-56 flex items-center justify-center bg-zinc-900/40 border border-zinc-900/60 p-2 rounded-sm">
                <Fretboard frets={chordInfo.frets} startFret={chordInfo.startFret || 1} />
              </div>

              <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-zinc-500">
                <span className="text-xs font-mono text-orange-500">[VAR: 1/1]</span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 font-semibold">Studio Core</span>
              </div>
            </div>
          );
        })}
      </div>
    </PanelWrapper>
  );
};
