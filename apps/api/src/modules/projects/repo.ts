import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb, project, source, type NewProject } from '@abiros/db';

export async function listProjects() {
  const db = getDb();
  return db
    .select()
    .from(project)
    .where(isNull(project.deletedAt))
    .orderBy(desc(project.updatedAt));
}

export async function createProject(values: NewProject) {
  const db = getDb();
  const [row] = await db.insert(project).values(values).returning();
  return row!;
}

export async function getProject(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(project)
    .where(and(eq(project.id, id), isNull(project.deletedAt)))
    .limit(1);
  if (!row) return undefined;
  const sources = await db
    .select({ id: source.id, title: source.title, type: source.type, status: source.status })
    .from(source)
    .where(and(eq(source.projectId, id), isNull(source.deletedAt)))
    .orderBy(desc(source.createdAt));
  return { ...row, sources };
}

export async function updateProject(id: string, patch: Partial<NewProject>) {
  const db = getDb();
  const [row] = await db
    .update(project)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(project.id, id), isNull(project.deletedAt)))
    .returning();
  return row;
}

export async function softDeleteProject(id: string) {
  const db = getDb();
  const res = await db
    .update(project)
    .set({ deletedAt: new Date() })
    .where(and(eq(project.id, id), isNull(project.deletedAt)))
    .returning({ id: project.id });
  return res.length > 0;
}

/** Attach or detach a source to/from a project. */
export async function setSourceProject(sourceId: string, projectId: string | null) {
  const db = getDb();
  const res = await db
    .update(source)
    .set({ projectId, updatedAt: new Date() })
    .where(eq(source.id, sourceId))
    .returning({ id: source.id });
  return res.length > 0;
}
