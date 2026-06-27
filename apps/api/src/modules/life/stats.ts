/**
 * Pure, dependency-free analytics used by the Life module: simple forecasting,
 * anomaly detection, and recurring-charge (subscription) detection. Deliberately
 * lightweight (moving averages + linear trend) — a real model can slot in later.
 */

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Least-squares line y = slope*x + intercept. */
export function linearRegression(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: ys[0]! };
  const xs = ys.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - mx) * (ys[i]! - my);
    den += (xs[i]! - mx) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

/** Project the linear trend forward `steps` points. */
export function forecast(series: number[], steps: number): number[] {
  const { slope, intercept } = linearRegression(series);
  const out: number[] = [];
  for (let i = 0; i < steps; i++) out.push(slope * (series.length + i) + intercept);
  return out;
}

export function movingAverage(series: number[], window: number): number[] {
  if (window <= 1) return [...series];
  const out: number[] = [];
  for (let i = 0; i < series.length; i++) {
    const slice = series.slice(Math.max(0, i - window + 1), i + 1);
    out.push(mean(slice));
  }
  return out;
}

/** Indices whose value is more than `z` standard deviations from the mean. */
export function detectAnomalies(values: number[], z = 2): number[] {
  const m = mean(values);
  const sd = stddev(values);
  if (sd === 0) return [];
  const out: number[] = [];
  values.forEach((v, i) => {
    if (Math.abs(v - m) > z * sd) out.push(i);
  });
  return out;
}

export interface RecurringCharge {
  merchant: string;
  amount: number;
  count: number;
  cadence: 'weekly' | 'monthly' | 'yearly' | 'irregular';
}

/** Detect likely subscriptions: a merchant charged >=3 times at a steady amount + interval. */
export function detectRecurring(
  charges: { merchant: string | null; amount: number; spentOn: string }[],
): RecurringCharge[] {
  const groups = new Map<string, { amount: number; date: number }[]>();
  for (const c of charges) {
    const key = (c.merchant ?? '').trim().toLowerCase();
    if (!key) continue;
    const list = groups.get(key) ?? [];
    list.push({ amount: c.amount, date: new Date(c.spentOn).getTime() });
    groups.set(key, list);
  }

  const out: RecurringCharge[] = [];
  for (const [merchant, list] of groups) {
    if (list.length < 3) continue;
    list.sort((a, b) => a.date - b.date);
    const amounts = list.map((l) => l.amount);
    const amtMean = mean(amounts);
    // Amounts must be reasonably consistent (within ~15% spread).
    if (amtMean === 0 || stddev(amounts) / Math.abs(amtMean) > 0.15) continue;

    const gapsDays: number[] = [];
    for (let i = 1; i < list.length; i++) gapsDays.push((list[i]!.date - list[i - 1]!.date) / 86_400_000);
    const gap = mean(gapsDays);
    let cadence: RecurringCharge['cadence'] = 'irregular';
    if (gap >= 5 && gap <= 9) cadence = 'weekly';
    else if (gap >= 25 && gap <= 35) cadence = 'monthly';
    else if (gap >= 350 && gap <= 380) cadence = 'yearly';

    out.push({
      merchant,
      amount: Number(amtMean.toFixed(2)),
      count: list.length,
      cadence,
    });
  }
  return out.sort((a, b) => b.amount * b.count - a.amount * a.count);
}
