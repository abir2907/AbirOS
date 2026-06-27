-- AbirOS Phase 3 — Learning: summaries, flashcards (SM-2), quizzes.

-- Per-source summary + key points -------------------------------------------
CREATE TABLE IF NOT EXISTS summary (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  uuid NOT NULL UNIQUE REFERENCES source(id) ON DELETE CASCADE,
  text       text NOT NULL,
  key_points jsonb NOT NULL DEFAULT '[]',
  model      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Flashcards (SM-2 spaced repetition) ---------------------------------------
CREATE TABLE IF NOT EXISTS flashcard (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid REFERENCES source(id) ON DELETE SET NULL,
  front            text NOT NULL,
  back             text NOT NULL,
  ease             double precision NOT NULL DEFAULT 2.5,
  interval         integer NOT NULL DEFAULT 0,  -- days until next review
  reps             integer NOT NULL DEFAULT 0,
  lapses           integer NOT NULL DEFAULT 0,
  due_at           timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE INDEX IF NOT EXISTS flashcard_due_idx ON flashcard (due_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS flashcard_source_idx ON flashcard (source_id);

CREATE TABLE IF NOT EXISTS review_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flashcard_id  uuid NOT NULL REFERENCES flashcard(id) ON DELETE CASCADE,
  rating        text NOT NULL,         -- again | hard | good | easy
  quality       integer NOT NULL,      -- SM-2 quality 0..5
  prev_interval integer,
  new_interval  integer,
  ease          double precision,
  reviewed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS review_log_card_idx ON review_log (flashcard_id);

-- Quizzes --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quiz (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  uuid REFERENCES source(id) ON DELETE SET NULL,
  title      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_question (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      uuid NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
  ord          integer NOT NULL,
  question     text NOT NULL,
  options      jsonb NOT NULL DEFAULT '[]',
  answer_index integer NOT NULL,
  explanation  text
);
CREATE INDEX IF NOT EXISTS quiz_question_quiz_idx ON quiz_question (quiz_id);

CREATE TABLE IF NOT EXISTS quiz_attempt (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id      uuid NOT NULL REFERENCES quiz(id) ON DELETE CASCADE,
  score        integer NOT NULL,
  total        integer NOT NULL,
  answers      jsonb NOT NULL DEFAULT '[]',
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempt_quiz_idx ON quiz_attempt (quiz_id);
