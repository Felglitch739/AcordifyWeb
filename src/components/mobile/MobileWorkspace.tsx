import React from 'react';
import { TactileButton } from '../TactileButton';

interface MobileWorkspaceProps {
  mood: string;
  bpm: number;
  isPlaying: boolean;
  isLive: boolean;
  theme: 'rack' | 'minimal';
  onToggleTheme: () => void;
  onTogglePlay: () => void;
  onToggleLive: () => void;
  onDecreaseBpm: () => void;
  onIncreaseBpm: () => void;
  toolsOpen: boolean;
  onToggleTools: () => void;
  onCloseTools: () => void;
  toolsContent: React.ReactNode;
  lyricsContent: React.ReactNode;
}

export const MobileWorkspace: React.FC<MobileWorkspaceProps> = ({
  mood,
  bpm,
  isPlaying,
  isLive,
  theme,
  onToggleTheme,
  onTogglePlay,
  onToggleLive,
  onDecreaseBpm,
  onIncreaseBpm,
  toolsOpen,
  onToggleTools,
  onCloseTools,
  toolsContent,
  lyricsContent,
}) => {
  React.useEffect(() => {
    if (!toolsOpen) {
      return;
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseTools();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [toolsOpen, onCloseTools]);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-900 text-stone-200">
      <div className="h-14 px-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-sm font-mono font-bold tracking-widest">ACORDIFY</span>
          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{mood}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500">
          <button
            type="button"
            onClick={onToggleTheme}
            className="border border-zinc-700 px-2 py-1 text-[9px] uppercase tracking-widest text-zinc-400"
          >
            {theme === 'minimal' ? 'MINIMAL' : 'RACK'}
          </button>
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-none ${isLive ? 'bg-orange-500' : 'bg-zinc-700'}`} />
            <span>{isLive ? 'LIVE' : 'STANDBY'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {lyricsContent}
      </div>

      <div className="h-18 border-t border-zinc-800 bg-zinc-950 px-3 py-2 flex items-center justify-between gap-2">
        <TactileButton
          variant={isPlaying ? 'red' : 'green'}
          onClick={onTogglePlay}
          className="px-3! py-2! text-xs! font-bold!"
        >
          {isPlaying ? 'STOP' : 'PLAY'}
        </TactileButton>

        <TactileButton
          variant={isLive ? 'orange' : 'zinc'}
          onClick={onToggleLive}
          className="px-3! py-2! text-xs! font-bold!"
        >
          {isLive ? 'LIVE ON' : 'LIVE'}
        </TactileButton>

        <div className="flex items-center gap-1">
          <TactileButton variant="zinc" onClick={onDecreaseBpm} className="px-2! py-2! text-2xs!">
            -
          </TactileButton>
          <div className="min-w-14 bg-zinc-900 border border-zinc-800 text-center text-[10px] font-mono text-amber-400 px-2 py-1">
            {bpm} BPM
          </div>
          <TactileButton variant="zinc" onClick={onIncreaseBpm} className="px-2! py-2! text-2xs!">
            +
          </TactileButton>
        </div>

        <TactileButton variant="zinc" onClick={onToggleTools} className="px-3! py-2! text-xs! font-bold!">
          TOOLS
        </TactileButton>
      </div>

      {toolsOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={onCloseTools}
            role="button"
            aria-label="Cerrar herramientas"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onCloseTools();
              }
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-y-auto bg-zinc-950 border-t border-zinc-800 p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">[ TOOLS ]</span>
              <button
                type="button"
                onClick={onCloseTools}
                className="text-[10px] font-mono text-zinc-400 border border-zinc-700 px-2 py-1"
              >
                CERRAR
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {toolsContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileWorkspace;
