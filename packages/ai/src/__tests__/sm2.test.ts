import { describe, it, expect } from 'vitest';
import { schedule, newCardState } from '../sm2.js';

const NOW = new Date('2026-01-01T00:00:00Z');
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

describe('SM-2 schedule', () => {
  it('first "good" review schedules 1 day out and increments reps', () => {
    const r = schedule(newCardState(), 'good', NOW);
    expect(r.reps).toBe(1);
    expect(r.interval).toBe(1);
    expect(daysBetween(NOW, r.dueAt)).toBe(1);
  });

  it('second "good" review schedules 6 days out', () => {
    const first = schedule(newCardState(), 'good', NOW);
    const second = schedule(first, 'good', NOW);
    expect(second.reps).toBe(2);
    expect(second.interval).toBe(6);
  });

  it('subsequent reviews multiply interval by ease', () => {
    let card = schedule(newCardState(), 'good', NOW); // reps 1, int 1
    card = schedule(card, 'good', NOW); // reps 2, int 6
    const third = schedule(card, 'good', NOW); // reps 3, int = round(6 * ease)
    expect(third.reps).toBe(3);
    expect(third.interval).toBe(Math.round(6 * third.ease));
    expect(third.interval).toBeGreaterThan(6);
  });

  it('"again" lapses the card: resets reps, interval 1 day, +1 lapse, lowers ease', () => {
    let card = schedule(newCardState(), 'good', NOW);
    card = schedule(card, 'good', NOW); // build it up
    const lapsed = schedule(card, 'again', NOW);
    expect(lapsed.reps).toBe(0);
    expect(lapsed.interval).toBe(1);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.ease).toBeLessThan(card.ease);
  });

  it('ease never drops below 1.3', () => {
    let card = newCardState();
    for (let i = 0; i < 10; i++) card = schedule(card, 'again', NOW);
    expect(card.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('"easy" raises ease above the default', () => {
    const r = schedule(newCardState(), 'easy', NOW);
    expect(r.ease).toBeGreaterThan(2.5);
  });
});
