import Papa from 'papaparse';
import { detectRecurring, detectAnomalies, forecast, mean, movingAverage } from './stats.js';
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
