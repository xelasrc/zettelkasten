-- Requires pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  title      TEXT        NOT NULL DEFAULT 'Untitled',
  content    JSONB       NOT NULL DEFAULT '{}',
  links      TEXT[]      NOT NULL DEFAULT '{}',
  embedding  vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes (user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes (updated_at DESC);

CREATE TABLE IF NOT EXISTS folders (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS folders_user_id_idx ON folders (user_id);

-- Migrations for existing installs (run once):
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS links TEXT[] NOT NULL DEFAULT '{}';
-- ALTER TABLE notes DROP COLUMN IF EXISTS tags;
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS folder_id INTEGER REFERENCES folders(id) ON DELETE SET NULL;
