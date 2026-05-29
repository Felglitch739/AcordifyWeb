import React from 'react';
import { ScaleVisualizer } from './ScaleVisualizer';
import { PanelWrapper } from './PanelWrapper';

interface ScalePanelProps {
  scale: string;
  onBypass?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const ScalePanel: React.FC<ScalePanelProps> = ({ scale, onBypass, collapsed = false, onToggleCollapse }) => {
  return (
    <PanelWrapper
      className="bg-zinc-800"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onBypass={onBypass}
      title={(
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
      )}
      rightSlot={(
        <div className="bg-zinc-950 px-3 py-1 border border-zinc-800 rounded-sm font-mono text-3xs text-zinc-500 flex flex-col items-end">
          <span className="text-amber-500 font-bold uppercase tracking-widest text-[8px]">
            TUNING: STANDARD
          </span>
          <span className="text-[8px] text-zinc-600">A4 = 440 HZ</span>
        </div>
      )}
      contentClassName="p-4 pt-4"
    >
      <div className="w-full flex justify-center bg-zinc-900/40 border border-zinc-900/60 p-3 rounded-sm shadow-inner">
        <ScaleVisualizer scaleName={scale} />
      </div>
    </PanelWrapper>
  );
};
