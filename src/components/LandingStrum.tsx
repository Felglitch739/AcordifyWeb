import { useRef, useState, type PointerEvent } from 'react';

const strings = ['E', 'A', 'D', 'G', 'B', 'e'];

interface LandingStrumProps {
  notes: readonly (string | undefined)[];
  onPlay: (note: string) => void;
}

export function LandingStrum({ notes, onPlay }: LandingStrumProps) {
  const drag = useRef<{ pointerId: number; stringIndex: number } | null>(null);
  const [plucks, setPlucks] = useState(() => strings.map(() => 0));

  const playString = (index: number) => {
    const note = notes[index];
    if (!note) return;
    setPlucks((previous) => previous.map((count, stringIndex) => stringIndex === index ? count + 1 : count));
    onPlay(note);
  };

  const stringAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = (event.clientY - rect.top) / rect.height;
    return Math.max(0, Math.min(strings.length - 1, Math.floor(position * strings.length)));
  };

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    const stringIndex = stringAt(event);
    drag.current = { pointerId: event.pointerId, stringIndex };
    event.currentTarget.setPointerCapture(event.pointerId);
    playString(stringIndex);
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const next = stringAt(event);
    const direction = Math.sign(next - gesture.stringIndex);
    while (gesture.stringIndex !== next) {
      gesture.stringIndex += direction;
      playString(gesture.stringIndex);
    }
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerId === drag.current?.pointerId) drag.current = null;
  };

  return (
    <div
      className="landing-strum-strings"
      role="group"
      aria-label="Cuerdas del acorde"
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onLostPointerCapture={endDrag}
    >
      {strings.map((string, index) => {
        const note = notes[index];
        return (
          <button
            key={index}
            type="button"
            aria-label={note ? `Tocar cuerda ${6 - index}, ${note}` : `Cuerda ${6 - index} silenciada`}
            aria-disabled={!note || undefined}
            tabIndex={note ? 0 : -1}
            onClick={(event) => {
              if (event.detail === 0) playString(index);
            }}
          >
            <span aria-hidden="true">{string}</span>
            <span
              key={plucks[index]}
              className={plucks[index] ? 'landing-string is-plucked' : 'landing-string'}
              aria-hidden="true"
            />
            <span aria-hidden="true">{note ?? '×'}</span>
          </button>
        );
      })}
    </div>
  );
}
