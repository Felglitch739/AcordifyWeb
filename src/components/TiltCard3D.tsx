import React, { useEffect, useRef, useState } from 'react';

interface TiltCard3DProps {
  className?: string;
  isActive?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const MAX_TILT_DEG = 6.5;

export const TiltCard3D: React.FC<TiltCard3DProps> = ({
  className = '',
  isActive = false,
  children,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tiltEnabled, setTiltEnabled] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTiltEnabled(!coarsePointer && !reducedMotion);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltEnabled || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    const rotateY = (relX - 0.5) * 2 * MAX_TILT_DEG;
    const rotateX = (0.5 - relY) * 2 * MAX_TILT_DEG;

    const el = cardRef.current;
    el.style.setProperty('--rx', `${rotateX.toFixed(2)}deg`);
    el.style.setProperty('--ry', `${rotateY.toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(relX * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(relY * 100).toFixed(1)}%`);
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    const el = cardRef.current;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--mx', '50%');
    el.style.setProperty('--my', '50%');
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`tilt-card-3d ${isActive ? 'card-active-lift' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
