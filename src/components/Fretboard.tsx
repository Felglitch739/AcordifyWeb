import React, { useId } from 'react';
import type { BarreSpec } from '../data/chords';

interface FretboardProps {
  frets: readonly number[]; // -1 for X, 0 for O, > 0 for fret number
  fingers?: readonly number[]; // 0 = open/muted, 1..4 = finger number
  rootStrings?: readonly number[]; // indices 0..5 (6th..1st string) sounding the chord root
  startFret?: number;
  barre?: BarreSpec;
  isActive?: boolean;
  pluckTick?: number;
  onPluckString?: (stringIndex: number) => void;
}

const STRING_COLORS = [
  '#27272A',
  '#27272A',
  '#3F3F46',
  '#52525B',
  '#52525B',
  '#71717A',
] as const;

const STRING_WIDTHS = [2.1, 1.8, 1.5, 1.2, 0.95, 0.78] as const;
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'] as const;

export const Fretboard: React.FC<FretboardProps> = ({
  frets,
  fingers,
  rootStrings,
  startFret = 1,
  barre,
  isActive = false,
  pluckTick = 0,
  onPluckString,
}) => {
  const uid = useId().replace(/:/g, '');
  const boardId = `board-${uid}`;

  // 6 strings aligned from x=12 to x=88, 5 fret lines from y=20 to y=120
  const stringsX = [12, 27.2, 42.4, 57.6, 72.8, 88] as const;
  const fretsY = [20, 45, 70, 95, 120] as const;

  const relativeBarreFret =
    barre && barre.fret > 0 ? barre.fret - startFret + 1 : null;
  const showBarre =
    barre !== undefined &&
    relativeBarreFret !== null &&
    relativeBarreFret >= 1 &&
    relativeBarreFret <= 4;

  const showSingleInlay =
    startFret === 1 || startFret === 5 || startFret === 7 || startFret === 9;
  const showDoubleInlay = startFret === 12;

  const rootSet = new Set(rootStrings ?? []);

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[240px]">
      <svg viewBox="-14 -2 116 152" className="w-full h-auto overflow-visible">
        <rect
          id={boardId}
          x="8"
          y="20"
          width="84"
          height="102"
          rx="4"
          fill="#FAFAFA"
          stroke={isActive ? 'var(--color-accent-border)' : '#D4D4D8'}
          strokeWidth="1"
        />

        {/* Inlay Dots */}
        {showSingleInlay && (
          <circle cx="50" cy="82.5" r="2.8" fill="#E4E4E7" />
        )}
        {showDoubleInlay && (
          <>
            <circle cx="34.8" cy="57.5" r="2.5" fill="#E4E4E7" />
            <circle cx="65.2" cy="57.5" r="2.5" fill="#E4E4E7" />
          </>
        )}

        {/* Horizontal Nut & Fret Wires */}
        {fretsY.map((y, i) => {
          const isNut = i === 0 && startFret === 1;
          return (
            <line
              key={`fret-${i}`}
              x1="9.5"
              y1={y}
              x2="90.5"
              y2={y}
              stroke={isNut ? '#111111' : '#D4D4D8'}
              strokeWidth={isNut ? 4.2 : 1.3}
              strokeLinecap="round"
            />
          );
        })}

        {/* Vertical Strings with pluck animation */}
        {stringsX.map((x, i) => {
          const isPlayed = frets[i] >= 0;
          const shouldAnimate = isPlayed && pluckTick > 0;
          const strokeColor = !isPlayed ? '#D4D4D8' : STRING_COLORS[i];

          return (
            <g key={`string-group-${i}`}>
              <line
                key={`string-${i}-${pluckTick}`}
                x1={x}
                y1="20"
                x2={x}
                y2="121"
                stroke={strokeColor}
                strokeOpacity={isPlayed ? 0.92 : 0.6}
                strokeWidth={STRING_WIDTHS[i]}
                strokeLinecap="round"
                className={shouldAnimate ? 'string-pluck-active' : undefined}
                style={
                  shouldAnimate
                    ? { animationDelay: `${i * 22}ms` }
                    : undefined
                }
              />

              {isPlayed && onPluckString && (
                <line
                  x1={x}
                  y1="20"
                  x2={x}
                  y2="122"
                  stroke="transparent"
                  strokeWidth="12"
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPluckString(i);
                  }}
                >
                  <title>{`Tocar cuerda ${6 - i} (${STRING_NAMES[i]})`}</title>
                </line>
              )}
            </g>
          );
        })}

        {/* Uniform Fret Label — always rendered in Xfr format on every chord */}
        <text
          x="3"
          y="36"
          className="font-mono text-[10px] font-medium"
          fill="#71717A"
          textAnchor="end"
        >
          {startFret}fr
        </text>

        {/* Barre Indicator + Root highlights along barre */}
        {showBarre && barre && relativeBarreFret !== null && (
          <g className="pointer-events-none">
            <rect
              x={stringsX[barre.fromString] - 7.2}
              y={fretsY[relativeBarreFret - 1] + 12.5 - 7.2}
              width={stringsX[barre.toString] - stringsX[barre.fromString] + 14.4}
              height={14.4}
              rx={7.2}
              fill="#111111"
            />
            {Array.from(
              { length: barre.toString - barre.fromString + 1 },
              (_, offset) => barre.fromString + offset,
            ).map((strIdx) => {
              const isRoot = rootSet.has(strIdx);
              if (isRoot) {
                const cy = fretsY[relativeBarreFret - 1] + 12.5;
                return (
                  <g key={`barre-root-${strIdx}`}>
                    <circle cx={stringsX[strIdx]} cy={cy} r="7.2" fill="#E85D3D" />
                    <text
                      x={stringsX[strIdx]}
                      y={cy + 3}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      className="font-mono text-[8.5px] font-bold"
                    >
                      1
                    </text>
                  </g>
                );
              }
              if (strIdx === barre.fromString) {
                const cy = fretsY[relativeBarreFret - 1] + 12.5;
                return (
                  <text
                    key={`barre-finger-${strIdx}`}
                    x={stringsX[strIdx]}
                    y={cy + 3}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    className="font-mono text-[8.5px] font-bold"
                  >
                    1
                  </text>
                );
              }
              return null;
            })}
          </g>
        )}

        {/* String Markers */}
        {frets.map((fret, i) => {
          const x = stringsX[i];
          const isRoot = rootSet.has(i);
          const fingerNum = fingers?.[i] ?? 0;

          if (fret === -1) {
            return (
              <text
                key={`marker-${i}`}
                x={x}
                y="13"
                className="font-mono text-[11px] font-medium"
                fill="#71717A"
                textAnchor="middle"
              >
                ×
              </text>
            );
          }

          if (fret === 0) {
            return (
              <circle
                key={`marker-${i}`}
                cx={x}
                cy="10"
                r="4.2"
                stroke={isRoot ? '#E85D3D' : '#111111'}
                fill={isRoot ? 'rgba(232, 93, 61, 0.14)' : 'transparent'}
                strokeWidth={isRoot ? 2.2 : 1.7}
              />
            );
          }

          if (
            showBarre &&
            barre &&
            fret === barre.fret &&
            i >= barre.fromString &&
            i <= barre.toString
          ) {
            return null;
          }

          const relativeFret = fret - startFret + 1;
          if (relativeFret >= 1 && relativeFret <= 4) {
            const cy = fretsY[relativeFret - 1] + 12.5;
            return (
              <g key={`marker-${i}`} className="pointer-events-none">
                <circle
                  cx={x}
                  cy={cy}
                  r="7.4"
                  fill={isRoot ? '#E85D3D' : '#111111'}
                />
                {fingerNum > 0 && (
                  <text
                    x={x}
                    y={cy + 3}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    className="font-mono text-[8.5px] font-bold"
                  >
                    {fingerNum}
                  </text>
                )}
              </g>
            );
          }

          return null;
        })}

        {/* String Names E A D G B e */}
        {stringsX.map((x, i) => {
          const isPlayed = frets[i] >= 0;
          return (
            <text
              key={`str-label-${i}`}
              x={x}
              y="138"
              textAnchor="middle"
              fill={isPlayed ? '#52525B' : '#A1A1AA'}
              className="font-mono text-[9.5px] font-medium"
            >
              {STRING_NAMES[i]}
            </text>
          );
        })}
      </svg>
    </div>
  );
};
