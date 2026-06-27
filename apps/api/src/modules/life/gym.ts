import { asc, desc, eq, gte } from 'drizzle-orm';
import { getDb, getPool, workout, exercise, workoutSet } from '@abiros/db';

interface SetInput {
  exerciseName?: string;
  reps?: number;
  weight?: number;
  rpe?: number;
}

export async function addWorkout(values: {
  performedAt?: Date;
  type?: string;
  durationMin?: number;
  notes?: string;
  sets?: SetInput[];
}) {
  const db = getDb();
  const [w] = await db
    .insert(workout)
    .values({
      performedAt: values.performedAt ?? new Date(),
      type: values.type ?? 'strength',
      durationMin: values.durationMin,
      notes: values.notes,
    })
    .returning();
  let ord = 0;
  for (const s of values.sets ?? []) {
    let exerciseId: string | undefined;
    if (s.exerciseName) {
      const name = s.exerciseName.trim();
      const [ex] = await db.select({ id: exercise.id }).from(exercise).where(eq(exercise.name, name)).limit(1);
      exerciseId = ex?.id ?? (await db.insert(exercise).values({ name }).returning({ id: exercise.id }))[0]?.id;
    }
    await db.insert(workoutSet).values({ workoutId: w!.id, exerciseId, reps: s.reps, weight: s.weight, rpe: s.rpe, ord: ord++ });
  }
  return w!;
}

export async function listWorkouts(days = 30) {
  const db = getDb();
  return db
    .select()
    .from(workout)
    .where(gte(workout.performedAt, new Date(Date.now() - days * 86_400_000)))
    .orderBy(desc(workout.performedAt));
}

export async function workoutSets(workoutId: string) {
  const db = getDb();
  return db
    .select({ id: workoutSet.id, reps: workoutSet.reps, weight: workoutSet.weight, rpe: workoutSet.rpe, exercise: exercise.name })
    .from(workoutSet)
    .leftJoin(exercise, eq(exercise.id, workoutSet.exerciseId))
    .where(eq(workoutSet.workoutId, workoutId))
    .orderBy(asc(workoutSet.ord));
}

export async function deleteWorkout(id: string) {
  const res = await getDb().delete(workout).where(eq(workout.id, id)).returning({ id: workout.id });
  return res.length > 0;
}

/** Per-day workout counts (last 60 days) + total + current streak. */
export async function workoutConsistency() {
  const { rows } = await getPool().query<{ day: string; n: number }>(
    `SELECT to_char(date(performed_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
       FROM workout WHERE performed_at >= now() - interval '60 days' GROUP BY 1 ORDER BY 1`,
  );
  const total = rows.reduce((a, r) => a + r.n, 0);
  // Current streak of consecutive days ending today.
  const set = new Set(rows.map((r) => r.day));
  let streak = 0;
  for (let i = 0; ; i++) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    if (set.has(d)) streak++;
    else if (i > 0) break;
    else break;
  }
  return { byDay: rows, total, streak };
}
