import { getDb, getPool, tag, sourceTag } from '@abiros/db';

/** Upsert tag names and link them to a source (idempotent). */
export async function upsertTagsAndLink(sourceId: string, names: string[]): Promise<void> {
  const db = getDb();
  const norm = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))].slice(0, 8);
  for (const name of norm) {
    const [row] = await db
      .insert(tag)
      .values({ name })
      .onConflictDoUpdate({ target: tag.name, set: { name } })
      .returning({ id: tag.id });
    if (row) await db.insert(sourceTag).values({ sourceId, tagId: row.id }).onConflictDoNothing();
  }
}

export async function getTagsForSource(sourceId: string): Promise<string[]> {
  const { rows } = await getPool().query<{ name: string }>(
    `SELECT t.name FROM tag t
       JOIN source_tag st ON st.tag_id = t.id
      WHERE st.source_id = $1
      ORDER BY t.name`,
    [sourceId],
  );
  return rows.map((r) => r.name);
}

export async function listTagsWithCounts(): Promise<{ name: string; count: number }[]> {
  const { rows } = await getPool().query<{ name: string; count: number }>(
    `SELECT t.name, count(s.id)::int AS count
       FROM tag t
       JOIN source_tag st ON st.tag_id = t.id
       JOIN source s ON s.id = st.source_id AND s.deleted_at IS NULL
      GROUP BY t.name
      ORDER BY count DESC, t.name
      LIMIT 200`,
  );
  return rows;
}
