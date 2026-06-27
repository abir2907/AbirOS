import { asc, desc, eq, getTableColumns } from 'drizzle-orm';
import {
  getDb,
  getPool,
  musicArtist,
  musicTrack,
  musicEvent,
  book,
  sportInterest,
  place,
  trip,
  tripPlace,
} from '@abiros/db';
import type { BookStatus, PlaceStatus } from '@abiros/shared';
import type { ParsedTrack } from './takeout.js';

// ── Music ────────────────────────────────────────────────────────────────────
export async function importTakeoutTracks(tracks: ParsedTrack[]): Promise<number> {
  const db = getDb();
  let imported = 0;
  for (const t of tracks.slice(0, 2000)) {
    if (t.externalId) {
      const [ex] = await db
        .select({ id: musicTrack.id })
        .from(musicTrack)
        .where(eq(musicTrack.externalId, t.externalId))
        .limit(1);
      if (ex) continue; // already imported
    }
    let artistId: string | undefined;
    if (t.artist) {
      const [a] = await db
        .select({ id: musicArtist.id })
        .from(musicArtist)
        .where(eq(musicArtist.name, t.artist))
        .limit(1);
      artistId =
        a?.id ??
        (await db.insert(musicArtist).values({ name: t.artist }).returning({ id: musicArtist.id }))[0]?.id;
    }
    const [tr] = await db
      .insert(musicTrack)
      .values({ title: t.title, artistId, source: 'youtube', externalId: t.externalId, url: t.url })
      .returning({ id: musicTrack.id });
    await db.insert(musicEvent).values({
      trackId: tr!.id,
      kind: 'played',
      occurredAt: t.occurredAt ? new Date(t.occurredAt) : undefined,
    });
    imported++;
  }
  return imported;
}

export async function musicSummaryData() {
  const pool = getPool();
  const topArtists = (
    await pool.query<{ name: string; n: number }>(
      `SELECT a.name, count(t.id)::int AS n FROM music_artist a
        JOIN music_track t ON t.artist_id = a.id GROUP BY a.name ORDER BY n DESC LIMIT 15`,
    )
  ).rows;
  const countRows = (
    await pool.query<{ tracks: number }>(`SELECT count(*)::int AS tracks FROM music_track`)
  ).rows;
  return { topArtists, trackCount: countRows[0]?.tracks ?? 0 };
}

// ── Books ────────────────────────────────────────────────────────────────────
export async function listBooks(status?: BookStatus) {
  const db = getDb();
  return status
    ? db.select().from(book).where(eq(book.status, status)).orderBy(desc(book.updatedAt))
    : db.select().from(book).orderBy(desc(book.updatedAt));
}
export async function addBook(values: typeof book.$inferInsert) {
  const [row] = await getDb().insert(book).values(values).returning();
  return row!;
}
export async function updateBook(id: string, patch: Partial<typeof book.$inferInsert>) {
  const [row] = await getDb()
    .update(book)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(book.id, id))
    .returning();
  return row;
}
export async function deleteBook(id: string) {
  const res = await getDb().delete(book).where(eq(book.id, id)).returning({ id: book.id });
  return res.length > 0;
}

// ── Sports ───────────────────────────────────────────────────────────────────
export async function listSports() {
  return getDb().select().from(sportInterest).orderBy(asc(sportInterest.kind), asc(sportInterest.label));
}
export async function addSport(values: typeof sportInterest.$inferInsert) {
  const [row] = await getDb().insert(sportInterest).values(values).returning();
  return row!;
}
export async function deleteSport(id: string) {
  const res = await getDb()
    .delete(sportInterest)
    .where(eq(sportInterest.id, id))
    .returning({ id: sportInterest.id });
  return res.length > 0;
}

// ── Places ───────────────────────────────────────────────────────────────────
export async function listPlaces(status?: PlaceStatus) {
  const db = getDb();
  return status
    ? db.select().from(place).where(eq(place.status, status)).orderBy(asc(place.name))
    : db.select().from(place).orderBy(asc(place.name));
}
export async function addPlace(values: typeof place.$inferInsert) {
  const [row] = await getDb().insert(place).values(values).returning();
  return row!;
}
export async function updatePlace(id: string, patch: Partial<typeof place.$inferInsert>) {
  const [row] = await getDb()
    .update(place)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(place.id, id))
    .returning();
  return row;
}
export async function deletePlace(id: string) {
  const res = await getDb().delete(place).where(eq(place.id, id)).returning({ id: place.id });
  return res.length > 0;
}

// ── Trips ────────────────────────────────────────────────────────────────────
export async function listTrips() {
  return getDb().select().from(trip).orderBy(desc(trip.startDate));
}
export async function addTrip(values: typeof trip.$inferInsert) {
  const [row] = await getDb().insert(trip).values(values).returning();
  return row!;
}
export async function linkTripPlace(tripId: string, placeId: string) {
  await getDb().insert(tripPlace).values({ tripId, placeId }).onConflictDoNothing();
  return getDb()
    .select({ ...getTableColumns(place) })
    .from(tripPlace)
    .innerJoin(place, eq(place.id, tripPlace.placeId))
    .where(eq(tripPlace.tripId, tripId));
}
