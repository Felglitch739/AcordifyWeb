import React from 'react';
import type { StrumPattern, StrumState } from '../utils/strumPatterns';

interface Props {
  state: StrumState;
  onPrevPattern: () => void;
  onNextPattern: () => void;
  onTogglePlay: () => void;
  onBypass?: () => void;
}

const arrowFor = (dir: string) => {
  if (dir === 'down') return '↓';
  if (dir === 'up') return '↑';
  if (dir === 'mute') return '✕';
  return '—';
};

export const StrumsVisualizer: React.FC<Props> = ({ state, onPrevPattern, onNextPattern, onTogglePlay, onBypass }) => {
  const { pattern, currentBeat, currentBar, isPlaying } = state;

  return (
    <div className="bg-zinc-900 border border-zinc-700 p-3 rounded-sm shadow-md select-none">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-xs text-stone-200">[STRUMS] // VISUALIZADOR DE RASGUEO</div>
        <div className="flex items-center space-x-2">
          <button className="text-2xs font-mono border border-zinc-700 px-2 py-1" onClick={onBypass}>[ BYPASS ]</button>
          <div className="font-mono text-2xs text-zinc-400">BAR {String(currentBar).padStart(3, '0')}</div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex items-center space-x-2">
          {pattern.beats.map((b, idx) => {
            const active = idx === currentBeat;
            const isDown = b.direction === 'down';
            const color = active ? (isDown ? 'text-orange-500' : 'text-emerald-500') : 'text-zinc-600';
            const scale = active ? 'scale-125' : 'scale-100';

            return (
              <div key={idx} className="flex flex-col items-center w-12">
                {b.palmMute && <div className="text-zinc-400 text-[10px] font-mono">[PM]</div>}
                <div className={`text-2xl ${color} ${scale} transition-transform duration-150`} style={active ? { filter: isDown ? 'drop-shadow(0 0 6px rgba(249,115,22,0.8))' : 'drop-shadow(0 0 6px rgba(34,197,94,0.7))'} : undefined}>
                  {arrowFor(b.direction)}
                </div>
                <div className="text-[11px] font-mono text-zinc-500">{b.beat % 1 === 0 ? String(b.beat) : String(b.beat)}</div>
                {b.accent && <div className="text-[10px] font-mono text-amber-400">•</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="font-mono text-xs text-stone-200">[{pattern.name.toUpperCase()}] · {pattern.difficulty.toUpperCase()} · {pattern.description}</div>
        <div className="flex items-center space-x-2">
          <button className="px-2 py-1 font-mono text-2xs border border-zinc-700" onClick={onPrevPattern}>◀ PATRÓN ANTERIOR</button>
          <button className="px-3 py-1 font-mono text-2xs border border-zinc-700 bg-zinc-800" onClick={onTogglePlay}>{isPlaying ? 'STOP' : 'PLAY'}</button>
          <button className="px-2 py-1 font-mono text-2xs border border-zinc-700" onClick={onNextPattern}>SIGUIENTE PATRÓN ▶</button>
        </div>
      </div>
    </div>
  );
};

export default StrumsVisualizer;
