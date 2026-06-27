-- AbirOS Phase 2 — project memory + developer (GitHub) tables.

-- Project memory -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  description  text,
  architecture text,
  api_notes    text,
  decisions    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

-- Sources can belong to a project (architecture/API/decision memory).
ALTER TABLE source ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES project(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS source_project_idx ON source (project_id);

-- Developer / GitHub ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS repo (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id        bigint UNIQUE,
  name             text NOT NULL,
  full_name        text NOT NULL,
  description      text,
  url              text,
  primary_language text,
  languages        jsonb NOT NULL DEFAULT '{}',
  stars            integer NOT NULL DEFAULT 0,
  forks            integer NOT NULL DEFAULT 0,
  is_private       boolean NOT NULL DEFAULT false,
  pushed_at        timestamptz,
  synced_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  tsv tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(name, '') || ' ' || coalesce(full_name, '') || ' ' ||
      coalesce(description, '') || ' ' || coalesce(primary_language, ''))
  ) STORED
);
CREATE INDEX IF NOT EXISTS repo_tsv_idx ON repo USING gin (tsv);

-- "commit" is a SQL keyword, so the table is named git_commit.
CREATE TABLE IF NOT EXISTS git_commit (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id     uuid NOT NULL REFERENCES repo(id) ON DELETE CASCADE,
  sha         text NOT NULL,
  message     text NOT NULL DEFAULT '',
  url         text,
  authored_at timestamptz,
  additions   integer,
  deletions   integer,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(message, ''))) STORED,
  UNIQUE (repo_id, sha)
);
CREATE INDEX IF NOT EXISTS commit_repo_idx ON git_commit (repo_id);
CREATE INDEX IF NOT EXISTS commit_tsv_idx ON git_commit USING gin (tsv);
CREATE INDEX IF NOT EXISTS commit_authored_idx ON git_commit (authored_at);
