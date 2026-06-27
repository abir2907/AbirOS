import { asc, desc, eq } from 'drizzle-orm';
import { getDb, studyItem } from '@abiros/db';
import type { StudyStatus } from '@abiros/shared';
import { getLlm } from '../../lib/ai.js';
import { listGoals } from '../planner/repo.js';
import { countDue, knowledgeGaps } from './repo.js';

export async function listStudyItems(status?: StudyStatus) {
  const db = getDb();
  return status
    ? db
        .select()
        .from(studyItem)
        .where(eq(studyItem.status, status))
        .orderBy(desc(studyItem.priority), asc(studyItem.topic))
    : db.select().from(studyItem).orderBy(desc(studyItem.priority), asc(studyItem.topic));
}

export async function addStudyItem(values: typeof studyItem.$inferInsert) {
  const [row] = await getDb().insert(studyItem).values(values).returning();
  return row!;
}

export async function updateStudyItem(id: string, patch: Partial<typeof studyItem.$inferInsert>) {
  const [row] = await getDb()
    .update(studyItem)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(studyItem.id, id))
    .returning();
  return row;
}

export async function deleteStudyItem(id: string) {
  const res = await getDb().delete(studyItem).where(eq(studyItem.id, id)).returning({ id: studyItem.id });
  return res.length > 0;
}

/** Recommend what to study next from the backlog, weak topics, due load, and goals. */
export async function suggestNextStudy() {
  const [items, gaps, due, goals] = await Promise.all([
    listStudyItems('want_to_study'),
    knowledgeGaps(),
    countDue(),
    listGoals(),
  ]);
  const res = await getLlm().chat({
    system: 'You are a study coach. Reply with one short, specific recommendation. Markdown ok.',
    messages: [
      {
        role: 'user',
        content: `Pick what I should study next and why.
Want-to-study backlog: ${items.map((i) => i.topic).join(', ') || 'none'}
Weak topics I'm forgetting: ${gaps.slice(0, 5).map((g) => g.title).join(', ') || 'none'}
Flashcards due right now: ${due}
Active goals: ${goals.filter((g) => g.status === 'active').map((g) => g.title).join(', ') || 'none'}
Give one clear next action.`,
      },
    ],
  });
  return { suggestion: res.content, dueCount: due, backlog: items.length };
}
