-- Requires pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  title      TEXT        NOT NULL DEFAULT 'Untitled',
  content    JSONB       NOT NULL DEFAULT '{}',
  tags       TEXT[]      NOT NULL DEFAULT '{}',
  embedding  vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes (user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes (updated_at DESC);

-- Migration: add user_id to an existing notes table (run once on existing installs)
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
