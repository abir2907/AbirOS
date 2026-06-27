import { desc, eq } from 'drizzle-orm';
import { getDb, userMemory } from '@abiros/db';

export async function listMemories() {
  return getDb().select().from(userMemory).orderBy(desc(userMemory.createdAt)).limit(200);
}

export async function addMemory(content: string, source = 'manual') {
  const [row] = await getDb().insert(userMemory).values({ content, source }).returning();
  return row!;
}

export async function deleteMemory(id: string) {
  const res = await getDb()
    .delete(userMemory)
    .where(eq(userMemory.id, id))
    .returning({ id: userMemory.id });
  return res.length > 0;
}

/** Recent facts injected into the assistant's context. */
export async function recentMemories(limit = 20) {
  return getDb()
    .select({ content: userMemory.content })
    .from(userMemory)
    .orderBy(desc(userMemory.createdAt))
    .limit(limit);
}
