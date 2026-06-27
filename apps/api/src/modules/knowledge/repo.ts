import { eq } from 'drizzle-orm';
import { getDb, getPool, document, entity, entityMention, relation } from '@abiros/db';

export async function getSourceText(sourceId: string): Promise<string | undefined> {
  const db = getDb();
  const [doc] = await db
    .select({ text: document.text })
    .from(document)
    .where(eq(document.sourceId, sourceId))
    .limit(1);
  return doc?.text;
}

/** Upsert an entity by normalized name (single-user → no race concern). */
async function upsertEntity(name: string, type: string): Promise<string> {
  const db = getDb();
  const normalizedName = name.trim().toLowerCase();
  const [existing] = await db
    .select({ id: entity.id })
    .from(entity)
    .where(eq(entity.normalizedName, normalizedName))
    .limit(1);
  if (existing) return existing.id;
  const [row] = await db
    .insert(entity)
    .values({ name: name.trim(), normalizedName, type })
    .returning({ id: entity.id });
  return row!.id;
}

/** Persist an extracted graph for one source; returns counts. */
export async function saveGraph(
  sourceId: string,
  data: {
    entities: { name: string; type: string }[];
    relations: { from: string; to: string; type: string }[];
  },
) {
  const ids = new Map<string, string>();
  for (const e of data.entities) {
    const id = await upsertEntity(e.name, e.type);
    ids.set(e.name.trim().toLowerCase(), id);
    const db = getDb();
    await db.insert(entityMention).values({ entityId: id, sourceId });
  }
  const db = getDb();
  let edges = 0;
  for (const r of data.relations) {
    const fromId = ids.get(r.from.trim().toLowerCase()) ?? (await upsertEntity(r.from, 'concept'));
    const toId = ids.get(r.to.trim().toLowerCase()) ?? (await upsertEntity(r.to, 'concept'));
    if (fromId === toId) continue;
    await db.insert(relation).values({ fromEntityId: fromId, toEntityId: toId, type: r.type });
    edges++;
  }
  return { entities: data.entities.length, relations: edges };
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  mentions: number;
}
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

/** Sources that mention a given entity — for clicking a node in the knowledge map. */
export async function getEntitySources(entityId: string) {
  const { rows } = await getPool().query<{ id: string; title: string; type: string }>(
    `SELECT DISTINCT s.id, s.title, s.type::text AS type
       FROM entity_mention em
       JOIN source s ON s.id = em.source_id
      WHERE em.entity_id = $1 AND s.deleted_at IS NULL
      LIMIT 50`,
    [entityId],
  );
  return rows;
}

export async function getGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const pool = getPool();
  const nodes = await pool.query<{ id: string; name: string; type: string; mentions: number }>(
    `SELECT e.id, e.name, e.type, count(em.id)::int AS mentions
       FROM entity e
       LEFT JOIN entity_mention em ON em.entity_id = e.id
      GROUP BY e.id
      ORDER BY mentions DESC
      LIMIT 200`,
  );
  const edges = await pool.query<{ source: string; target: string; type: string; weight: number }>(
    `SELECT from_entity_id AS source, to_entity_id AS target, type, count(*)::int AS weight
       FROM relation
      GROUP BY from_entity_id, to_entity_id, type
      LIMIT 500`,
  );
  return { nodes: nodes.rows, edges: edges.rows };
}
