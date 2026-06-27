-- AbirOS Phase "Sharper AI" — long-term assistant memory.

CREATE TABLE IF NOT EXISTS user_memory (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content    text NOT NULL,
  source     text NOT NULL DEFAULT 'manual',   -- manual | assistant
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_memory_created_idx ON user_memory (created_at DESC);
