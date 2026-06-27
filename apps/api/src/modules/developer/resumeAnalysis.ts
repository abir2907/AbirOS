import { desc } from 'drizzle-orm';
import { getDb, resumeVersion, resumeAnalysis } from '@abiros/db';
import { getLlm } from '../../lib/ai.js';
import { HttpError } from '../../lib/errors.js';
import { careerInsights } from './repo.js';
import { getLeetcodeProfile } from './leetcode.js';
import { listAccomplishments } from '../profile/repo.js';

/** Analyze the latest resume version against the user's REAL AbirOS data (+ optional JD). */
export async function analyzeResume(targetJd?: string) {
  const db = getDb();
  const [latest] = await db.select().from(resumeVersion).orderBy(desc(resumeVersion.createdAt)).limit(1);
  if (!latest) throw HttpError.validation('Generate a resume first (Developer → Resume).');

  const [insights, lc, accomplishments] = await Promise.all([
    careerInsights(),
    getLeetcodeProfile(),
    listAccomplishments(20),
  ]);

  const res = await getLlm().chat({
    system:
      "You are a resume reviewer. Ground every point in the candidate's REAL data below; be specific and honest. Reply with JSON only.",
    json: true,
    messages: [
      {
        role: 'user',
        content: `Review my resume. JSON: {"overall": 0, "strengths": ["..."], "gaps": ["..."], "suggestedBullets": ["..."], "alignment": "..."}.

Resume:
${latest.content.slice(0, 4000)}

My real data — Languages: ${insights.languages.map((l) => l.name).join(', ') || 'n/a'}; Repos: ${insights.repoCount}; Commits: ${insights.commitCount}; LeetCode solved: ${lc?.totalSolved ?? 0}; Accomplishments: ${accomplishments.map((a) => a.title).join('; ') || 'n/a'}.${targetJd ? `\n\nTarget job description:\n${targetJd.slice(0, 2000)}` : ''}`,
      },
    ],
  });
  const result = JSON.parse(res.content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
  await db.insert(resumeAnalysis).values({ resumeVersionId: latest.id, targetJd, result });
  return { result };
}
