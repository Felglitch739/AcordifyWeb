import React, { useId } from 'react';
import type { StudioThemeId } from '../styles/studioThemes';

interface AcordifyLogoProps {
  size?: number;
  theme?: StudioThemeId;
  className?: string;
}

interface PaletteSpec {
  plateBg: string;
  plateBorder: string;
  pickStart: string;
  pickEnd: string;
  holeFill: string;
  stringStroke: string;
  chevronStroke: string;
}

const LOGO_PALETTES: Readonly<Record<StudioThemeId, PaletteSpec>> = {
  apple: {
    plateBg: '#1D1D1F',
    plateBorder: 'rgba(255, 255, 255, 0.22)',
    pickStart: '#0A84FF',
    pickEnd: '#0056B3',
    holeFill: '#1D1D1F',
    stringStroke: '#FFFFFF',
    chevronStroke: '#FFFFFF',
  },
  op1: {
    plateBg: '#23252A',
    plateBorder: 'rgba(24, 25, 27, 0.35)',
    pickStart: '#FF6B35',
    pickEnd: '#E64310',
    holeFill: '#141518',
    stringStroke: '#F8F6F1',
    chevronStroke: '#FFFFFF',
  },
  vinyl: {
    plateBg: '#141210',
    plateBorder: '#141210',
    pickStart: '#E8432D',
    pickEnd: '#C8321E',
    holeFill: '#141210',
    stringStroke: '#FFFDF7',
    chevronStroke: '#FFFDF7',
  },
  luthier: {
    plateBg: '#151311',
    plateBorder: 'rgba(198, 151, 100, 0.45)',
    pickStart: '#F2AC63',
    pickEnd: '#B9652B',
    holeFill: '#151311',
    stringStroke: '#F5EFE6',
    chevronStroke: '#FAF5EC',
  },
};

export const AcordifyLogo: React.FC<AcordifyLogoProps> = ({
  size = 32,
  theme = 'luthier',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const gradId = `acordify-pick-${uid}`;
  const clipId = `acordify-clip-${uid}`;
  const palette = LOGO_PALETTES[theme];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="16" y1="10" x2="48" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={palette.pickStart} />
          <stop offset="100%" stopColor={palette.pickEnd} />
        </linearGradient>
        <clipPath id={clipId}>
          <path d="M32 10C43.5 10 52 15.2 52 24.5C52 36.2 39.2 50.8 33.4 55C32.5 55.6 31.5 55.6 30.6 55C24.8 50.8 12 36.2 12 24.5C12 15.2 20.5 10 32 10Z" />
        </clipPath>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="14" fill={palette.plateBg} />
      <rect
        x="2.75"
        y="2.75"
        width="58.5"
        height="58.5"
        rx="13.25"
        stroke={palette.plateBorder}
        strokeWidth="1.5"
      />

      <path
        d="M32 10C43.5 10 52 15.2 52 24.5C52 36.2 39.2 50.8 33.4 55C32.5 55.6 31.5 55.6 30.6 55C24.8 50.8 12 36.2 12 24.5C12 15.2 20.5 10 32 10Z"
        fill={`url(#${gradId})`}
      />

      <g clipPath={`url(#${clipId})`}>
        <circle cx="32" cy="27" r="9.2" fill={palette.holeFill} />
        <line
          x1="10"
          y1="23.5"
          x2="54"
          y2="23.5"
          stroke={palette.stringStroke}
          strokeWidth="1.35"
          strokeOpacity="0.88"
        />
        <line
          x1="10"
          y1="27"
          x2="54"
          y2="27"
          stroke={palette.stringStroke}
          strokeWidth="1.65"
          strokeOpacity="0.96"
        />
        <line
          x1="10"
          y1="30.5"
          x2="54"
          y2="30.5"
          stroke={palette.stringStroke}
          strokeWidth="1.2"
          strokeOpacity="0.82"
        />

        <path
          d="M25.5 42.5L32 29.5L38.5 42.5"
          stroke={palette.chevronStroke}
          strokeWidth="2.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="27.8"
          y1="38.2"
          x2="36.2"
          y2="38.2"
          stroke={palette.chevronStroke}
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
