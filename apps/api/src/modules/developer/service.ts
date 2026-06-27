import { logger } from '../../lib/logger.js';
import { fetchGithub } from './github.js';
import * as repo from './repo.js';

/** Sync GitHub repos + recent commits into the local Code Historian index. */
export async function syncGithub() {
  const { login, repos, commits } = await fetchGithub();
  let repoCount = 0;
  let commitCount = 0;
  for (const r of repos) {
    const id = await repo.upsertRepo(r);
    repoCount++;
    commitCount += await repo.upsertCommits(id, commits.get(r.githubId) ?? []);
  }
  logger.info({ login, repoCount, commitCount }, 'github sync complete');
  return { login, repos: repoCount, commits: commitCount };
}
