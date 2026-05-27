import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableToggleProps {
  id: string;
  children: React.ReactNode;
}

export const SortableToggle: React.FC<SortableToggleProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    willChange: 'transform',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="inline-block">
      <div className={`flex items-center transition-all duration-200 ease-out transform ${isDragging ? 'scale-105 opacity-95 shadow-2xl -translate-y-0.5' : 'translate-y-0'}`}>
        <div
          {...listeners}
          role="button"
          tabIndex={0}
          aria-describedby="workspace-dnd-instructions"
          aria-grabbed={isDragging}
          className={`cursor-grab mr-2 text-zinc-500 hover:text-amber-400 touch-none transition-colors duration-150 ${isDragging ? 'text-amber-300' : ''}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 6h4M10 12h4M10 18h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {children}
      </div>
    </div>
  );
};

export default SortableToggle;
