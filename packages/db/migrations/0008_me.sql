-- AbirOS extension Stage A — the "Me" core: profile, interests, accomplishments,
-- goal horizons, study backlog.

DO $$ BEGIN
  CREATE TYPE interest_category AS ENUM (
    'music_genre','artist','food','cuisine','hobby','sport','team','topic',
    'author','place','app_tool','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE interest_sentiment AS ENUM ('love','like','neutral','dislike');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE goal_horizon AS ENUM ('short_term','long_term','life');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE study_status AS ENUM ('want_to_study','studying','studied');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Singleton self-profile -----------------------------------------------------
CREATE TABLE IF NOT EXISTS profile (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bio                 text,
  personality         text,
  big_five            jsonb,
  core_values         jsonb NOT NULL DEFAULT '[]',
  communication_prefs text,
  summary             text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interest (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category   interest_category NOT NULL DEFAULT 'other',
  label      text NOT NULL,
  sentiment  interest_sentiment NOT NULL DEFAULT 'like',
  notes      text,
  metadata   jsonb NOT NULL DEFAULT '{}',
  source_id  uuid REFERENCES source(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interest_category_idx ON interest (category);

CREATE TABLE IF NOT EXISTS accomplishment (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  category    text,
  happened_on date,
  links       jsonb NOT NULL DEFAULT '[]',
  source_id   uuid REFERENCES source(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS accomplishment_date_idx ON accomplishment (happened_on);

CREATE TABLE IF NOT EXISTS study_item (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic            text NOT NULL,
  status           study_status NOT NULL DEFAULT 'want_to_study',
  resource_links   jsonb NOT NULL DEFAULT '[]',
  priority         integer NOT NULL DEFAULT 0,
  notes            text,
  linked_entity_id uuid REFERENCES entity(id) ON DELETE SET NULL,
  source_id        uuid REFERENCES source(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_item_status_idx ON study_item (status);

-- Extend existing goals ------------------------------------------------------
ALTER TABLE goal ADD COLUMN IF NOT EXISTS horizon goal_horizon NOT NULL DEFAULT 'short_term';
ALTER TABLE goal ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE goal ADD COLUMN IF NOT EXISTS why text;
ALTER TABLE goal ADD COLUMN IF NOT EXISTS is_life_goal boolean NOT NULL DEFAULT false;
