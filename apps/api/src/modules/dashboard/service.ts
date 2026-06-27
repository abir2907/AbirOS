import { getPool } from '@abiros/db';
import { countDue } from '../learning/repo.js';
import { getPlan, listGoals } from '../planner/repo.js';
import { listSources } from '../sources/repo.js';
import { recentActivity } from '../developer/repo.js';

/** Cross-module at-a-glance summary for the Dashboard. */
export async function dashboardSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const [due, plan, sources, activity, goals] = await Promise.all([
    countDue(),
    getPlan(today),
    listSources(5, 0),
    recentActivity(30),
    listGoals(),
  ]);

  const spend = (
    await getPool().query<{ total: number }>(
      `SELECT coalesce(sum(amount), 0)::float AS total
         FROM expense WHERE to_char(spent_on, 'YYYY-MM') = to_char(now(), 'YYYY-MM')`,
    )
  ).rows[0]?.total ?? 0;

  return {
    dueFlashcards: due,
    planToday: { count: plan.length, items: plan.slice(0, 6) },
    recentSources: sources.items,
    totalSources: sources.total,
    commits30d: activity.count,
    spendThisMonth: Number(spend.toFixed(2)),
    goals: { total: goals.length, active: goals.filter((g) => g.status === 'active').length },
  };
}
