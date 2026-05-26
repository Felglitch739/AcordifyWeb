import React from 'react';
import { getScaleData } from '../utils';

interface ScaleVisualizerProps {
  scaleName: string;
}

const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Strings from 6th (top) to 1st (bottom)
const STRING_OPEN_NOTES = ['E', 'A', 'D', 'G', 'B', 'E'];
const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

/**
 * Calculates the chromatic pitch name for a given guitar string index and fret number.
 * 0 = Low E string, 5 = High e string.
 */
const getNoteAtFret = (stringIdx: number, fret: number): string => {
  const openNote = STRING_OPEN_NOTES[stringIdx];
  const openIndex = CHROMATIC_SCALE.indexOf(openNote);
  if (openIndex === -1) return '';
  return CHROMATIC_SCALE[(openIndex + fret) % 12];
};

export const ScaleVisualizer: React.FC<ScaleVisualizerProps> = ({ scaleName }) => {
  const scaleInfo = getScaleData(scaleName);
  const scaleNotes = scaleInfo.notes || [];
  const scaleRoot = scaleInfo.root || '';

  // SVG Dimension Mapping
  const stringY = [16, 34, 52, 70, 88, 106];
  const stringThickness = [2.2, 1.8, 1.4, 1.1, 0.9, 0.6]; // Low E (6th) to high e (1st)
  const fretX = [40, 100, 160, 220, 280, 340]; // Nut (0) + frets 1 to 5

  return (
    <div className="w-full max-w-[440px] flex flex-col items-center select-none py-1">
      <svg viewBox="0 0 380 135" className="w-full h-auto overflow-visible">
        {/* Fretboard Wood Background */}
        <rect
          x="40"
          y="10"
          width="300"
          height="102"
          rx="2"
          className="fill-zinc-900/90 stroke-zinc-800/80"
          strokeWidth="1.5"
        />

        {/* Fret Markers (Dots) on Fret 3 and Fret 5 */}
        <circle cx="190" cy="61" r="3.5" className="fill-zinc-800" />
        <circle cx="310" cy="61" r="3.5" className="fill-zinc-800" />

        {/* Frets (Vertical Lines) */}
        {fretX.map((x, i) => (
          <line
            key={`fret-line-${i}`}
            x1={x}
            y1="10"
            x2={x}
            y2="112"
            className={i === 0 ? "stroke-stone-300" : "stroke-zinc-800"}
            strokeWidth={i === 0 ? 3.5 : 1.5}
            strokeLinecap="round"
          />
        ))}

        {/* Strings (Horizontal Lines) */}
        {stringY.map((y, idx) => (
          <line
            key={`string-line-${idx}`}
            x1="38"
            y1={y}
            x2="345"
            y2={y}
            className="stroke-zinc-600"
            strokeWidth={stringThickness[idx]}
          />
        ))}

        {/* Fret Number Labels (1 to 5) */}
        {fretX.slice(1).map((x, i) => (
          <text
            key={`fret-num-${i}`}
            x={x - 30}
            y="126"
            className="fill-zinc-600 font-mono text-[9px] font-bold"
            textAnchor="middle"
          >
            {i + 1}
          </text>
        ))}

        {/* String Labels (Left Side) */}
        {stringY.map((y, idx) => (
          <text
            key={`string-label-${idx}`}
            x="14"
            y={y}
            dy="3.5"
            className="fill-zinc-500 font-mono font-bold text-[9px] text-center"
            textAnchor="middle"
          >
            {STRING_LABELS[idx]}
          </text>
        ))}

        {/* Active Scale Note Dots */}
        {stringY.map((y, stringIdx) => {
          return [0, 1, 2, 3, 4, 5].map((fret) => {
            const note = getNoteAtFret(stringIdx, fret);
            const isActive = scaleNotes.includes(note);
            if (!isActive) return null;

            const isRoot = note === scaleRoot;
            
            // X Coordinate mapping: fret 0 is left of nut, frets 1-5 center inside fret spaces
            const cx = fret === 0 ? 27 : fretX[fret - 1] + 30;
            const cy = y;

            return (
              <g key={`note-${stringIdx}-${fret}`}>
                {/* Glowing ring under Root Note */}
                {isRoot && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r="8.5"
                    className="fill-transparent stroke-orange-500/30 animate-pulse"
                    strokeWidth="3"
                  />
                )}
                {/* Visual Note Circle */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="7"
                  className={
                    isRoot
                      ? "fill-orange-500 stroke-zinc-950"
                      : "fill-amber-100/90 stroke-zinc-950"
                  }
                  strokeWidth="1.2"
                />
                {/* Note Label */}
                <text
                  x={cx}
                  y={cy}
                  dy="2.5"
                  className={
                    isRoot
                      ? "fill-zinc-950 font-mono font-bold text-[8px]"
                      : "fill-zinc-900 font-mono font-bold text-[8px]"
                  }
                  textAnchor="middle"
                >
                  {note}
                </text>
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
};
