import { desc, eq, ilike } from 'drizzle-orm';
import { getDb, leetcodeProfile, lcSubmission, skill, skillSignal } from '@abiros/db';
import { HttpError } from '../../lib/errors.js';

/** Pure: turn LeetCode's acSubmissionNum array into solved counts. */
export function mapSolvedCounts(
  acSubmissionNum: { difficulty: string; count: number }[] | undefined,
): { total: number; easy: number; medium: number; hard: number } {
  const get = (d: string) => acSubmissionNum?.find((x) => x.difficulty === d)?.count ?? 0;
  return { total: get('All'), easy: get('Easy'), medium: get('Medium'), hard: get('Hard') };
}

const QUERY = `query getUser($username: String!) {
  matchedUser(username: $username) {
    username
    profile { ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
  recentAcSubmissionList(username: $username, limit: 20) { title titleSlug timestamp lang }
}`;

interface LeetcodeFetch {
  username: string;
  ranking: number | null;
  counts: ReturnType<typeof mapSolvedCounts>;
  recent: { slug: string; title: string; lang?: string; submittedAt?: Date }[];
}

/** Fetch public profile + recent accepted submissions via LeetCode's unofficial GraphQL. */
export async function fetchLeetcode(username: string): Promise<LeetcodeFetch> {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', referer: 'https://leetcode.com' },
    body: JSON.stringify({ query: QUERY, variables: { username } }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`LeetCode responded ${res.status}`);
  const json = (await res.json()) as {
    data?: {
      matchedUser?: {
        profile?: { ranking?: number };
        submitStatsGlobal?: { acSubmissionNum?: { difficulty: string; count: number }[] };
      } | null;
      recentAcSubmissionList?: { title: string; titleSlug: string; timestamp: string; lang?: string }[];
    };
  };
  const mu = json.data?.matchedUser;
  if (!mu) throw HttpError.validation(`LeetCode user "${username}" not found (or the public API changed).`);
  return {
    username,
    ranking: mu.profile?.ranking ?? null,
    counts: mapSolvedCounts(mu.submitStatsGlobal?.acSubmissionNum),
    recent: (json.data?.recentAcSubmissionList ?? []).map((s) => ({
      slug: s.titleSlug,
      title: s.title,
      lang: s.lang,
      submittedAt: s.timestamp ? new Date(Number(s.timestamp) * 1000) : undefined,
    })),
  };
}

export async function syncLeetcode(username: string) {
  const data = await fetchLeetcode(username);
  const db = getDb();

  // Singleton profile.
  const [existing] = await db.select({ id: leetcodeProfile.id }).from(leetcodeProfile).limit(1);
  const values = {
    username,
    totalSolved: data.counts.total,
    easy: data.counts.easy,
    medium: data.counts.medium,
    hard: data.counts.hard,
    ranking: data.ranking ?? undefined,
    lastSynced: new Date(),
  };
  if (existing) await db.update(leetcodeProfile).set(values).where(eq(leetcodeProfile.id, existing.id));
  else await db.insert(leetcodeProfile).values(values);

  let imported = 0;
  for (const s of data.recent) {
    const r = await db
      .insert(lcSubmission)
      .values({ slug: s.slug, title: s.title, lang: s.lang, status: 'Accepted', submittedAt: s.submittedAt })
      .onConflictDoNothing()
      .returning({ id: lcSubmission.id });
    if (r.length) imported++;
  }

  // Feed a DSA skill signal (level scaled by total solved).
  const level = Math.min(100, Math.round((data.counts.total / 500) * 100));
  const [sk] = await db
    .insert(skill)
    .values({ name: 'DSA (LeetCode)', level, source: 'leetcode' })
    .onConflictDoUpdate({ target: skill.name, set: { level, updatedAt: new Date() } })
    .returning({ id: skill.id });
  if (sk) await db.insert(skillSignal).values({ skillId: sk.id, kind: 'leetcode', weight: data.counts.total, detail: `${data.counts.total} solved` });

  return { ...values, newSubmissions: imported };
}

export async function getLeetcodeProfile() {
  const [row] = await getDb().select().from(leetcodeProfile).limit(1);
  return row;
}

export async function searchSolvedProblems(query: string) {
  return getDb()
    .select({ slug: lcSubmission.slug, title: lcSubmission.title, lang: lcSubmission.lang, submittedAt: lcSubmission.submittedAt })
    .from(lcSubmission)
    .where(ilike(lcSubmission.title, `%${query}%`))
    .orderBy(desc(lcSubmission.submittedAt))
    .limit(30);
}

/** Lightweight "weak topics": the difficulty bucket with the lowest share solved. */
export async function weakTopics() {
  const p = await getLeetcodeProfile();
  if (!p) return { focus: null, counts: null, note: 'Sync LeetCode first.' };
  const buckets = [
    { name: 'easy', n: p.easy },
    { name: 'medium', n: p.medium },
    { name: 'hard', n: p.hard },
  ].sort((a, b) => a.n - b.n);
  return {
    focus: buckets[0]!.name,
    counts: { easy: p.easy, medium: p.medium, hard: p.hard, total: p.totalSolved },
    note: `Your smallest bucket is ${buckets[0]!.name} — focus there for balance.`,
  };
}
