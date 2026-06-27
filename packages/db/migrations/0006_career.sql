-- AbirOS Phase 6 — Interview Coach + Resume Evolution.

CREATE TABLE IF NOT EXISTS interview_session (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic      text NOT NULL,
  status     text NOT NULL DEFAULT 'active',   -- active | done
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interview_turn (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES interview_session(id) ON DELETE CASCADE,
  ord        integer NOT NULL,
  question   text NOT NULL,
  answer     text,
  scores     jsonb NOT NULL DEFAULT '{}',       -- {relevance, confidence, fillerCount, wordCount}
  feedback   text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interview_turn_session_idx ON interview_turn (session_id);

CREATE TABLE IF NOT EXISTS resume_version (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label           text NOT NULL DEFAULT 'Resume',
  content         text NOT NULL,
  job_description text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
