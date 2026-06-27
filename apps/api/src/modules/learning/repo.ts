import { and, asc, desc, eq, isNull, lte, sql } from 'drizzle-orm';
import {
  getDb,
  getPool,
  document,
  summary,
  flashcard,
  reviewLog,
  quiz,
  quizQuestion,
  quizAttempt,
} from '@abiros/db';

export async function getSourceText(sourceId: string): Promise<string | undefined> {
  const db = getDb();
  const [doc] = await db
    .select({ text: document.text })
    .from(document)
    .where(eq(document.sourceId, sourceId))
    .limit(1);
  return doc?.text;
}

// ── Summaries ────────────────────────────────────────────────────────────────
export async function getSummary(sourceId: string) {
  const db = getDb();
  const [row] = await db.select().from(summary).where(eq(summary.sourceId, sourceId)).limit(1);
  return row;
}

export async function upsertSummary(
  sourceId: string,
  text: string,
  keyPoints: string[],
  model: string,
) {
  const db = getDb();
  const [row] = await db
    .insert(summary)
    .values({ sourceId, text, keyPoints, model })
    .onConflictDoUpdate({
      target: summary.sourceId,
      set: { text, keyPoints, model, updatedAt: new Date() },
    })
    .returning();
  return row!;
}

// ── Flashcards ───────────────────────────────────────────────────────────────
export async function insertFlashcards(sourceId: string, cards: { front: string; back: string }[]) {
  if (cards.length === 0) return [];
  const db = getDb();
  return db
    .insert(flashcard)
    .values(cards.map((c) => ({ sourceId, front: c.front, back: c.back })))
    .returning();
}

export async function listFlashcards(limit = 100) {
  const db = getDb();
  return db
    .select()
    .from(flashcard)
    .where(isNull(flashcard.deletedAt))
    .orderBy(asc(flashcard.dueAt))
    .limit(limit);
}

export async function dueFlashcards(limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(flashcard)
    .where(and(isNull(flashcard.deletedAt), lte(flashcard.dueAt, new Date())))
    .orderBy(asc(flashcard.dueAt))
    .limit(limit);
}

export async function countDue(): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(flashcard)
    .where(and(isNull(flashcard.deletedAt), lte(flashcard.dueAt, new Date())));
  return rows[0]?.n ?? 0;
}

export async function getFlashcard(id: string) {
  const db = getDb();
  const [row] = await db.select().from(flashcard).where(eq(flashcard.id, id)).limit(1);
  return row;
}

export async function applySchedule(
  id: string,
  s: { ease: number; interval: number; reps: number; lapses: number; dueAt: Date },
  log: { rating: string; quality: number; prevInterval: number },
) {
  const db = getDb();
  const [row] = await db
    .update(flashcard)
    .set({ ...s, lastReviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(flashcard.id, id))
    .returning();
  await db.insert(reviewLog).values({
    flashcardId: id,
    rating: log.rating,
    quality: log.quality,
    prevInterval: log.prevInterval,
    newInterval: s.interval,
    ease: s.ease,
  });
  return row!;
}

// ── Quizzes ──────────────────────────────────────────────────────────────────
export async function createQuiz(
  sourceId: string,
  title: string,
  questions: { question: string; options: string[]; answerIndex: number; explanation?: string }[],
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [q] = await tx.insert(quiz).values({ sourceId, title }).returning();
    if (questions.length > 0) {
      await tx.insert(quizQuestion).values(
        questions.map((qq, i) => ({
          quizId: q!.id,
          ord: i,
          question: qq.question,
          options: qq.options,
          answerIndex: qq.answerIndex,
          explanation: qq.explanation,
        })),
      );
    }
    return q!;
  });
}

export async function listQuizzes() {
  const db = getDb();
  return db.select().from(quiz).orderBy(desc(quiz.createdAt)).limit(100);
}

/** Quiz for taking — questions WITHOUT the answer index (so it can't be peeked). */
export async function getQuizForTaking(id: string) {
  const db = getDb();
  const [q] = await db.select().from(quiz).where(eq(quiz.id, id)).limit(1);
  if (!q) return undefined;
  const questions = await db
    .select({ id: quizQuestion.id, ord: quizQuestion.ord, question: quizQuestion.question, options: quizQuestion.options })
    .from(quizQuestion)
    .where(eq(quizQuestion.quizId, id))
    .orderBy(asc(quizQuestion.ord));
  return { quiz: q, questions };
}

export async function gradeAttempt(id: string, answers: number[]) {
  const db = getDb();
  const questions = await db
    .select()
    .from(quizQuestion)
    .where(eq(quizQuestion.quizId, id))
    .orderBy(asc(quizQuestion.ord));
  if (questions.length === 0) return undefined;

  let score = 0;
  const results = questions.map((q, i) => {
    const chosen = answers[i] ?? -1;
    const correct = chosen === q.answerIndex;
    if (correct) score++;
    return { correct, chosen, answerIndex: q.answerIndex, explanation: q.explanation };
  });
  await db.insert(quizAttempt).values({ quizId: id, score, total: questions.length, answers });
  return { score, total: questions.length, results };
}

// ── Gap detection ────────────────────────────────────────────────────────────
export interface Gap {
  sourceId: string;
  title: string;
  cards: number;
  avgEase: number;
  lapses: number;
  overdue: number;
}

export async function knowledgeGaps(): Promise<Gap[]> {
  const { rows } = await getPool().query<{
    source_id: string;
    title: string;
    cards: number;
    avg_ease: number;
    lapses: number;
    overdue: number;
  }>(
    `SELECT s.id AS source_id, s.title,
            count(f.id)::int AS cards,
            avg(f.ease)::float AS avg_ease,
            sum(f.lapses)::int AS lapses,
            count(*) FILTER (WHERE f.due_at < now())::int AS overdue
       FROM flashcard f
       JOIN source s ON s.id = f.source_id
      WHERE f.deleted_at IS NULL
      GROUP BY s.id, s.title
      ORDER BY (sum(f.lapses) + count(*) FILTER (WHERE f.due_at < now())) DESC,
               avg(f.ease) ASC
      LIMIT 20`,
  );
  return rows.map((r) => ({
    sourceId: r.source_id,
    title: r.title,
    cards: r.cards,
    avgEase: Number(r.avg_ease?.toFixed?.(2) ?? r.avg_ease),
    lapses: r.lapses,
    overdue: r.overdue,
  }));
}
