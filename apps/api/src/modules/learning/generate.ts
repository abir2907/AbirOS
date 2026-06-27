import { z } from 'zod';
import { getLlm } from '../../lib/ai.js';

/** Tolerant JSON parse — strips ```json fences some models add. */
function parseJson(content: string): unknown {
  const cleaned = content
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

async function ask(system: string, user: string): Promise<unknown> {
  const res = await getLlm().chat({ system, json: true, messages: [{ role: 'user', content: user }] });
  return parseJson(res.content);
}

const summarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
});

export async function generateSummary(text: string) {
  const out = summarySchema.parse(
    await ask(
      'You summarize documents. Reply with JSON only.',
      `Summarize the following in 3-5 sentences and list 3-6 key points. Respond as JSON: {"summary": "...", "keyPoints": ["..."]}\n\n${text.slice(0, 6000)}`,
    ),
  );
  return out;
}

const flashcardsSchema = z.object({
  cards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).default([]),
});

export async function generateFlashcards(text: string, n = 8) {
  const out = flashcardsSchema.parse(
    await ask(
      'You create study flashcards. Reply with JSON only.',
      `Create ${n} concise question/answer flashcards from the content. Front = a question, back = the answer. Respond as JSON: {"cards": [{"front": "...", "back": "..."}]}\n\n${text.slice(0, 6000)}`,
    ),
  );
  return out.cards.slice(0, n);
}

const quizSchema = z.object({
  title: z.string().default('Quiz'),
  questions: z
    .array(
      z.object({
        question: z.string().min(1),
        options: z.array(z.string()).min(2),
        answerIndex: z.number().int().min(0),
        explanation: z.string().optional(),
      }),
    )
    .default([]),
});

export async function generateQuiz(text: string, n = 5) {
  const out = quizSchema.parse(
    await ask(
      'You write multiple-choice quizzes. Reply with JSON only.',
      `Write a ${n}-question multiple-choice quiz (4 options each) testing understanding of the content. Respond as JSON: {"title": "...", "questions": [{"question": "...", "options": ["a","b","c","d"], "answerIndex": 0, "explanation": "..."}]}\n\n${text.slice(0, 6000)}`,
    ),
  );
  // Clamp answerIndex into range defensively.
  out.questions = out.questions.map((q) => ({
    ...q,
    answerIndex: Math.min(q.answerIndex, q.options.length - 1),
  }));
  return out;
}
