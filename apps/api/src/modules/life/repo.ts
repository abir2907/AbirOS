import { asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb, getPool, metric, metricPoint, expense, journalEntry } from '@abiros/db';

// ── Metrics ──────────────────────────────────────────────────────────────────
export async function listMetrics() {
  const { rows } = await getPool().query<{
    id: string;
    name: string;
    unit: string | null;
    points: number;
    last_value: number | null;
    last_at: string | null;
  }>(
    `SELECT m.id, m.name, m.unit,
            count(p.id)::int AS points,
            (SELECT value FROM metric_point WHERE metric_id = m.id ORDER BY recorded_at DESC LIMIT 1) AS last_value,
            max(p.recorded_at) AS last_at
       FROM metric m
       LEFT JOIN metric_point p ON p.metric_id = m.id
      GROUP BY m.id
      ORDER BY m.name`,
  );
  return rows;
}

export async function createMetric(name: string, unit?: string) {
  const db = getDb();
  const [row] = await db
    .insert(metric)
    .values({ name, unit })
    .onConflictDoUpdate({ target: metric.name, set: { unit } })
    .returning();
  return row!;
}

export async function addPoint(metricId: string, value: number, recordedAt?: Date, note?: string) {
  const db = getDb();
  const [row] = await db
    .insert(metricPoint)
    .values({ metricId, value, recordedAt: recordedAt ?? new Date(), note })
    .returning();
  return row!;
}

export async function getMetricSeries(metricId: string) {
  const db = getDb();
  const [m] = await db.select().from(metric).where(eq(metric.id, metricId)).limit(1);
  if (!m) return undefined;
  const points = await db
    .select({ value: metricPoint.value, recordedAt: metricPoint.recordedAt })
    .from(metricPoint)
    .where(eq(metricPoint.metricId, metricId))
    .orderBy(asc(metricPoint.recordedAt));
  return { metric: m, points };
}

// ── Expenses ─────────────────────────────────────────────────────────────────
export async function listExpenses(limit = 200) {
  const db = getDb();
  return db.select().from(expense).orderBy(desc(expense.spentOn)).limit(limit);
}

export async function addExpense(values: typeof expense.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(expense).values(values).returning();
  return row!;
}

export async function bulkInsertExpenses(rows: (typeof expense.$inferInsert)[]) {
  if (rows.length === 0) return 0;
  const db = getDb();
  const inserted = await db.insert(expense).values(rows).returning({ id: expense.id });
  return inserted.length;
}

export async function allExpenseCharges() {
  const db = getDb();
  return db
    .select({ merchant: expense.merchant, amount: expense.amount, spentOn: expense.spentOn })
    .from(expense);
}

export async function categorySummary() {
  const { rows } = await getPool().query<{ category: string; total: number; count: number }>(
    `SELECT coalesce(category, 'uncategorized') AS category, sum(amount)::float AS total, count(*)::int AS count
       FROM expense GROUP BY 1 ORDER BY total DESC`,
  );
  return rows;
}

export async function monthlyTotals() {
  const { rows } = await getPool().query<{ month: string; total: number }>(
    `SELECT to_char(spent_on, 'YYYY-MM') AS month, sum(amount)::float AS total
       FROM expense GROUP BY 1 ORDER BY 1`,
  );
  return rows;
}

// ── Journal ──────────────────────────────────────────────────────────────────
export async function listJournal(limit = 100) {
  const db = getDb();
  return db
    .select()
    .from(journalEntry)
    .where(isNull(journalEntry.deletedAt))
    .orderBy(desc(journalEntry.entryOn))
    .limit(limit);
}

export async function addJournal(values: typeof journalEntry.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(journalEntry).values(values).returning();
  return row!;
}

// ── Life Replay timeline (union across modules) ──────────────────────────────
export interface TimelineRow {
  at: string;
  type: string;
  title: string;
  detail: string | null;
}

export async function timeline(from: Date, to: Date, q = ''): Promise<TimelineRow[]> {
  const { rows } = await getPool().query<TimelineRow>(
    `SELECT at, type, title, detail FROM (
        SELECT s.ingested_at AS at, 'source' AS type, s.title AS title, s.type::text AS detail
          FROM source s WHERE s.deleted_at IS NULL AND s.ingested_at IS NOT NULL
        UNION ALL
        SELECT gc.authored_at, 'commit', left(gc.message, 80), r.full_name
          FROM git_commit gc JOIN repo r ON r.id = gc.repo_id WHERE gc.authored_at IS NOT NULL
        UNION ALL
        SELECT e.spent_on::timestamptz, 'expense', coalesce(e.merchant, 'expense'),
               e.amount::text || coalesce(' · ' || e.category, '')
          FROM expense e
        UNION ALL
        SELECT j.entry_on::timestamptz, 'journal', coalesce(j.title, 'Journal entry'), left(j.content, 80)
          FROM journal_entry j WHERE j.deleted_at IS NULL
        UNION ALL
        SELECT c.start_at, 'event', c.title, c.location
          FROM calendar_event c
     ) t
     WHERE at BETWEEN $1 AND $2
       AND ($3 = '' OR title ILIKE '%' || $3 || '%' OR coalesce(detail, '') ILIKE '%' || $3 || '%')
     ORDER BY at DESC
     LIMIT 300`,
    [from.toISOString(), to.toISOString(), q],
  );
  return rows;
}

// ── Personal dataset (daily aggregates) ──────────────────────────────────────
export interface DatasetRow {
  date: string;
  commits: number;
  spend: number;
  sources_added: number;
  cards_reviewed: number;
  journal_entries: number;
}

export async function dailyDataset(): Promise<DatasetRow[]> {
  const { rows } = await getPool().query<DatasetRow>(
    `WITH days AS (
        SELECT d::date AS date FROM generate_series(now() - interval '120 days', now(), interval '1 day') d
     )
     SELECT to_char(days.date, 'YYYY-MM-DD') AS date,
            coalesce(c.n, 0)::int AS commits,
            coalesce(e.total, 0)::float AS spend,
            coalesce(s.n, 0)::int AS sources_added,
            coalesce(r.n, 0)::int AS cards_reviewed,
            coalesce(j.n, 0)::int AS journal_entries
       FROM days
       LEFT JOIN (SELECT date(authored_at) d, count(*) n FROM git_commit GROUP BY 1) c ON c.d = days.date
       LEFT JOIN (SELECT spent_on d, sum(amount) total FROM expense GROUP BY 1) e ON e.d = days.date
       LEFT JOIN (SELECT date(ingested_at) d, count(*) n FROM source WHERE ingested_at IS NOT NULL GROUP BY 1) s ON s.d = days.date
       LEFT JOIN (SELECT date(reviewed_at) d, count(*) n FROM review_log GROUP BY 1) r ON r.d = days.date
       LEFT JOIN (SELECT entry_on d, count(*) n FROM journal_entry WHERE deleted_at IS NULL GROUP BY 1) j ON j.d = days.date
      ORDER BY days.date`,
  );
  return rows;
}
