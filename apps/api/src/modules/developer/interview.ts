import { z } from 'zod';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { getDb, interviewSession, interviewTurn } from '@abiros/db';
import { getLlm } from '../../lib/ai.js';
import { HttpError } from '../../lib/errors.js';
import { analyzeDelivery } from './interviewAnalyze.js';

function parseJson(content: string): unknown {
  return JSON.parse(content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
}

const firstQSchema = z.object({ question: z.string().min(1) });
const scoreSchema = z.object({
  relevance: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  feedback: z.string().default(''),
  nextQuestion: z.string().default(''),
});

export async function startInterview(topic: string) {
  const llm = getLlm();
  const res = await llm.chat({
    system: 'You are a friendly but rigorous technical interviewer. Reply with JSON only.',
    json: true,
    messages: [
      {
        role: 'user',
        content: `Ask one focused opening interview question about "${topic}". JSON: {"question": "..."}`,
      },
    ],
  });
  const { question } = firstQSchema.parse(parseJson(res.content));

  const db = getDb();
  const [session] = await db.insert(interviewSession).values({ topic }).returning();
  await db.insert(interviewTurn).values({ sessionId: session!.id, ord: 0, question });
  return { sessionId: session!.id, topic, question };
}

export async function answerTurn(sessionId: string, answer: string) {
  const db = getDb();
  const [turn] = await db
    .select()
    .from(interviewTurn)
    .where(and(eq(interviewTurn.sessionId, sessionId), isNull(interviewTurn.answer)))
    .orderBy(desc(interviewTurn.ord))
    .limit(1);
  if (!turn) throw HttpError.notFound('No open question for this interview');

  const delivery = analyzeDelivery(answer);

  const res = await getLlm().chat({
    system: 'You are an interview coach scoring an answer. Reply with JSON only.',
    json: true,
    messages: [
      {
        role: 'user',
        content: `Question: ${turn.question}\nCandidate answer: ${answer}\n\nScore relevance (0-100) and confidence (0-100), give 1-2 sentences of feedback, and ask one good follow-up question. JSON: {"relevance":0,"confidence":0,"feedback":"...","nextQuestion":"..."}`,
      },
    ],
  });
  const parsed = scoreSchema.parse(parseJson(res.content));

  const scores = {
    relevance: parsed.relevance,
    confidence: parsed.confidence,
    delivery: delivery.deliveryScore,
    fillerCount: delivery.fillerCount,
    wordCount: delivery.wordCount,
  };

  await db
    .update(interviewTurn)
    .set({ answer, scores, feedback: parsed.feedback })
    .where(eq(interviewTurn.id, turn.id));

  if (parsed.nextQuestion) {
    await db
      .insert(interviewTurn)
      .values({ sessionId, ord: turn.ord + 1, question: parsed.nextQuestion });
  }

  return { scores, feedback: parsed.feedback, nextQuestion: parsed.nextQuestion };
}

export async function getInterview(sessionId: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(interviewSession)
    .where(eq(interviewSession.id, sessionId))
    .limit(1);
  if (!session) return undefined;
  const turns = await db
    .select()
    .from(interviewTurn)
    .where(eq(interviewTurn.sessionId, sessionId))
    .orderBy(asc(interviewTurn.ord));
  return { session, turns };
}

export async function listInterviews() {
  const db = getDb();
  return db.select().from(interviewSession).orderBy(desc(interviewSession.createdAt)).limit(50);
}
