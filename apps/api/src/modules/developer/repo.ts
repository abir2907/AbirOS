import { desc } from 'drizzle-orm';
import { getDb, getPool, repo, gitCommit } from '@abiros/db';
import type { FetchedCommit, FetchedRepo } from './github.js';

export async function upsertRepo(r: FetchedRepo): Promise<string> {
  const db = getDb();
  const [row] = await db
    .insert(repo)
    .values({
      githubId: r.githubId,
      name: r.name,
      fullName: r.fullName,
      description: r.description,
      url: r.url,
      primaryLanguage: r.primaryLanguage,
      languages: r.languages,
      stars: r.stars,
      forks: r.forks,
      isPrivate: r.isPrivate,
      pushedAt: r.pushedAt,
      syncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: repo.githubId,
      set: {
        name: r.name,
        fullName: r.fullName,
        description: r.description,
        primaryLanguage: r.primaryLanguage,
        languages: r.languages,
        stars: r.stars,
        forks: r.forks,
        pushedAt: r.pushedAt,
        syncedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    .returning({ id: repo.id });
  return row!.id;
}

export async function upsertCommits(repoId: string, commits: FetchedCommit[]): Promise<number> {
  if (commits.length === 0) return 0;
  const db = getDb();
  let inserted = 0;
  for (const c of commits) {
    const res = await db
      .insert(gitCommit)
      .values({
        repoId,
        sha: c.sha,
        message: c.message,
        url: c.url,
        authoredAt: c.authoredAt,
      })
      .onConflictDoNothing()
      .returning({ id: gitCommit.id });
    if (res.length > 0) inserted++;
  }
  return inserted;
}

export async function listRepos() {
  const db = getDb();
  return db.select().from(repo).orderBy(desc(repo.pushedAt));
}

export interface CodeHit {
  kind: 'commit' | 'repo';
  title: string;
  detail: string;
  url: string | null;
  date: string | null;
}

/** Code Historian: full-text search over commit messages + repo metadata. */
export async function searchCode(query: string, k = 20): Promise<CodeHit[]> {
  const pool = getPool();
  const commits = await pool.query<{
    message: string;
    full_name: string;
    url: string | null;
    authored_at: Date | null;
  }>(
    `SELECT gc.message, r.full_name, gc.url, gc.authored_at
       FROM git_commit gc
       JOIN repo r ON r.id = gc.repo_id
      WHERE gc.tsv @@ websearch_to_tsquery('english', $1)
      ORDER BY ts_rank(gc.tsv, websearch_to_tsquery('english', $1)) DESC
      LIMIT $2`,
    [query, k],
  );
  const repos = await pool.query<{
    full_name: string;
    description: string | null;
    primary_language: string | null;
    url: string | null;
  }>(
    `SELECT full_name, description, primary_language, url
       FROM repo
      WHERE tsv @@ websearch_to_tsquery('english', $1)
      ORDER BY ts_rank(tsv, websearch_to_tsquery('english', $1)) DESC
      LIMIT $2`,
    [query, Math.ceil(k / 2)],
  );

  return [
    ...repos.rows.map(
      (r): CodeHit => ({
        kind: 'repo',
        title: r.full_name,
        detail: [r.primary_language, r.description].filter(Boolean).join(' · '),
        url: r.url,
        date: null,
      }),
    ),
    ...commits.rows.map(
      (c): CodeHit => ({
        kind: 'commit',
        title: c.message.split('\n')[0]!.slice(0, 120),
        detail: c.full_name,
        url: c.url,
        date: c.authored_at ? c.authored_at.toISOString() : null,
      }),
    ),
  ];
}

export interface CareerInsights {
  repoCount: number;
  commitCount: number;
  starCount: number;
  languages: { name: string; bytes: number; share: number }[];
  commitsByMonth: { month: string; count: number }[];
}

/** Basic Career Analyzer: language mix (by bytes) + activity over time. */
export async function careerInsights(): Promise<CareerInsights> {
  const pool = getPool();
  const repos = await pool.query<{ languages: Record<string, number>; stars: number }>(
    `SELECT languages, stars FROM repo`,
  );
  const commitRows = (
    await pool.query<{ count: number }>(`SELECT count(*)::int AS count FROM git_commit`)
  ).rows;
  const commitCount = commitRows[0]?.count ?? 0;

  const byLang = new Map<string, number>();
  let stars = 0;
  for (const r of repos.rows) {
    stars += r.stars ?? 0;
    for (const [lang, bytes] of Object.entries(r.languages ?? {})) {
      byLang.set(lang, (byLang.get(lang) ?? 0) + (bytes as number));
    }
  }
  const totalBytes = [...byLang.values()].reduce((a, b) => a + b, 0) || 1;
  const languages = [...byLang.entries()]
    .map(([name, bytes]) => ({ name, bytes, share: bytes / totalBytes }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 12);

  const months = await pool.query<{ month: string; count: number }>(
    `SELECT to_char(date_trunc('month', authored_at), 'YYYY-MM') AS month, count(*)::int AS count
       FROM git_commit
      WHERE authored_at IS NOT NULL
      GROUP BY 1
      ORDER BY 1`,
  );

  return {
    repoCount: repos.rows.length,
    commitCount,
    starCount: stars,
    languages,
    commitsByMonth: months.rows,
  };
}

export interface TimeMachine {
  cumulative: { month: string; total: number }[];
  milestones: { date: string; title: string; detail: string | null }[];
}

/** Developer Time Machine: cumulative commit growth + repo milestones over time. */
export async function timeMachine(): Promise<TimeMachine> {
  const pool = getPool();
  const months = await pool.query<{ month: string; n: number }>(
    `SELECT to_char(date_trunc('month', authored_at), 'YYYY-MM') AS month, count(*)::int AS n
       FROM git_commit WHERE authored_at IS NOT NULL GROUP BY 1 ORDER BY 1`,
  );
  let running = 0;
  const cumulative = months.rows.map((r) => ({ month: r.month, total: (running += r.n) }));

  const milestones = (
    await pool.query<{ full_name: string; primary_language: string | null; pushed_at: Date | null }>(
      `SELECT full_name, primary_language, pushed_at FROM repo WHERE pushed_at IS NOT NULL
        ORDER BY pushed_at ASC LIMIT 40`,
    )
  ).rows.map((r) => ({
    date: r.pushed_at ? r.pushed_at.toISOString() : '',
    title: r.full_name,
    detail: r.primary_language,
  }));

  return { cumulative, milestones };
}

/** For the agent tool get_github_activity — commit count + recent commits in a window. */
export async function recentActivity(sinceDays = 30) {
  const pool = getPool();
  const { rows } = await pool.query<{
    message: string;
    full_name: string;
    url: string | null;
    authored_at: Date | null;
  }>(
    `SELECT gc.message, r.full_name, gc.url, gc.authored_at
       FROM git_commit gc
       JOIN repo r ON r.id = gc.repo_id
      WHERE gc.authored_at >= now() - ($1 || ' days')::interval
      ORDER BY gc.authored_at DESC
      LIMIT 100`,
    [String(sinceDays)],
  );
  return {
    sinceDays,
    count: rows.length,
    commits: rows.map((r) => ({
      message: r.message.split('\n')[0]!.slice(0, 120),
      repo: r.full_name,
      url: r.url,
      date: r.authored_at ? r.authored_at.toISOString() : null,
    })),
  };
}
