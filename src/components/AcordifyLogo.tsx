import React, { useId } from 'react';

interface AcordifyLogoProps {
  size?: number;
  className?: string;
}

export const AcordifyLogo: React.FC<AcordifyLogoProps> = ({
  size = 28,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `acordify-pick-${uid}`;

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
        <clipPath id={clipId}>
          <path d="M32 10C43.5 10 52 15.2 52 24.5C52 36.2 39.2 50.8 33.4 55C32.5 55.6 31.5 55.6 30.6 55C24.8 50.8 12 36.2 12 24.5C12 15.2 20.5 10 32 10Z" />
        </clipPath>
      </defs>

      <rect x="2" y="2" width="60" height="60" rx="14" fill="#111111" />

      <path
        d="M32 10C43.5 10 52 15.2 52 24.5C52 36.2 39.2 50.8 33.4 55C32.5 55.6 31.5 55.6 30.6 55C24.8 50.8 12 36.2 12 24.5C12 15.2 20.5 10 32 10Z"
        fill="#E85D3D"
      />

      <g clipPath={`url(#${clipId})`}>
        <circle cx="32" cy="27" r="9.2" fill="#111111" />
        <line x1="10" y1="23.5" x2="54" y2="23.5" stroke="#FFFFFF" strokeWidth="1.35" strokeOpacity="0.9" />
        <line x1="10" y1="27" x2="54" y2="27" stroke="#FFFFFF" strokeWidth="1.65" />
        <line x1="10" y1="30.5" x2="54" y2="30.5" stroke="#FFFFFF" strokeWidth="1.2" strokeOpacity="0.85" />

        <path
          d="M25.5 42.5L32 29.5L38.5 42.5"
          stroke="#FFFFFF"
          strokeWidth="2.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line
          x1="27.8"
          y1="38.2"
          x2="36.2"
          y2="38.2"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};
