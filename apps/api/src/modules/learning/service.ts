import { schedule, type Rating } from '@abiros/ai';
import { CHAT_MODEL_NAME } from '../../lib/ai.js';
import { HttpError } from '../../lib/errors.js';
import * as gen from './generate.js';
import * as repo from './repo.js';

async function requireText(sourceId: string): Promise<string> {
  const text = await repo.getSourceText(sourceId);
  if (!text) {
    throw HttpError.validation('That source has no extracted text yet — wait for it to finish ingesting.');
  }
  return text;
}

export async function summarizeSource(sourceId: string) {
  const text = await requireText(sourceId);
  const { summary, keyPoints } = await gen.generateSummary(text);
  return repo.upsertSummary(sourceId, summary, keyPoints, CHAT_MODEL_NAME);
}

export async function makeFlashcards(sourceId: string, n = 8) {
  const text = await requireText(sourceId);
  const cards = await gen.generateFlashcards(text, n);
  const inserted = await repo.insertFlashcards(sourceId, cards);
  return { created: inserted.length };
}

export async function makeQuiz(sourceId: string, n = 5) {
  const text = await requireText(sourceId);
  const { title, questions } = await gen.generateQuiz(text, n);
  if (questions.length === 0) throw HttpError.validation('The model returned no quiz questions.');
  return repo.createQuiz(sourceId, title, questions);
}

export async function reviewCard(id: string, rating: Rating) {
  const card = await repo.getFlashcard(id);
  if (!card) throw HttpError.notFound('Flashcard not found');
  const next = schedule(
    { ease: card.ease, interval: card.interval, reps: card.reps, lapses: card.lapses },
    rating,
  );
  return repo.applySchedule(
    id,
    { ease: next.ease, interval: next.interval, reps: next.reps, lapses: next.lapses, dueAt: next.dueAt },
    { rating, quality: next.quality, prevInterval: card.interval },
  );
}
