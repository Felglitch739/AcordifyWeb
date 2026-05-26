import React from 'react';

interface FretboardProps {
  frets: number[]; // -1 for X, 0 for O, > 0 for fret number
  startFret?: number;
}

export const Fretboard: React.FC<FretboardProps> = ({ frets, startFret = 1 }) => {
  // SVG coordinates mapping
  const stringsX = [10, 26, 42, 58, 74, 90]; // 6 strings
  const fretsY = [20, 45, 70, 95, 120];      // 5 fret lines (nut + 4 frets)

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[100px] mt-2">
      <svg viewBox="0 0 100 130" className="w-full h-auto overflow-visible">
        
        {/* Frets (Horizontal Lines) */}
        {fretsY.map((y, i) => (
          <line
            key={`fret-${i}`}
            x1="10"
            y1={y}
            x2="90"
            y2={y}
            className={i === 0 ? "stroke-stone-300" : "stroke-zinc-800"}
            strokeWidth={i === 0 ? 4 : 1.5}
            strokeLinecap="round"
          />
        ))}

        {/* Strings (Vertical Lines) with realistic thickness */}
        {stringsX.map((x, i) => {
          const thicknesses = [2.5, 2, 1.5, 1.5, 1, 1]; // Low E to high e
          return (
            <line
              key={`string-${i}`}
              x1={x}
              y1="20"
              x2={x}
              y2="120"
              className="stroke-zinc-600"
              strokeWidth={thicknesses[i]}
              strokeLinecap="square"
            />
          );
        })}

        {/* Start Fret Label (for barre chords up the neck) */}
        {startFret > 1 && (
          <text
            x="4"
            y="36"
            className="fill-zinc-600 font-mono text-[10px]"
            textAnchor="end"
          >
            {startFret}
          </text>
        )}

        {/* Dynamic Markers (Dots, Open, Muted) */}
        {frets.map((fret, i) => {
          const x = stringsX[i];

          if (fret === -1) {
            // Muted string (X)
            return (
              <text
                key={`marker-${i}`}
                x={x}
                y="10"
                className="fill-zinc-600 font-mono text-[10px] font-bold"
                textAnchor="middle"
              >
                ×
              </text>
            );
          } else if (fret === 0) {
            // Open string (O)
            return (
              <circle
                key={`marker-${i}`}
                cx={x}
                cy="7"
                r="3"
                className="stroke-emerald-500 fill-transparent"
                strokeWidth="1.5"
              />
            );
          } else if (fret > 0) {
            // Finger Placement Dot
            let relativeFret = fret;
            if (startFret > 1) {
              relativeFret = fret - startFret + 1;
            }

            // Ensure dot fits within our 4-fret visual grid
            if (relativeFret > 0 && relativeFret <= 4) {
              // Position dot in the middle of the fret space
              const cy = fretsY[relativeFret - 1] + 12.5;
              return (
                <circle
                  key={`marker-${i}`}
                  cx={x}
                  cy={cy}
                  r="4.5"
                  className="fill-[#d4d4d8] stroke-zinc-700" // Vintage cream hardware dot
                  strokeWidth="0.5"
                />
              );
            }
          }
          return null;
        })}
      </svg>
    </div>
  );
};
