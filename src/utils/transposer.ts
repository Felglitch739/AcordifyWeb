const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Map flats to sharps for simplicity in a 12-tone chromatic scale
const FLAT_TO_SHARP: Record<string, string> = {
  'Db': 'C#', 
  'Eb': 'D#', 
  'Gb': 'F#', 
  'Ab': 'G#', 
  'Bb': 'A#'
};

/**
 * Transposes a chord by a given number of semitones (steps).
 * Handles flats by converting to sharps.
 */
export function transposeChord(chord: string, steps: number): string {
  if (!chord) return chord;
  
  // Match root note (e.g. C, F#, Bb) and the extension/suffix (e.g. maj7, m9)
  const match = chord.match(/^([A-G][#b]?)(.*)$/);
  if (!match) return chord; // Not a standard chord string
  
  let root = match[1];
  const suffix = match[2];
  
  if (FLAT_TO_SHARP[root]) {
    root = FLAT_TO_SHARP[root];
  }
  
  const rootIndex = NOTES.indexOf(root);
  if (rootIndex === -1) return chord; // Invalid root note
  
  // Shift and wrap around using modulo math
  const newIndex = (rootIndex + steps) % 12;
  const wrappedIndex = newIndex < 0 ? newIndex + 12 : newIndex;
  
  return `${NOTES[wrappedIndex]}${suffix}`;
}
