import { desc, eq } from 'drizzle-orm';
import { getDb, resumeVersion } from '@abiros/db';
import { getLlm } from '../../lib/ai.js';
import { HttpError } from '../../lib/errors.js';
import { extractFromPdf } from '../../lib/parsers.js';
import { careerInsights, listRepos } from './repo.js';

/** Upload your own resume PDF — extract its text into a resume version to analyse/tailor. */
export async function uploadResume(file: { buffer: Buffer; originalname: string; mimetype: string }) {
  if (file.mimetype !== 'application/pdf') {
    throw HttpError.validation('Please upload a PDF resume.');
  }
  const ex = await extractFromPdf(new Uint8Array(file.buffer));
  const [row] = await getDb()
    .insert(resumeVersion)
    .values({ label: `Uploaded: ${file.originalname}`.slice(0, 60), content: ex.text })
    .returning();
  return row!;
}

/** Build a resume draft from synced GitHub activity. */
export async function generateResume() {
  const [insights, repos] = await Promise.all([careerInsights(), listRepos()]);
  if (insights.repoCount === 0) {
    throw HttpError.validation('Sync GitHub first — there is no activity to build a resume from.');
  }
  const topRepos = repos
    .slice(0, 8)
    .map((r) => `- ${r.fullName} (${r.primaryLanguage ?? 'n/a'}, ★${r.stars}): ${r.description ?? ''}`)
    .join('\n');
  const langs = insights.languages.map((l) => l.name).join(', ');

  const res = await getLlm().chat({
    system: 'You are a professional resume writer. Output clean Markdown, no preamble.',
    messages: [
      {
        role: 'user',
        content: `Write a concise developer resume in Markdown from this GitHub activity. Include a short summary, a skills section, and a projects section.\n\nLanguages: ${langs}\nRepos: ${insights.repoCount}, Commits: ${insights.commitCount}, Stars: ${insights.starCount}\nNotable projects:\n${topRepos}`,
      },
    ],
  });

  const db = getDb();
  const [row] = await db
    .insert(resumeVersion)
    .values({ label: 'Auto-generated', content: res.content })
    .returning();
  return row!;
}

/** Tailor an existing resume version to a specific job description. */
export async function tailorResume(versionId: string, jobDescription: string) {
  const db = getDb();
  const [base] = await db.select().from(resumeVersion).where(eq(resumeVersion.id, versionId)).limit(1);
  if (!base) throw HttpError.notFound('Resume version not found');

  const res = await getLlm().chat({
    system: 'You tailor resumes to job descriptions. Output clean Markdown, no preamble.',
    messages: [
      {
        role: 'user',
        content: `Rewrite this resume to target the job description below — reorder and emphasize the most relevant skills/projects, keep it truthful.\n\n# Resume\n${base.content}\n\n# Job description\n${jobDescription}`,
      },
    ],
  });

  const [row] = await db
    .insert(resumeVersion)
    .values({ label: 'Tailored', content: res.content, jobDescription })
    .returning();
  return row!;
}

export async function listResumeVersions() {
  const db = getDb();
  return db
    .select({ id: resumeVersion.id, label: resumeVersion.label, createdAt: resumeVersion.createdAt })
    .from(resumeVersion)
    .orderBy(desc(resumeVersion.createdAt));
}

export async function getResumeVersion(id: string) {
  const db = getDb();
  const [row] = await db.select().from(resumeVersion).where(eq(resumeVersion.id, id)).limit(1);
  return row;
}
