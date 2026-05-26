import React from 'react';
import type { ChordDurationBars } from '../hooks/useLiveSession';

interface LiveSessionOverlayProps {
  isActive: boolean;
  activeChord: string;
  activeChordIndex: number;
  currentMeasure: number;
  chordDurationsBars: ChordDurationBars[];
  onToggle: () => void;
  onSetChordDurationBars: (index: number, bars: ChordDurationBars) => void;
}

export const LiveSessionOverlay: React.FC<LiveSessionOverlayProps> = ({
  isActive,
  activeChord,
  activeChordIndex,
  currentMeasure,
  chordDurationsBars,
  onToggle,
  onSetChordDurationBars,
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[320px] border border-zinc-700 bg-zinc-950/95 shadow-[0_0_30px_rgba(0,0,0,0.45)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-[10px] font-mono font-bold tracking-[0.24em] text-zinc-400 uppercase">
          [LIVE] // SESSION OVERLAY
        </span>
        <button
          type="button"
          onClick={onToggle}
          className={`border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.2em] transition-colors ${
            isActive
              ? 'border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black'
              : 'border-zinc-700 text-zinc-400 hover:border-orange-500 hover:text-orange-400'
          }`}
        >
          {isActive ? 'STOP' : 'START'}
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">
          <div className="border border-zinc-800 bg-zinc-900 px-2 py-2">
            <div className="text-zinc-600">ACTIVE CHORD</div>
            <div className="mt-1 text-amber-400 text-sm font-semibold tracking-normal">{activeChord || '—'}</div>
          </div>
          <div className="border border-zinc-800 bg-zinc-900 px-2 py-2">
            <div className="text-zinc-600">MEASURE</div>
            <div className="mt-1 text-stone-200 text-sm font-semibold tracking-normal">{currentMeasure}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">CHORD DURATION</span>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-600">
              INDEX {activeChordIndex + 1}
            </span>
          </div>

          <div className="grid gap-2">
            {chordDurationsBars.map((bars, index) => (
              <div key={`chord-duration-${index}`} className="flex items-center justify-between border border-zinc-800 bg-zinc-900 px-2 py-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-500">
                  CHORD {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetChordDurationBars(index, 1)}
                    className={`border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] ${
                      bars === 1
                        ? 'border-orange-500 text-orange-400 bg-zinc-950'
                        : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    1M
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetChordDurationBars(index, 2)}
                    className={`border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] ${
                      bars === 2
                        ? 'border-orange-500 text-orange-400 bg-zinc-950'
                        : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    2M
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};