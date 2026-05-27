import React from 'react';
import { CHORD_DICTIONARY, transposeChord } from '../utils';
import { PanelWrapper } from './PanelWrapper';

interface LyricsSheetProps {
  lyrics: string;
  transposeSteps?: number;
  isPracticeMode?: boolean;
  isLive?: boolean;
  activeChord?: string;
  onLyricsChange?: (next: string) => void;
  onAssistWithAI?: (currentText: string) => Promise<string>;
  onMapChords?: (currentText: string) => string;
  availableChords?: string[];
  isMobile?: boolean;
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
  onLyricsChange,
  onAssistWithAI,
  onMapChords,
  availableChords = [],
  isMobile = false,
  onBypass,
  collapsed = false,
  onToggleCollapse,
}) => {
  const lines = lyrics.split('\n');
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const lineRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  const editorRef = React.useRef<HTMLTextAreaElement>(null);
  const highlightRef = React.useRef<HTMLDivElement>(null);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [editorValue, setEditorValue] = React.useState(lyrics);
  const [assistError, setAssistError] = React.useState<string | null>(null);
  const [isAssisting, setIsAssisting] = React.useState(false);
  const [caretIndex, setCaretIndex] = React.useState(0);

  const chordCatalog = React.useMemo(() => {
    const filtered = availableChords.filter((chord) => !/LOAD|ERR|SYS_ERR/i.test(chord));
    const list = new Set<string>([...filtered, ...Object.keys(CHORD_DICTIONARY)]);
    return Array.from(list);
  }, [availableChords]);

  React.useEffect(() => {
    if (isEditMode || !isLive || !activeChord) {
      return;
    }

    const activeLineElement = lineRefs.current.find((element) => element?.dataset.activeChord === activeChord);

    if (activeLineElement) {
      activeLineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeChord, isLive]);

  React.useEffect(() => {
    if (isEditMode || !isPracticeMode) return;

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

  React.useEffect(() => {
    if (lyrics !== editorValue) {
      setEditorValue(lyrics);
    }
  }, [lyrics]);

  React.useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const stored = window.localStorage.getItem('acordify_notebook_draft');
    if (stored && stored.trim().length > 0 && stored !== editorValue) {
      if (editorValue.trim().length === 0) {
        setEditorValue(stored);
        onLyricsChange?.(stored);
      }
    }
  }, [isEditMode]);

  React.useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const intervalId = window.setInterval(() => {
      window.localStorage.setItem('acordify_notebook_draft', editorValue);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isEditMode, editorValue]);

  const handleEditorScroll = () => {
    if (!editorRef.current || !highlightRef.current) {
      return;
    }
    highlightRef.current.scrollTop = editorRef.current.scrollTop;
    highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
  };

  const updateCaretIndex = () => {
    const index = editorRef.current?.selectionStart ?? 0;
    setCaretIndex(index);
  };

  const handleEditorChange = (value: string) => {
    setEditorValue(value);
    onLyricsChange?.(value);
  };

  const handleAssistWithAI = async () => {
    if (!onAssistWithAI || isAssisting) {
      return;
    }

    setAssistError(null);
    setIsAssisting(true);
    try {
      const next = await onAssistWithAI(editorValue);
      if (next && next !== editorValue) {
        handleEditorChange(next);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al generar sugerencia.';
      setAssistError(message);
    } finally {
      setIsAssisting(false);
    }
  };

  const handleMapChords = () => {
    if (!onMapChords) {
      return;
    }

    const mapped = onMapChords(editorValue);
    if (mapped !== editorValue) {
      handleEditorChange(mapped);
    }
  };

  const chordPrefix = React.useMemo(() => {
    const uptoCaret = editorValue.slice(0, caretIndex);
    const lastOpen = uptoCaret.lastIndexOf('[');
    const lastClose = uptoCaret.lastIndexOf(']');
    if (lastOpen <= lastClose) {
      return null;
    }
    const prefix = uptoCaret.slice(lastOpen + 1);
    if (!prefix) {
      return '';
    }
    if (!/^[A-Ga-g][#b]?/.test(prefix)) {
      return null;
    }
    return prefix;
  }, [editorValue, caretIndex]);

  const chordSuggestions = React.useMemo(() => {
    if (chordPrefix === null) {
      return [];
    }

    const rootMatch = chordPrefix.match(/^([A-Ga-g][#b]?)/);
    const root = rootMatch ? rootMatch[1].toUpperCase() : '';
    const suffixes = ['maj7', 'm', 'm7', '7', 'sus2', 'sus4', 'add9', 'm9', 'maj9', 'dim', 'aug', '5'];
    const generated = root ? suffixes.map((suffix) => `${root}${suffix}`) : [];
    const pool = Array.from(new Set([...generated, ...chordCatalog]));

    return pool
      .filter((symbol) => symbol.toLowerCase().startsWith(chordPrefix.toLowerCase()))
      .slice(0, 8);
  }, [chordPrefix, chordCatalog]);

  const handleInsertSuggestion = (symbol: string) => {
    if (!editorRef.current) {
      return;
    }
    const selectionStart = editorRef.current.selectionStart ?? 0;
    const uptoCaret = editorValue.slice(0, selectionStart);
    const lastOpen = uptoCaret.lastIndexOf('[');
    if (lastOpen === -1) {
      return;
    }
    const before = editorValue.slice(0, lastOpen + 1);
    const after = editorValue.slice(selectionStart);
    const nextAfter = after.startsWith(']') ? after : `]${after}`;
    const nextValue = `${before}${symbol}${nextAfter}`;
    handleEditorChange(nextValue);

    const nextCaret = lastOpen + 1 + symbol.length + 1;
    window.requestAnimationFrame(() => {
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const highlightedNodes = React.useMemo(() => {
    return editorValue.split('\n').map((line, idx) => {
      const segments = parseChordProLine(line);
      return (
        <div key={`hl-${idx}`} className="min-h-6">
          {segments.map((segment, segIdx) => (
            <span key={`hl-${idx}-${segIdx}`}>
              {segment.chord && (
                <span className="text-amber-400">[{segment.chord}]</span>
              )}
              <span className="text-stone-200">{segment.text}</span>
            </span>
          ))}
        </div>
      );
    });
  }, [editorValue]);

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
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-zinc-500">SYS.PARSED_CHORDS.TXT</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setIsEditMode((prev) => !prev);
            }}
            className={`border px-2 py-1 text-[9px] font-mono uppercase tracking-widest transition-colors ${isEditMode ? 'border-amber-500 text-amber-400 bg-zinc-950' : 'border-zinc-700 text-zinc-400 bg-zinc-900 hover:text-zinc-200'}`}
          >
            {isEditMode ? '[ MODO LECTURA ]' : '[ MODO EDICION ]'}
          </button>
        </div>
      )}
      contentClassName="flex flex-col h-full"
    >
      <div
        ref={scrollContainerRef}
        className={`grow bg-[#1c1c1e] relative overflow-y-auto overflow-x-auto ${isMobile ? 'p-4' : 'p-6 md:p-8'}`}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,1)_1px,transparent_1px)] bg-size-[100%_2.75rem]"></div>

        {isEditMode ? (
          <div className={`relative z-10 font-mono leading-loose tracking-wide ${isMobile ? 'text-base' : 'text-xs md:text-sm'}`}>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAssistWithAI}
                disabled={isAssisting}
                className={`border px-3 py-2 text-[10px] font-mono uppercase tracking-[0.22em] transition-colors ${isAssisting ? 'border-amber-500 bg-amber-500 text-zinc-950' : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-amber-500 hover:text-amber-400'}`}
              >
                {isAssisting ? '[ ASISTIENDO... ]' : '[ ASISTIR CON IA ]'}
              </button>
              <button
                type="button"
                onClick={handleMapChords}
                className="border border-zinc-700 bg-zinc-900 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-300 hover:border-amber-500 hover:text-amber-400"
              >
                [ MAPEAR ACORDES ]
              </button>
            </div>

            {assistError && (
              <div className="mb-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] text-red-300">
                {assistError}
              </div>
            )}

            <div className="relative border border-zinc-800 bg-zinc-950">
              <div
                ref={highlightRef}
                className="absolute inset-0 overflow-auto whitespace-pre-wrap break-words px-3 py-3 pointer-events-none"
              >
                {highlightedNodes}
              </div>
              <textarea
                ref={editorRef}
                value={editorValue}
                onChange={(event) => handleEditorChange(event.target.value)}
                onScroll={handleEditorScroll}
                onKeyUp={updateCaretIndex}
                onClick={updateCaretIndex}
                onFocus={updateCaretIndex}
                aria-label="ChordPro editor"
                className="absolute inset-0 h-full w-full resize-none bg-transparent px-3 py-3 text-transparent caret-amber-400 outline-none"
                spellCheck={false}
              />
            </div>

            {chordSuggestions.length > 0 && chordPrefix !== null && (
              <div className="mt-2 border border-zinc-800 bg-zinc-950 p-2 text-[10px] font-mono text-zinc-300 flex flex-wrap gap-2">
                {chordSuggestions.map((symbol) => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => handleInsertSuggestion(symbol)}
                    className="border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] hover:border-amber-500 hover:text-amber-400"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={`relative z-10 font-mono text-stone-200 flex flex-col space-y-6 leading-loose tracking-wide select-text border-l-2 border-zinc-800/50 pl-4 ml-2 ${isMobile ? 'text-base' : 'text-xs md:text-sm'}`}>
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
        )}
      </div>

      <div className="bg-zinc-950 border-t border-zinc-800 px-4 py-3 flex justify-between items-center text-[9px] font-mono text-zinc-600 select-none">
        <span>COL. PROD_CODER_REF // CHORDPRO LITE INTERPRETER</span>
        <span>ACORDIFY CORP. © 2026</span>
      </div>
    </PanelWrapper>
  );
};
