import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb, chatSession, chatMessage } from '@abiros/db';
import type { Citation } from '@abiros/shared';

export async function createSession(title = 'New chat') {
  const db = getDb();
  const [row] = await db.insert(chatSession).values({ title }).returning();
  return row!;
}

export async function listSessions() {
  const db = getDb();
  return db
    .select({ id: chatSession.id, title: chatSession.title, createdAt: chatSession.createdAt })
    .from(chatSession)
    .where(isNull(chatSession.deletedAt))
    .orderBy(desc(chatSession.createdAt));
}

export async function getSession(id: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(chatSession)
    .where(and(eq(chatSession.id, id), isNull(chatSession.deletedAt)))
    .limit(1);
  if (!session) return undefined;
  const messages = await db
    .select()
    .from(chatMessage)
    .where(eq(chatMessage.sessionId, id))
    .orderBy(asc(chatMessage.createdAt));
  return { session, messages };
}

export async function addMessage(
  sessionId: string,
  role: string,
  content: string,
  citations: Citation[] = [],
) {
  const db = getDb();
  const [row] = await db
    .insert(chatMessage)
    .values({ sessionId, role, content, citations })
    .returning();
  return row!;
}

/** Sets the session title only if it's still the default — used to name a chat from its first message. */
export async function setTitleIfDefault(id: string, title: string) {
  const db = getDb();
  await db
    .update(chatSession)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(chatSession.id, id), eq(chatSession.title, 'New chat')));
}
