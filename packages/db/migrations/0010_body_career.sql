-- AbirOS extension Stage C — body & career: diet, gym, biomarkers, leetcode, skills, resume analysis.

-- Diet ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meal_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eaten_at   timestamptz NOT NULL DEFAULT now(),
  meal_type  text NOT NULL DEFAULT 'snack',
  items      jsonb NOT NULL DEFAULT '[]',
  calories   double precision,
  protein_g  double precision,
  carbs_g    double precision,
  fat_g      double precision,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS meal_log_eaten_idx ON meal_log (eaten_at);

-- Gym -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workout (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  performed_at timestamptz NOT NULL DEFAULT now(),
  type         text NOT NULL DEFAULT 'strength',
  duration_min integer,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workout_at_idx ON workout (performed_at);

CREATE TABLE IF NOT EXISTS exercise (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  muscle_group text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workout_set (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  uuid NOT NULL REFERENCES workout(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES exercise(id) ON DELETE SET NULL,
  reps        integer,
  weight      double precision,
  rpe         double precision,
  ord         integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS workout_set_workout_idx ON workout_set (workout_id);

-- Health / biomarkers -------------------------------------------------------
CREATE TABLE IF NOT EXISTS biomarker (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  unit            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biomarker_reading (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  biomarker_id    uuid NOT NULL REFERENCES biomarker(id) ON DELETE CASCADE,
  value           double precision NOT NULL,
  unit            text,
  reference_low   double precision,
  reference_high  double precision,
  taken_on        date,
  source_id       uuid REFERENCES source(id) ON DELETE SET NULL,
  out_of_range    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS biomarker_reading_idx ON biomarker_reading (biomarker_id, taken_on);

-- LeetCode ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leetcode_profile (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username     text NOT NULL,
  total_solved integer NOT NULL DEFAULT 0,
  easy         integer NOT NULL DEFAULT 0,
  medium       integer NOT NULL DEFAULT 0,
  hard         integer NOT NULL DEFAULT 0,
  ranking      integer,
  last_synced  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lc_problem (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text NOT NULL UNIQUE,
  title      text NOT NULL,
  difficulty text,
  tags       jsonb NOT NULL DEFAULT '[]',
  my_status  text,
  tsv        tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, ''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lc_problem_tsv_idx ON lc_problem USING gin (tsv);

CREATE TABLE IF NOT EXISTS lc_submission (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL,
  title        text,
  lang         text,
  status       text,
  submitted_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, submitted_at)
);

-- Skills --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  level      double precision NOT NULL DEFAULT 0,
  source     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_signal (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id   uuid NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  kind       text NOT NULL,
  weight     double precision NOT NULL DEFAULT 1,
  detail     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Resume analysis -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS resume_analysis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_version_id uuid REFERENCES resume_version(id) ON DELETE SET NULL,
  target_jd         text,
  result            jsonb NOT NULL DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now()
);
