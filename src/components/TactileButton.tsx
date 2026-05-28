import React from 'react';
import { playClickSound } from '../utils';

interface TactileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'orange' | 'green' | 'zinc' | 'red';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const TactileButton: React.FC<TactileButtonProps> = ({
  variant = 'green',
  isLoading = false,
  children,
  className = '',
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  // Styles based on physical state
  const baseStyles = "relative inline-flex items-center justify-center font-mono text-xs uppercase tracking-wider px-4 py-2.5 font-semibold select-none border-2 border-black outline-none";
  
  const variantStyles = {
    orange: isDisabled
      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50 shadow-none"
      : "bg-amber-600 hover:bg-amber-500 text-stone-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none",
    green: isDisabled
      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50 shadow-none"
      : "bg-emerald-700 hover:bg-emerald-600 text-stone-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none",
    zinc: isDisabled
      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed opacity-50 shadow-none"
      : "bg-zinc-700 hover:bg-zinc-600 text-stone-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none",
    red: isDisabled
      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50 shadow-none"
      : "bg-red-700 hover:bg-red-600 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDisabled) playClickSound('down');
    if (onPointerDown) onPointerDown(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDisabled) playClickSound('up');
    if (onPointerUp) onPointerUp(e);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (onPointerLeave) onPointerLeave(e);
  };

  return (
    <button
      disabled={isDisabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {isLoading ? (
        <span className="animate-pulse">[ GENERANDO... ]</span>
      ) : (
        children
      )}
    </button>
  );
};
