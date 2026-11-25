CREATE TABLE IF NOT EXISTS saved_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_root TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('major', 'minor')),
  mood TEXT NOT NULL,
  bpm INTEGER NOT NULL CHECK (bpm BETWEEN 40 AND 220),
  degrees INTEGER[] NOT NULL,
  chord_symbols TEXT[] NOT NULL,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_progressions_user_saved
  ON saved_progressions (user_id, saved_at DESC);
