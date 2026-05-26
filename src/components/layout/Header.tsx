import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="w-full border-b border-zinc-700 bg-zinc-900 px-6 py-4 flex items-center justify-between select-none">
      <div className="flex items-center space-x-4">
        {/* Brutalist Bold Title */}
        <h1 className="text-xl font-bold tracking-widest text-zinc-100 font-sans">
          ACORDIFY
        </h1>
        {/* Subtitle/Mode Indicator */}
        <span className="hidden sm:inline-block border border-zinc-700 px-2 py-0.5 text-2xs font-mono uppercase tracking-widest text-zinc-400 bg-zinc-800">
          STUDIO CORE v1.0
        </span>
      </div>
      
      {/* Decorative Hardware Info (Analogue Vibe) */}
      <div className="flex items-center space-x-6 text-2xs font-mono text-zinc-500">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 bg-orange-600 animate-pulse rounded-none"></span>
          <span className="uppercase tracking-wider">REC STANDBY</span>
        </div>
        <div className="hidden md:flex items-center space-x-3">
          <span>INPUT: LINE/MIC</span>
          <span>•</span>
          <span>OUT: MONO</span>
          <span>•</span>
          <span className="text-zinc-400">44.1 KHZ</span>
        </div>
      </div>
    </header>
  );
};
