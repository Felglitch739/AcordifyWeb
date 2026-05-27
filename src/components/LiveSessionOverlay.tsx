import React from 'react';
import type { ChordDurationBars } from '../hooks/useLiveSession';
import type { LiveSessionState } from '../utils';

interface LiveSessionOverlayProps {
  state: LiveSessionState;
  onToggle: () => void;
  onSetChordDuration: (index: number, bars: ChordDurationBars) => void;
}

export const LiveSessionOverlay: React.FC<LiveSessionOverlayProps> = ({
  state,
  onToggle,
  onSetChordDuration,
}) => {
  const [pulse, setPulse] = React.useState(false);

  React.useEffect(() => {
    if (!state.activeChord) {
      setPulse(false);
      return;
    }

    setPulse(true);
    const timeoutId = window.setTimeout(() => {
      setPulse(false);
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [state.activeChord]);

  return (
    <div className="w-full border border-zinc-700 bg-zinc-950/95 shadow-[0_0_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <span className="text-[10px] font-mono font-bold tracking-[0.24em] text-zinc-400 uppercase">
          [LIVE] // SESSION OVERLAY
        </span>
        <button
          type="button"
          onClick={onToggle}
          className={`border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.2em] transition-colors ${
            state.isLive
              ? 'border-red-500 text-red-400 hover:bg-red-500 hover:text-black'
              : 'border-emerald-500 text-emerald-400 hover:bg-emerald-500 hover:text-black'
          }`}
        >
          {state.isLive ? 'STOP' : 'START'}
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">
          <div className="border border-zinc-800 bg-zinc-900 px-2 py-2">
            <div className="text-zinc-600">ACTIVE CHORD</div>
            <div className={`mt-1 text-sm font-semibold tracking-normal text-orange-400 transition-transform duration-200 ${pulse ? 'scale-[1.08]' : 'scale-100'}`}>
              {state.activeChord || '—'}
            </div>
          </div>
          <div className="border border-zinc-800 bg-zinc-900 px-2 py-2">
            <div className="text-zinc-600">MEASURE</div>
            <div className="mt-1 text-stone-200 text-sm font-semibold tracking-normal">
              BAR {String(state.currentBar).padStart(3, '0')}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">CHORD DURATION</span>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-zinc-600">
              TOTAL BARS {String(state.totalBars).padStart(3, '0')}
            </span>
          </div>

          <div className="grid gap-2">
            {state.chordSlots.map((slot) => (
              <div
                key={`chord-duration-${slot.index}`}
                className={`flex items-center justify-between border bg-zinc-900 px-2 py-2 ${state.activeChordIndex === slot.index ? 'border-orange-500' : 'border-zinc-800'}`}
              >
                <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-zinc-500">
                  CHORD {slot.index + 1}  {slot.chord || '—'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSetChordDuration(slot.index, 1)}
                    className={`border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] ${
                      slot.durationBars === 1
                        ? 'border-orange-500 text-orange-400 bg-zinc-950'
                        : 'border-zinc-700 text-zinc-500'
                    }`}
                  >
                    1M
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetChordDuration(slot.index, 2)}
                    className={`border px-2 py-1 text-[9px] font-mono uppercase tracking-[0.16em] ${
                      slot.durationBars === 2
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