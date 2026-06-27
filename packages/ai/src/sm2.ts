/**
 * SM-2 spaced-repetition scheduler (the SuperMemo-2 algorithm).
 *
 * Pure and deterministic given a `now` — feed it a card's current state plus the
 * user's rating and it returns the next state. Ratings map to SM-2 "quality":
 *   again → 1 (lapse, relearn)   hard → 3   good → 4   easy → 5
 */
export type Rating = 'again' | 'hard' | 'good' | 'easy';

export const RATING_QUALITY: Record<Rating, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export interface CardState {
  ease: number;
  interval: number; // days
  reps: number;
  lapses: number;
}

export interface ScheduleResult extends CardState {
  quality: number;
  dueAt: Date;
}

const MIN_EASE = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function schedule(card: CardState, rating: Rating, now: Date = new Date()): ScheduleResult {
  const quality = RATING_QUALITY[rating];

  // Update ease factor (SM-2 formula); never below the floor.
  const ease = Math.max(
    MIN_EASE,
    card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  let reps: number;
  let interval: number;
  let lapses = card.lapses;

  if (quality < 3) {
    // Failed recall — reset the repetition count and relearn tomorrow.
    reps = 0;
    interval = 1;
    lapses += 1;
  } else {
    reps = card.reps + 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(card.interval * ease);
    interval = Math.max(1, interval);
  }

  return { ease, interval, reps, lapses, quality, dueAt: new Date(now.getTime() + interval * DAY_MS) };
}

/** A fresh card's starting state. */
export const newCardState = (): CardState => ({ ease: 2.5, interval: 0, reps: 0, lapses: 0 });
