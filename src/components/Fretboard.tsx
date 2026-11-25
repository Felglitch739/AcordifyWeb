import React, { useId } from 'react';
import type { BarreSpec } from '../data/chords';
import { useStudioStyle } from '../styles/useStudioStyle';
import type { StudioThemeId } from '../styles/studioThemes';

interface FretboardProps {
  frets: readonly number[]; // -1 for X, 0 for O, > 0 for fret number
  startFret?: number;
  barre?: BarreSpec;
  isActive?: boolean;
  pluckTick?: number;
  themeOverride?: StudioThemeId;
  onPluckString?: (stringIndex: number) => void;
}

const LUTHIER_STRINGS = ['#C69764', '#BA8B59', '#AE8152', '#DDD5C8', '#D4CCC0', '#CBC2B5'] as const;
const APPLE_STRINGS = ['#9CA3AF', '#A1A1AA', '#B4B4BE', '#E4E4E7', '#ECECF0', '#F4F4F5'] as const;
const OP1_STRINGS = ['#38BDF8', '#38BDF8', '#94A3B8', '#CBD5E1', '#E2E8F0', '#F8FAFC'] as const;
const VINYL_STRINGS = ['#141210', '#141210', '#141210', '#3E3A34', '#3E3A34', '#524C44'] as const;

const STRING_WIDTHS = [2.2, 1.85, 1.5, 1.2, 0.95, 0.78] as const;

export const Fretboard: React.FC<FretboardProps> = ({
  frets,
  startFret = 1,
  barre,
  isActive = false,
  pluckTick = 0,
  themeOverride,
  onPluckString,
}) => {
  const { studioStyle } = useStudioStyle();
  const activeStyle = themeOverride ?? studioStyle;

  const uid = useId().replace(/:/g, '');
  const boardGradId = `board-${uid}`;
  const dotIdleId = `dot-idle-${uid}`;
  const dotActiveId = `dot-active-${uid}`;

  const stringsX = [12, 27.2, 42.4, 57.6, 72.8, 88] as const;
  const fretsY = [20, 45, 70, 95, 120] as const;

  const relativeBarreFret =
    barre && barre.fret > 0 ? barre.fret - startFret + 1 : null;
  const showBarre =
    barre !== undefined &&
    relativeBarreFret !== null &&
    relativeBarreFret >= 1 &&
    relativeBarreFret <= 4;

  const showSingleInlay = startFret === 1 || startFret === 5 || startFret === 7 || startFret === 9;
  const showDoubleInlay = startFret === 12;

  const isVinyl = activeStyle === 'vinyl';
  const isOp1 = activeStyle === 'op1';
  const isApple = activeStyle === 'apple';

  const stringPalette = isVinyl
    ? VINYL_STRINGS
    : isOp1
      ? OP1_STRINGS
      : isApple
        ? APPLE_STRINGS
        : LUTHIER_STRINGS;

  const nutColor = isVinyl
    ? '#141210'
    : isOp1
      ? '#FF5722'
      : isApple
        ? '#F4F4F5'
        : '#EDE4D3';

  const fretWireColor = isVinyl
    ? 'rgba(20, 18, 16, 0.48)'
    : isOp1
      ? 'rgba(255, 255, 255, 0.22)'
      : isApple
        ? 'rgba(255, 255, 255, 0.24)'
        : 'rgba(218, 212, 200, 0.34)';

  const openCircleStroke = isActive
    ? isOp1
      ? '#FF5722'
      : 'var(--mood-accent)'
    : isVinyl
      ? '#141210'
      : isOp1
        ? '#38BDF8'
        : '#A9A093';

  return (
    <div className="flex flex-col items-center select-none w-full max-w-[158px]">
      <svg viewBox="-14 0 118 134" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={boardGradId} x1="0" y1="0" x2="0.85" y2="1">
            {isVinyl ? (
              <>
                <stop offset="0%" stopColor="#FAF6EC" />
                <stop offset="100%" stopColor="#EFE7D6" />
              </>
            ) : isOp1 ? (
              <>
                <stop offset="0%" stopColor="#111419" />
                <stop offset="100%" stopColor="#090B0E" />
              </>
            ) : isApple ? (
              <>
                <stop offset="0%" stopColor="#262830" />
                <stop offset="100%" stopColor="#17191F" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#291F18" />
                <stop offset="52%" stopColor="#201712" />
                <stop offset="100%" stopColor="#16100C" />
              </>
            )}
          </linearGradient>

          <radialGradient id={dotIdleId} cx="35%" cy="30%" r="70%">
            {isVinyl ? (
              <>
                <stop offset="0%" stopColor="#2A2622" />
                <stop offset="100%" stopColor="#141210" />
              </>
            ) : isOp1 ? (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#D1D5DB" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FAF5ED" />
                <stop offset="65%" stopColor="#E6DCCE" />
                <stop offset="100%" stopColor="#B8AD9E" />
              </>
            )}
          </radialGradient>

          <radialGradient id={dotActiveId} cx="35%" cy="30%" r="70%">
            {isOp1 ? (
              <>
                <stop offset="0%" stopColor="#FFA07A" />
                <stop offset="50%" stopColor="#FF5722" />
                <stop offset="100%" stopColor="#E64310" />
              </>
            ) : isVinyl ? (
              <>
                <stop offset="0%" stopColor="var(--mood-accent)" />
                <stop offset="100%" stopColor="var(--mood-accent)" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="45%" stopColor="var(--mood-accent)" />
                <stop offset="100%" stopColor="var(--mood-accent)" />
              </>
            )}
          </radialGradient>
        </defs>

        {/* Fretboard Surface */}
        <rect
          x="8"
          y="20"
          width="84"
          height="102"
          rx={isVinyl ? '2' : '4'}
          fill={`url(#${boardGradId})`}
          stroke={
            isVinyl
              ? '#141210'
              : isOp1
                ? 'rgba(56, 189, 248, 0.28)'
                : 'rgba(244, 236, 224, 0.14)'
          }
          strokeWidth={isVinyl ? '1.6' : '0.9'}
        />

        {/* Wood-grain only in Luthier mode */}
        {activeStyle === 'luthier' && (
          <>
            <line x1="21" y1="22" x2="20" y2="120" stroke="rgba(14, 9, 6, 0.42)" strokeWidth="0.8" />
            <line x1="36" y1="22" x2="37" y2="120" stroke="rgba(14, 9, 6, 0.36)" strokeWidth="0.7" />
            <line x1="63" y1="22" x2="62" y2="120" stroke="rgba(14, 9, 6, 0.4)" strokeWidth="0.8" />
            <line x1="78" y1="22" x2="79" y2="120" stroke="rgba(14, 9, 6, 0.32)" strokeWidth="0.7" />
          </>
        )}

        {/* Inlay Dots */}
        {showSingleInlay && (
          <circle
            cx="50"
            cy="82.5"
            r={isOp1 ? '2.2' : '2.8'}
            fill={isVinyl ? 'rgba(20, 18, 16, 0.14)' : 'rgba(245, 239, 230, 0.14)'}
          />
        )}
        {showDoubleInlay && (
          <>
            <circle
              cx="34.8"
              cy="57.5"
              r="2.4"
              fill={isVinyl ? 'rgba(20, 18, 16, 0.14)' : 'rgba(245, 239, 230, 0.16)'}
            />
            <circle
              cx="65.2"
              cy="57.5"
              r="2.4"
              fill={isVinyl ? 'rgba(20, 18, 16, 0.14)' : 'rgba(245, 239, 230, 0.16)'}
            />
          </>
        )}

        {/* Nut & Fret Wires */}
        {fretsY.map((y, i) => {
          const isNut = i === 0 && startFret === 1;
          return (
            <g key={`fret-${i}`}>
              <line
                x1="9.5"
                y1={y}
                x2="90.5"
                y2={y}
                stroke={isNut ? nutColor : fretWireColor}
                strokeWidth={isNut ? 4.2 : isVinyl ? 1.5 : 1.3}
                strokeLinecap={isVinyl ? 'square' : 'round'}
              />
            </g>
          );
        })}

        {/* Strings */}
        {stringsX.map((x, i) => {
          const isPlayed = frets[i] >= 0;
          const shouldAnimate = isPlayed && pluckTick > 0;
          const strokeColor = !isPlayed
            ? isVinyl
              ? 'rgba(20, 18, 16, 0.22)'
              : 'rgba(148, 163, 184, 0.26)'
            : stringPalette[i];

          return (
            <g key={`string-group-${i}`}>
              <line
                key={`string-${i}-${pluckTick}`}
                x1={x}
                y1="20"
                x2={x}
                y2="121"
                stroke={strokeColor}
                strokeOpacity={isActive && isPlayed ? 0.98 : isPlayed ? 0.85 : 0.42}
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
                  <title>{`Tocar cuerda ${6 - i}`}</title>
                </line>
              )}
            </g>
          );
        })}

        {/* Start Fret Label */}
        {startFret > 1 && (
          <text
            x="2"
            y="36"
            className="font-mono text-[10px] font-semibold"
            fill={isVinyl ? '#141210' : isOp1 ? '#38BDF8' : '#A9A093'}
            textAnchor="end"
          >
            {startFret}fr
          </text>
        )}

        {/* Barre Indicator */}
        {showBarre && barre && relativeBarreFret !== null && (
          <rect
            x={stringsX[barre.fromString] - 5.5}
            y={fretsY[relativeBarreFret - 1] + 12.5 - 5.5}
            width={stringsX[barre.toString] - stringsX[barre.fromString] + 11}
            height={11}
            rx={isVinyl ? 3 : 5.5}
            fill={isActive ? `url(#${dotActiveId})` : `url(#${dotIdleId})`}
            stroke={isVinyl ? '#141210' : 'rgba(17, 16, 14, 0.72)'}
            strokeWidth="1.1"
          />
        )}

        {/* String Markers */}
        {frets.map((fret, i) => {
          const x = stringsX[i];

          if (fret === -1) {
            return (
              <text
                key={`marker-${i}`}
                x={x}
                y="13"
                className="font-mono text-[11px] font-bold"
                fill={isVinyl ? '#524C44' : isOp1 ? '#64748B' : '#7C766D'}
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
                r="3.7"
                stroke={openCircleStroke}
                fill="transparent"
                strokeWidth="1.75"
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
              <circle
                key={`marker-${i}`}
                cx={x}
                cy={cy}
                r="5.1"
                fill={isActive ? `url(#${dotActiveId})` : `url(#${dotIdleId})`}
                stroke={isVinyl ? '#141210' : 'rgba(17, 16, 14, 0.75)'}
                strokeWidth={isVinyl ? '1.3' : '0.95'}
                className="pointer-events-none"
              />
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
};
