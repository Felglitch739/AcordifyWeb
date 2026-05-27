import React from 'react';
import { transposeChord } from '../utils';
import { PanelWrapper } from './PanelWrapper';

interface LyricsSheetProps {
  lyrics: string;
  transposeSteps?: number;
  isPracticeMode?: boolean;
  isLive?: boolean;
  activeChord?: string;
  onBypass?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface LyricSegment {
  chord?: string;
  text: string;
}

/**
 * Parses a single line of ChordPro lite text.
 * e.g. "[A]Si ya te vas por [B7]qué no" ->
 * [
 *   { chord: "A", text: "Si ya te vas por " },
 *   { chord: "B7", text: "qué no" }
 * ]
 */
function parseChordProLine(line: string): LyricSegment[] {
  const segments: LyricSegment[] = [];
  const regex = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let currentChord: string | undefined = undefined;
  let match;

  while ((match = regex.exec(line)) !== null) {
    const matchIndex = match.index;
    const textSegment = line.substring(lastIndex, matchIndex);

    // If there is text from the previous match (or start of line)
    // or if we have an active chord that needs to be associated with this segment
    if (textSegment || currentChord !== undefined) {
      segments.push({
        chord: currentChord,
        text: textSegment,
      });
    }

    currentChord = match[1];
    lastIndex = regex.lastIndex;
  }

  // Handle the remaining part of the line
  const remainingText = line.substring(lastIndex);
  if (remainingText || currentChord !== undefined) {
    segments.push({
      chord: currentChord,
      text: remainingText,
    });
  }

  // Fallback for completely empty lines to preserve vertical spacing
  if (segments.length === 0) {
    segments.push({ text: '' });
  }

  return segments;
}

export const LyricsSheet: React.FC<LyricsSheetProps> = ({
  lyrics,
  transposeSteps = 0,
  isPracticeMode = false,
  isLive = false,
  activeChord = '',
  onBypass,
  collapsed = false,
  onToggleCollapse,
}) => {
  const lines = lyrics.split('\n');
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const lineRefs = React.useRef<Array<HTMLDivElement | null>>([]);

  React.useEffect(() => {
    if (!isLive || !activeChord) {
      return;
    }

    const activeLineElement = lineRefs.current.find((element) => element?.dataset.activeChord === activeChord);

    if (activeLineElement) {
      activeLineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeChord, isLive]);

  React.useEffect(() => {
    if (!isPracticeMode) return;

    const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTop += 1;
      }
    }, 40);

    // Smooth scrolling: increment scrollTop by 1 pixel every 40ms
    return () => {
      clearInterval(intervalId);
    };
  }, [isPracticeMode]);

  return (
    <PanelWrapper
      className="bg-zinc-900 h-full min-h-95 relative select-text"
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      onBypass={onBypass}
      title={(
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 bg-zinc-500 rounded-none"></div>
          <span className="text-2xs font-mono font-bold tracking-wider text-zinc-400 uppercase">
            [SHEET] // CHORDPRO NOTEBOOK
          </span>
        </div>
      )}
      rightSlot={(
        <span className="text-[9px] font-mono text-zinc-500">
          SYS.PARSED_CHORDS.TXT
        </span>
      )}
      contentClassName="flex flex-col h-full"
    >
      <div
        ref={scrollContainerRef}
        className="p-6 md:p-8 grow bg-[#1c1c1e] relative overflow-y-auto overflow-x-auto"
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,1)_1px,transparent_1px)] bg-size-[100%_2.75rem]"></div>

        <div className="relative z-10 font-mono text-xs md:text-sm text-stone-200 flex flex-col space-y-6 leading-loose tracking-wide select-text border-l-2 border-zinc-800/50 pl-4 ml-2">
          {lines.map((line, lineIdx) => {
            const segments = parseChordProLine(line);
            const lineChordMatches = segments.some((segment) => {
              if (!segment.chord) {
                return false;
              }

              const renderedChord = transposeChord(segment.chord, transposeSteps);
              return segment.chord === activeChord || renderedChord === activeChord;
            });
            const isActiveLine = isLive && !!activeChord && lineChordMatches;
            const isDimmed = isLive && !!activeChord && !isActiveLine;

            return (
              <div
                key={lineIdx}
                ref={(element) => {
                  lineRefs.current[lineIdx] = element;
                }}
                data-active-chord={lineChordMatches ? activeChord : ''}
                className={`flex flex-wrap items-end min-h-12 border-b pb-1 transition-colors ${
                  isActiveLine ? 'border-orange-500/60' : 'border-zinc-900/50'
                }`}
                style={
                  isActiveLine
                    ? { borderLeft: '2px solid #f97316', backgroundColor: 'rgba(249, 115, 22, 0.08)' }
                    : undefined
                }
              >
                {segments.map((segment, segIdx) => {
                  const hasChord = !!segment.chord;
                  const renderedChord = segment.chord ? transposeChord(segment.chord, transposeSteps) : '';
                  const chordIsActive = Boolean(activeChord) && (segment.chord === activeChord || renderedChord === activeChord);

                  return (
                    <div
                      key={segIdx}
                      className={`inline-flex flex-col relative transition-opacity ${isDimmed ? 'opacity-[0.45]' : 'opacity-100'}`}
                    >
                      <span
                        className={`text-[11px] md:text-xs font-semibold select-none pb-1 h-5 block transition-colors ${
                          hasChord ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                        style={chordIsActive ? { color: '#f97316' } : undefined}
                      >
                        {renderedChord || '\u00A0'}
                      </span>

                      <span className="text-xs md:text-sm text-stone-200 font-normal whitespace-pre">
                        {segment.text || (hasChord ? '\u00A0' : '')}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-950 border-t border-zinc-800 px-4 py-3 flex justify-between items-center text-[9px] font-mono text-zinc-600 select-none">
        <span>COL. PROD_CODER_REF // CHORDPRO LITE INTERPRETER</span>
        <span>ACORDIFY CORP. © 2026</span>
      </div>
    </PanelWrapper>
  );
};
