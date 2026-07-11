ALTER TABLE {{schema}}.comments
  ADD COLUMN IF NOT EXISTS parent_comment_id uuid
  REFERENCES {{schema}}.comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS comments_parent_created_idx
  ON {{schema}}.comments (parent_comment_id, created_at);

ALTER TABLE {{schema}}.comments
  DROP CONSTRAINT IF EXISTS comments_not_own_parent;

ALTER TABLE {{schema}}.comments
  ADD CONSTRAINT comments_not_own_parent
  CHECK (parent_comment_id IS NULL OR parent_comment_id <> id);
