-- AbirOS Phase 5 — Life: metrics, expenses, subscriptions, journal.

-- Generic metrics time-series -----------------------------------------------
CREATE TABLE IF NOT EXISTS metric (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  unit       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS metric_point (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id   uuid NOT NULL REFERENCES metric(id) ON DELETE CASCADE,
  value       double precision NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS metric_point_metric_idx ON metric_point (metric_id, recorded_at);

-- Expenses -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expense (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spent_on   date NOT NULL,
  amount     double precision NOT NULL,
  category   text,
  merchant   text,
  note       text,
  recurring  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS expense_date_idx ON expense (spent_on);
CREATE INDEX IF NOT EXISTS expense_merchant_idx ON expense (merchant);

CREATE TABLE IF NOT EXISTS subscription (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  amount         double precision,
  cadence        text,                  -- monthly | yearly | weekly
  next_charge_on date,
  active         boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Journal --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journal_entry (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_on   date NOT NULL,
  title      text,
  content    text NOT NULL DEFAULT '',
  mood       integer,                   -- 1..5 optional
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS journal_date_idx ON journal_entry (entry_on);
