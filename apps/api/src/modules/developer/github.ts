import { Octokit } from '@octokit/rest';
import { env } from '../../env.js';
import { HttpError } from '../../lib/errors.js';

export function getOctokit(): Octokit {
  if (!env.GITHUB_TOKEN) {
    throw HttpError.notImplemented(
      'GitHub is not connected. Add a personal access token as GITHUB_TOKEN in .env.',
    );
  }
  return new Octokit({ auth: env.GITHUB_TOKEN });
}

export interface FetchedRepo {
  githubId: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  url: string;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  stars: number;
  forks: number;
  isPrivate: boolean;
  pushedAt: Date | null;
}

export interface FetchedCommit {
  sha: string;
  message: string;
  url: string;
  authoredAt: Date | null;
}

const MAX_REPOS = 50;
const MAX_COMMITS_PER_REPO = 100;

/**
 * Pulls the authenticated user's repos (with languages) and their recent
 * commits. Bounded (50 repos, 100 commits each) to respect rate limits and the
 * Neon storage budget.
 */
export async function fetchGithub(): Promise<{
  login: string;
  repos: FetchedRepo[];
  commits: Map<number, FetchedCommit[]>;
}> {
  const octokit = getOctokit();
  const { data: me } = await octokit.rest.users.getAuthenticated();

  const all = await octokit.paginate(octokit.rest.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: 'pushed',
    affiliation: 'owner',
  });
  const top = all.slice(0, MAX_REPOS);

  const repos: FetchedRepo[] = [];
  const commits = new Map<number, FetchedCommit[]>();

  for (const r of top) {
    let languages: Record<string, number> = {};
    try {
      languages = (await octokit.rest.repos.listLanguages({ owner: r.owner.login, repo: r.name }))
        .data as Record<string, number>;
    } catch {
      /* repo may be empty */
    }

    repos.push({
      githubId: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner.login,
      description: r.description ?? null,
      url: r.html_url,
      primaryLanguage: r.language ?? null,
      languages,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      isPrivate: Boolean(r.private),
      pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
    });

    try {
      const list = await octokit.rest.repos.listCommits({
        owner: r.owner.login,
        repo: r.name,
        author: me.login,
        per_page: MAX_COMMITS_PER_REPO,
      });
      commits.set(
        r.id,
        list.data.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          url: c.html_url,
          authoredAt: c.commit.author?.date ? new Date(c.commit.author.date) : null,
        })),
      );
    } catch {
      commits.set(r.id, []);
    }
  }

  return { login: me.login, repos, commits };
}
