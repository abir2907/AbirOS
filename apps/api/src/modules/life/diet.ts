import { and, desc, gte, lte, eq } from 'drizzle-orm';
import { getDb, getPool, mealLog } from '@abiros/db';

export async function listMeals(from?: Date, to?: Date) {
  const db = getDb();
  const f = from ?? new Date(Date.now() - 14 * 86_400_000);
  const t = to ?? new Date(Date.now() + 86_400_000);
  return db
    .select()
    .from(mealLog)
    .where(and(gte(mealLog.eatenAt, f), lte(mealLog.eatenAt, t)))
    .orderBy(desc(mealLog.eatenAt));
}

export async function addMeal(values: typeof mealLog.$inferInsert) {
  const [row] = await getDb().insert(mealLog).values(values).returning();
  return row!;
}

export async function deleteMeal(id: string) {
  const res = await getDb().delete(mealLog).where(eq(mealLog.id, id)).returning({ id: mealLog.id });
  return res.length > 0;
}

/** Daily totals for the last `days` days (neutral logger — numbers only). */
export async function dietSummary(days = 7) {
  const { rows } = await getPool().query<{
    day: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    meals: number;
  }>(
    `SELECT to_char(date(eaten_at), 'YYYY-MM-DD') AS day,
            coalesce(sum(calories), 0)::float AS calories,
            coalesce(sum(protein_g), 0)::float AS protein,
            coalesce(sum(carbs_g), 0)::float AS carbs,
            coalesce(sum(fat_g), 0)::float AS fat,
            count(*)::int AS meals
       FROM meal_log
      WHERE eaten_at >= now() - ($1 || ' days')::interval
      GROUP BY 1 ORDER BY 1`,
    [String(days)],
  );
  return rows;
}
