import React from 'react';
import { ScaleVisualizer } from './ScaleVisualizer';

interface ScalePanelProps {
  scale: string;
  onBypass?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ScalePanel: React.FC<ScalePanelProps> = ({ scale, onBypass, collapsed = false, onToggleCollapse }) => {
  return (
    <div className="border border-zinc-700 bg-zinc-800 p-4 rounded-sm shadow-md flex flex-col space-y-4 select-none">
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
        <div className="flex flex-col space-y-0.5">
          <span className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [RECEIVER] // SOLO SCALE VISUALIZER
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-xs font-mono text-zinc-500 uppercase">ESCALA SOLISTA:</span>
            <span className="text-sm font-mono font-bold text-amber-500 tracking-wide">
              {scale}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Decorative LED/Grit readout screen */}
          <div className="bg-zinc-950 px-3 py-1 border border-zinc-800 rounded-sm font-mono text-3xs text-zinc-500 flex flex-col items-end">
            <span className="text-amber-500 font-bold uppercase tracking-widest text-[8px]">
              TUNING: STANDARD
            </span>
            <span className="text-[8px] text-zinc-600">A4 = 440 HZ</span>
          </div>
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
        /* Visualizer Neck SVG Wrapper */
        <div className="w-full flex justify-center bg-zinc-900/40 border border-zinc-900/60 p-3 rounded-sm shadow-inner">
          <ScaleVisualizer scaleName={scale} />
        </div>
      )}
    </div>
  );
};
