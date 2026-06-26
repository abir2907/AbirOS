-- AbirOS Phase 1 — initial schema.
-- Applied by the custom migrator (pnpm db:migrate) over the Neon DIRECT connection.

CREATE EXTENSION IF NOT EXISTS vector;

-- Enums ----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE source_type AS ENUM (
    'note','pdf','docx','web_article','screenshot','image','github_repo',
    'github_commit','journal_entry','email','expense_csv','book',
    'research_paper','certificate','dataset','chat_message'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE source_status AS ENUM ('pending','processing','ready','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Core knowledge -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         source_type NOT NULL,
  title        text NOT NULL,
  uri          text,
  mime         text,
  byte_size    bigint,
  hash         text,
  metadata     jsonb NOT NULL DEFAULT '{}',
  ingested_at  timestamptz,
  status       source_status NOT NULL DEFAULT 'pending',
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);
CREATE INDEX IF NOT EXISTS source_hash_idx ON source (hash);
CREATE INDEX IF NOT EXISTS source_type_idx ON source (type);

CREATE TABLE IF NOT EXISTS document (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id  uuid NOT NULL REFERENCES source(id) ON DELETE CASCADE,
  title      text,
  text       text NOT NULL,
  lang       text DEFAULT 'en',
  metadata   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_source_idx ON document (source_id);

CREATE TABLE IF NOT EXISTS chunk (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  source_id   uuid NOT NULL REFERENCES source(id) ON DELETE CASCADE,
  ord         integer NOT NULL,
  text        text NOT NULL,
  token_count integer NOT NULL DEFAULT 0,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  -- Generated full-text vector, maintained by Postgres.
  tsv         tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED
);
CREATE INDEX IF NOT EXISTS chunk_document_idx ON chunk (document_id);
CREATE INDEX IF NOT EXISTS chunk_source_idx ON chunk (source_id);
CREATE INDEX IF NOT EXISTS chunk_tsv_idx ON chunk USING gin (tsv);

CREATE TABLE IF NOT EXISTS embedding (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id   uuid NOT NULL UNIQUE REFERENCES chunk(id) ON DELETE CASCADE,
  embedding  vector(768) NOT NULL,
  model      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- HNSW + cosine, per the Neon/pgvector guidance.
CREATE INDEX IF NOT EXISTS embedding_hnsw_idx
  ON embedding USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS tag (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS source_tag (
  source_id uuid NOT NULL REFERENCES source(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (source_id, tag_id)
);

-- Knowledge graph ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL,
  name            text NOT NULL,
  normalized_name text NOT NULL,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entity_norm_idx ON entity (normalized_name);

CREATE TABLE IF NOT EXISTS entity_mention (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id  uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  source_id  uuid NOT NULL REFERENCES source(id) ON DELETE CASCADE,
  chunk_id   uuid REFERENCES chunk(id) ON DELETE SET NULL,
  snippet    text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mention_entity_idx ON entity_mention (entity_id);
CREATE INDEX IF NOT EXISTS mention_source_idx ON entity_mention (source_id);

CREATE TABLE IF NOT EXISTS relation (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  to_entity_id   uuid NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  type           text NOT NULL,
  weight         double precision NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS relation_from_idx ON relation (from_entity_id);
CREATE INDEX IF NOT EXISTS relation_to_idx ON relation (to_entity_id);

-- App / feature --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_user (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username     text NOT NULL UNIQUE,
  display_name text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS note (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id        uuid REFERENCES source(id) ON DELETE SET NULL,
  title            text NOT NULL,
  content_markdown text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz
);
CREATE INDEX IF NOT EXISTS note_source_idx ON note (source_id);

CREATE TABLE IF NOT EXISTS chat_session (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title      text NOT NULL DEFAULT 'New chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS chat_message (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_session(id) ON DELETE CASCADE,
  role       text NOT NULL,
  content    text NOT NULL DEFAULT '',
  tool_calls jsonb NOT NULL DEFAULT '[]',
  citations  jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS message_session_idx ON chat_message (session_id);

CREATE TABLE IF NOT EXISTS setting (
  key        text PRIMARY KEY,
  value      jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_run (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name    text NOT NULL,
  source_id   uuid REFERENCES source(id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'running',
  error       text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  metadata    jsonb NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS jobrun_source_idx ON job_run (source_id);
