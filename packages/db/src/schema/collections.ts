import { pgEnum, pgTable, uuid, text, integer, doublePrecision, jsonb, date, timestamp, index, primaryKey } from 'drizzle-orm/pg-core';
import { BOOK_STATUSES, PLACE_STATUSES, SPORT_KINDS } from '@abiros/shared';
import { timestamps } from './_shared.js';
import { source } from './knowledge.js';
import { journalEntry } from './life.js';

export const musicSourceEnum = pgEnum('music_source', ['youtube', 'manual']);
export const musicEventKindEnum = pgEnum('music_event_kind', ['liked', 'played']);
export const bookStatusEnum = pgEnum('book_status', [...BOOK_STATUSES] as [string, ...string[]]);
export const placeStatusEnum = pgEnum('place_status', [...PLACE_STATUSES] as [string, ...string[]]);
export const sportKindEnum = pgEnum('sport_kind', [...SPORT_KINDS] as [string, ...string[]]);

export const musicArtist = pgTable('music_artist', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const musicTrack = pgTable('music_track', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  artistId: uuid('artist_id').references(() => musicArtist.id, { onDelete: 'set null' }),
  album: text('album'),
  source: musicSourceEnum('source').notNull().default('manual'),
  externalId: text('external_id'),
  url: text('url'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const musicEvent = pgTable(
  'music_event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trackId: uuid('track_id').notNull().references(() => musicTrack.id, { onDelete: 'cascade' }),
    kind: musicEventKindEnum('kind').notNull().default('played'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('music_event_track_idx').on(t.trackId)],
);

export const book = pgTable(
  'book',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    author: text('author'),
    status: bookStatusEnum('status').notNull().default('want_to_read'),
    rating: integer('rating'),
    startedOn: date('started_on'),
    finishedOn: date('finished_on'),
    notes: text('notes'),
    highlights: jsonb('highlights').$type<string[]>().default([]).notNull(),
    sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('book_status_idx').on(t.status)],
);

export const sportInterest = pgTable('sport_interest', {
  id: uuid('id').primaryKey().defaultRandom(),
  kind: sportKindEnum('kind').notNull().default('sport'),
  label: text('label').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const place = pgTable('place', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  country: text('country'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  status: placeStatusEnum('status').notNull().default('want_to_visit'),
  notes: text('notes'),
  sourceId: uuid('source_id').references(() => source.id, { onDelete: 'set null' }),
  ...timestamps,
});

export const trip = pgTable('trip', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  startDate: date('start_date'),
  endDate: date('end_date'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntry.id, { onDelete: 'set null' }),
  summary: text('summary'),
  ...timestamps,
});

export const tripPlace = pgTable(
  'trip_place',
  {
    tripId: uuid('trip_id').notNull().references(() => trip.id, { onDelete: 'cascade' }),
    placeId: uuid('place_id').notNull().references(() => place.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.tripId, t.placeId] })],
);

export type Book = typeof book.$inferSelect;
export type Place = typeof place.$inferSelect;
export type Trip = typeof trip.$inferSelect;
export type MusicTrack = typeof musicTrack.$inferSelect;
