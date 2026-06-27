import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  jsonb,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_shared.js';

/** A GitHub repository (synced via Octokit). `languages` is bytes-per-language. */
export const repo = pgTable('repo', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubId: bigint('github_id', { mode: 'number' }).unique(),
  name: text('name').notNull(),
  fullName: text('full_name').notNull(),
  description: text('description'),
  url: text('url'),
  primaryLanguage: text('primary_language'),
  languages: jsonb('languages').$type<Record<string, number>>().default({}).notNull(),
  stars: integer('stars').notNull().default(0),
  forks: integer('forks').notNull().default(0),
  isPrivate: boolean('is_private').notNull().default(false),
  pushedAt: timestamp('pushed_at', { withTimezone: true }),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
  ...timestamps,
});

/** A commit authored by the user (the `tsv` column powers Code Historian search). */
export const gitCommit = pgTable(
  'git_commit',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repo.id, { onDelete: 'cascade' }),
    sha: text('sha').notNull(),
    message: text('message').notNull().default(''),
    url: text('url'),
    authoredAt: timestamp('authored_at', { withTimezone: true }),
    additions: integer('additions'),
    deletions: integer('deletions'),
    ...timestamps,
  },
  (t) => [
    unique('commit_repo_sha_uq').on(t.repoId, t.sha),
    index('commit_repo_idx').on(t.repoId),
    index('commit_authored_idx').on(t.authoredAt),
  ],
);

export type Repo = typeof repo.$inferSelect;
export type GitCommit = typeof gitCommit.$inferSelect;
