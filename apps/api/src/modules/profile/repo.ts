import { asc, desc, eq } from 'drizzle-orm';
import { getDb, profile, interest, accomplishment } from '@abiros/db';
import type { InterestCategory } from '@abiros/shared';

// ── Profile (singleton) ──────────────────────────────────────────────────────
export async function getProfile() {
  const [row] = await getDb().select().from(profile).limit(1);
  return row;
}

export async function upsertProfile(values: Partial<typeof profile.$inferInsert>) {
  const db = getDb();
  const existing = await getProfile();
  if (existing) {
    const [row] = await db
      .update(profile)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(profile.id, existing.id))
      .returning();
    return row!;
  }
  const [row] = await db.insert(profile).values(values).returning();
  return row!;
}

// ── Interests ────────────────────────────────────────────────────────────────
export async function listInterests(category?: InterestCategory) {
  const db = getDb();
  return category
    ? db.select().from(interest).where(eq(interest.category, category)).orderBy(asc(interest.label))
    : db.select().from(interest).orderBy(asc(interest.category), asc(interest.label));
}

export async function addInterest(values: typeof interest.$inferInsert) {
  const [row] = await getDb().insert(interest).values(values).returning();
  return row!;
}

export async function deleteInterest(id: string) {
  const res = await getDb().delete(interest).where(eq(interest.id, id)).returning({ id: interest.id });
  return res.length > 0;
}

// ── Accomplishments ──────────────────────────────────────────────────────────
export async function listAccomplishments(limit = 100) {
  return getDb().select().from(accomplishment).orderBy(desc(accomplishment.createdAt)).limit(limit);
}

export async function addAccomplishment(values: typeof accomplishment.$inferInsert) {
  const [row] = await getDb().insert(accomplishment).values(values).returning();
  return row!;
}

export async function linkAccomplishmentSource(id: string, sourceId: string) {
  await getDb().update(accomplishment).set({ sourceId }).where(eq(accomplishment.id, id));
}

export async function deleteAccomplishment(id: string) {
  const res = await getDb()
    .delete(accomplishment)
    .where(eq(accomplishment.id, id))
    .returning({ id: accomplishment.id });
  return res.length > 0;
}
