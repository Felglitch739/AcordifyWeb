import React from 'react';

interface PanelWrapperProps {
  title: React.ReactNode;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onBypass?: () => void;
  className?: string;
  contentClassName?: string;
  dragHandleProps?: Record<string, any>;
}

export const PanelWrapper: React.FC<PanelWrapperProps> = ({
  title,
  rightSlot,
  children,
  collapsed = false,
  onToggleCollapse,
  onBypass,
  className = '',
  contentClassName = '',
  dragHandleProps,
}) => {
  return (
    <div className={`border border-[var(--border-color)] rounded-sm shadow-md select-none flex flex-col overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-2 cursor-pointer"
        onClick={onToggleCollapse}
        role={onToggleCollapse ? 'button' : undefined}
        tabIndex={onToggleCollapse ? 0 : undefined}
        aria-expanded={onToggleCollapse ? !collapsed : undefined}
        onKeyDown={(event) => {
          if (!onToggleCollapse) {
            return;
          }

          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggleCollapse();
          }
        }}
      >
        <div className="min-w-0 flex items-center gap-3">
          <div
            {...(dragHandleProps || {})}
            className={`opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab text-[var(--text-muted)]`}
            role={dragHandleProps ? 'button' : undefined}
            tabIndex={dragHandleProps ? 0 : undefined}
            aria-describedby={dragHandleProps ? 'workspace-dnd-instructions' : undefined}
            aria-hidden={dragHandleProps ? false : true}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[var(--text-muted)]">
              <path d="M10 6h4M10 12h4M10 18h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {title}
        </div>
        <div className="flex items-center gap-3">
          {rightSlot}
          {onBypass && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onBypass();
              }}
              className={`text-[9px] font-mono text-[var(--text-muted)] hover:text-red-500 border border-[var(--border-color)] hover:border-red-900/50 px-1 py-0.5 rounded-sm bg-[var(--bg-secondary)] uppercase transition-all cursor-pointer`}
            >
              {collapsed ? '[ BYPASSED ]' : '[ BYPASS ]'}
            </button>
          )}
        </div>
      </div>

      <div className={`transition-[max-height] duration-200 ease-in-out overflow-hidden ${collapsed ? 'max-h-0' : 'max-h-1000'}`}>
        <div className={contentClassName}>{children}</div>
      </div>
    </div>
  );
};

export default PanelWrapper;