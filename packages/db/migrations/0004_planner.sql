-- AbirOS Phase 4 — Planner: goals, calendar, daily plan, university companion.

-- Goals + simulator ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS goal (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  target_date date,
  status      text NOT NULL DEFAULT 'active',  -- active | done | abandoned
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE TABLE IF NOT EXISTS goal_step (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id    uuid NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
  title      text NOT NULL,
  done       boolean NOT NULL DEFAULT false,
  ord        integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goal_step_goal_idx ON goal_step (goal_id);

CREATE TABLE IF NOT EXISTS goal_snapshot (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     uuid NOT NULL REFERENCES goal(id) ON DELETE CASCADE,
  probability double precision NOT NULL,        -- 0..100
  rationale   text,
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goal_snapshot_goal_idx ON goal_snapshot (goal_id);

-- Calendar + daily plan ------------------------------------------------------
CREATE TABLE IF NOT EXISTS calendar_event (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  location    text,
  start_at    timestamptz NOT NULL,
  end_at      timestamptz,
  all_day     boolean NOT NULL DEFAULT false,
  source      text NOT NULL DEFAULT 'manual',   -- manual | ics
  uid         text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS calendar_start_idx ON calendar_event (start_at);
CREATE UNIQUE INDEX IF NOT EXISTS calendar_uid_uq ON calendar_event (uid) WHERE uid IS NOT NULL;

CREATE TABLE IF NOT EXISTS plan_item (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_date  date NOT NULL,
  title      text NOT NULL,
  detail     text,
  start_time text,                              -- "09:00"
  end_time   text,
  kind       text NOT NULL DEFAULT 'task',      -- task | event | study | assignment | goal
  ref_id     uuid,
  done       boolean NOT NULL DEFAULT false,
  ord        integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plan_item_date_idx ON plan_item (plan_date);

-- University companion -------------------------------------------------------
CREATE TABLE IF NOT EXISTS course (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  code       text,
  term       text,
  color      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS assignment (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  title      text NOT NULL,
  due_at     timestamptz,
  status     text NOT NULL DEFAULT 'todo',      -- todo | done
  weight     double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignment_course_idx ON assignment (course_id);
CREATE INDEX IF NOT EXISTS assignment_due_idx ON assignment (due_at);

CREATE TABLE IF NOT EXISTS timetable_slot (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,                 -- 0=Sun .. 6=Sat
  start_time  text NOT NULL,
  end_time    text NOT NULL,
  location    text
);
CREATE INDEX IF NOT EXISTS timetable_course_idx ON timetable_slot (course_id);

CREATE TABLE IF NOT EXISTS exam (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id  uuid NOT NULL REFERENCES course(id) ON DELETE CASCADE,
  title      text NOT NULL,
  exam_at    timestamptz,
  location   text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_course_idx ON exam (course_id);
