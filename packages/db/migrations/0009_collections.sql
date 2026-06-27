-- AbirOS extension Stage B — interests & collections: music, books, sports, travel.

DO $$ BEGIN CREATE TYPE music_source AS ENUM ('youtube','manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE music_event_kind AS ENUM ('liked','played'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE book_status AS ENUM ('want_to_read','reading','read'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE place_status AS ENUM ('want_to_visit','visited'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE sport_kind AS ENUM ('sport','team','athlete'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS music_artist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  metadata   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS music_track (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  artist_id   uuid REFERENCES music_artist(id) ON DELETE SET NULL,
  album       text,
  source      music_source NOT NULL DEFAULT 'manual',
  external_id text,
  url         text,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS music_track_external_uq ON music_track (external_id) WHERE external_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS music_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id    uuid NOT NULL REFERENCES music_track(id) ON DELETE CASCADE,
  kind        music_event_kind NOT NULL DEFAULT 'played',
  occurred_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS music_event_track_idx ON music_event (track_id);

CREATE TABLE IF NOT EXISTS book (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  author      text,
  status      book_status NOT NULL DEFAULT 'want_to_read',
  rating      integer,
  started_on  date,
  finished_on date,
  notes       text,
  highlights  jsonb NOT NULL DEFAULT '[]',
  source_id   uuid REFERENCES source(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS book_status_idx ON book (status);

CREATE TABLE IF NOT EXISTS sport_interest (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       sport_kind NOT NULL DEFAULT 'sport',
  label      text NOT NULL,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS place (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  country    text,
  lat        double precision,
  lng        double precision,
  status     place_status NOT NULL DEFAULT 'want_to_visit',
  notes      text,
  source_id  uuid REFERENCES source(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  start_date       date,
  end_date         date,
  journal_entry_id uuid REFERENCES journal_entry(id) ON DELETE SET NULL,
  summary          text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trip_place (
  trip_id  uuid NOT NULL REFERENCES trip(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES place(id) ON DELETE CASCADE,
  PRIMARY KEY (trip_id, place_id)
);
