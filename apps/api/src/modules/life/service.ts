import Papa from 'papaparse';
import { detectRecurring, detectAnomalies, forecast, mean, movingAverage, pearson } from './stats.js';
import { getLlm } from '../../lib/ai.js';
import * as repo from './repo.js';

// ── Expense Detective ────────────────────────────────────────────────────────
export async function expenseInsights() {
  const [charges, monthly, categories, recent] = await Promise.all([
    repo.allExpenseCharges(),
    repo.monthlyTotals(),
    repo.categorySummary(),
    repo.listExpenses(500),
  ]);

  const recurring = detectRecurring(charges);
  const monthlyTotals = monthly.map((m) => m.total);
  const forecastNextMonth = monthlyTotals.length ? forecast(monthlyTotals, 1)[0]! : 0;

  // Unusual = individual expenses far above the typical amount.
  const amounts = recent.map((e) => e.amount);
  const anomalyIdx = new Set(detectAnomalies(amounts, 2.5));
  const unusual = recent
    .filter((_, i) => anomalyIdx.has(i))
    .map((e) => ({ id: e.id, merchant: e.merchant, amount: e.amount, spentOn: e.spentOn }));

  return {
    totalSpend: amounts.reduce((a, b) => a + b, 0),
    monthly,
    forecastNextMonth: Number(forecastNextMonth.toFixed(2)),
    categories,
    recurring,
    unusual,
  };
}

function pick(row: Record<string, string>, keys: string[]): string | undefined {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]));
  for (const k of keys) if (lower[k] != null && lower[k] !== '') return lower[k];
  return undefined;
}

function parseAmount(s?: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? Math.abs(n) : null;
}

function parseDate(s?: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Import a CSV of expenses; tolerant of common column names. */
export async function importExpenseCsv(text: string) {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const rows: { spentOn: string; amount: number; category?: string; merchant?: string }[] = [];
  let skipped = 0;
  for (const r of parsed.data) {
    const spentOn = parseDate(pick(r, ['date', 'spent_on', 'transaction date', 'posted date']));
    const amount = parseAmount(pick(r, ['amount', 'cost', 'price', 'debit', 'value']));
    if (!spentOn || amount == null) {
      skipped++;
      continue;
    }
    rows.push({
      spentOn,
      amount,
      category: pick(r, ['category', 'type']),
      merchant: pick(r, ['merchant', 'description', 'name', 'payee', 'details']),
    });
  }
  const imported = await repo.bulkInsertExpenses(rows);
  return { imported, skipped };
}

// ── Metric analytics ─────────────────────────────────────────────────────────
export async function metricAnalytics(metricId: string) {
  const data = await repo.getMetricSeries(metricId);
  if (!data) return undefined;
  const values = data.points.map((p) => p.value);
  const horizon = 7;
  return {
    metric: data.metric,
    points: data.points,
    stats: {
      average: Number(mean(values).toFixed(2)),
      smoothed: movingAverage(values, 7),
      count: values.length,
    },
    forecast: forecast(values, horizon).map((v) => Number(v.toFixed(2))),
  };
}

// ── Personal Dataset Generator ───────────────────────────────────────────────
export async function datasetJson() {
  return repo.dailyDataset();
}

export async function datasetCsv(): Promise<string> {
  const rows = await repo.dailyDataset();
  return Papa.unparse(rows);
}

// ── Cross-module correlations ─────────────────────────────────────────────────
const PRETTY: Record<string, string> = {
  commits: 'commits',
  spend: 'spending',
  sources_added: 'sources added',
  cards_reviewed: 'cards reviewed',
  journal_entries: 'journal entries',
};
const DATASET_COLS = ['commits', 'spend', 'sources_added', 'cards_reviewed', 'journal_entries'] as const;

/** Pairwise correlations across daily activity + metrics, phrased in plain language. */
export async function correlations() {
  const [dataset, metrics] = await Promise.all([repo.dailyDataset(), repo.dailyMetricSeries()]);
  const byDate = new Map(dataset.map((d) => [d.date, d]));

  const variables: { label: string; dates: string[]; get: (d: string) => number | undefined }[] = [];
  for (const [name, m] of metrics) variables.push({ label: name, dates: [...m.keys()], get: (d) => m.get(d) });
  for (const col of DATASET_COLS)
    variables.push({
      label: PRETTY[col]!,
      dates: dataset.map((x) => x.date),
      get: (d) => {
        const row = byDate.get(d);
        return row ? row[col] : undefined;
      },
    });

  const insights: { a: string; b: string; r: number; text: string }[] = [];
  for (let i = 0; i < variables.length; i++) {
    for (let j = i + 1; j < variables.length; j++) {
      const A = variables[i]!;
      const B = variables[j]!;
      const days = A.dates.filter((d) => A.get(d) != null && B.get(d) != null);
      if (days.length < 7) continue;
      const r = pearson(days.map((d) => A.get(d)!), days.map((d) => B.get(d)!));
      if (Math.abs(r) < 0.4) continue;
      const dir = r > 0 ? 'more' : 'less';
      insights.push({
        a: A.label,
        b: B.label,
        r: Number(r.toFixed(2)),
        text: `On days with higher ${A.label}, you tend to have ${dir} ${B.label}.`,
      });
    }
  }
  insights.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  return { insights: insights.slice(0, 8) };
}

// ── Weekly review ─────────────────────────────────────────────────────────────
export async function weeklyReview() {
  const a = await repo.weeklyAggregates();
  const res = await getLlm().chat({
    system: 'You write short, encouraging weekly reviews. Output markdown only, no preamble.',
    messages: [
      {
        role: 'user',
        content: `Write a brief weekly review of my past 7 days from these numbers: ${a.commits} commits, ${a.sources} things saved to my knowledge base, ${a.reviews} flashcards reviewed, ${a.journal} journal entries, ${a.plansDone} planned tasks completed, ${a.spend} spent. Call out wins and give one concrete suggestion for next week.`,
      },
    ],
  });
  return { stats: a, review: res.content };
}
