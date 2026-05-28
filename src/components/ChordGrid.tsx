import React from 'react';
import { Fretboard } from './Fretboard';
import { PanelWrapper } from './PanelWrapper';
import { getChordData, getChordVariationsCount, transposeChord } from '../utils';

interface ChordGridProps {
  chords: string[];
  transposeSteps?: number;
  variationIndices?: number[];
  onVariationChange?: (index: number, newVarIndex: number) => void;
  onBypass?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

/**
 * Returns the appropriate Tailwind font-size class based on chord symbol length.
 * - ≤2 chars: text-5xl (48px)
 * - 3-4 chars: text-4xl (36px)
 * - 5+ chars: text-2xl (24px)
 * Never truncates — always shows the full symbol.
 */
function getChordFontClass(symbol: string): string {
  const len = symbol.length;
  if (len <= 2) return 'text-5xl';
  if (len <= 4) return 'text-4xl';
  return 'text-2xl';
}

export const ChordGrid: React.FC<ChordGridProps> = ({
  chords,
  transposeSteps = 0,
  variationIndices,
  onVariationChange,
  onBypass,
  collapsed = false,
  onToggleCollapse
}) => {
  return (
    <PanelWrapper
      className="bg-[var(--bg-tertiary)]"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onBypass={onBypass}
      title={(
        <span className="text-2xs font-mono font-bold tracking-wider text-[var(--text-secondary)] uppercase">
          [MONITOR] // SIGNAL PROGRESSION
        </span>
      )}
      rightSlot={(
        <span className="hidden xs:inline-block text-[10px] font-mono text-[var(--text-muted)] uppercase">
          CHORDS x04
        </span>
      )}
      contentClassName="p-6"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {chords.map((chordName, index) => {
          const transposedChordName = transposeChord(chordName, transposeSteps);
          const varIndex = variationIndices ? (variationIndices[index] || 0) : 0;
          const chordInfo = getChordData(transposedChordName, varIndex);
          const totalVars = getChordVariationsCount(transposedChordName);
          const fontClass = getChordFontClass(transposedChordName);

          const cycleVariation = () => {
            if (onVariationChange && totalVars > 1) {
              const nextVarIndex = (varIndex + 1) % totalVars;
              onVariationChange(index, nextVarIndex);
            }
          };

          return (
            <div
              key={`${chordName}-${index}`}
              onClick={cycleVariation}
              className={`bg-[var(--bg-primary)] border-[3px] border-[var(--border-color)] p-6 h-105 flex flex-col justify-between rounded-sm relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-transform active:scale-[0.99] select-none ${
                totalVars > 1 ? 'cursor-pointer hover:border-[var(--accent-primary)]' : ''
              }`}
            >
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-2">
                <span className="text-[10px] font-mono tracking-wider text-[var(--accent-secondary)] flex items-center gap-1.5 uppercase font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-secondary)] animate-pulse shadow-[0_0_6px_var(--accent-secondary)]"></span>
                  DICT SYNCED
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">CH_0{index + 1}</span>
              </div>

              <div className="my-2">
                <h3 className={`font-mono ${fontClass} font-bold text-[var(--text-primary)] tracking-tight uppercase leading-none break-all`}>
                  {transposedChordName}
                </h3>
                <p className="text-[10px] font-mono text-[var(--text-muted)] mt-1">
                  {varIndex === 0 ? 'STANDARD VOICING' : `VOICING SHAPE #${varIndex + 1}`}
                </p>
              </div>

              <div className="w-full h-56 flex items-center justify-center bg-[var(--bg-secondary)]/40 border border-[var(--bg-secondary)]/60 p-2 rounded-sm">
                <Fretboard frets={chordInfo.frets} startFret={chordInfo.startFret || 1} />
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[var(--text-muted)]">
                {totalVars > 1 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      cycleVariation();
                    }}
                    className="text-xs font-mono text-[var(--accent-primary)] hover:underline cursor-pointer border border-[var(--border-color)] px-1.5 py-0.5 rounded-sm bg-[var(--bg-secondary)]"
                  >
                    [VAR: {varIndex + 1}/{totalVars}]
                  </button>
                ) : (
                  <span className="text-xs font-mono text-[var(--text-muted)]">[VAR: 1/1]</span>
                )}
                <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)] font-semibold">Studio Core</span>
              </div>
            </div>
          );
        })}
      </div>
    </PanelWrapper>
  );
};
