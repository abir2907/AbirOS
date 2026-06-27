import { describe, it, expect } from 'vitest';
import { analyzeDelivery } from '../modules/developer/interviewAnalyze.js';

describe('analyzeDelivery', () => {
  it('counts words', () => {
    expect(analyzeDelivery('one two three four five').wordCount).toBe(5);
  });

  it('detects filler words and phrases', () => {
    const a = analyzeDelivery('Um, I basically, you know, like used a hash map, um.');
    expect(a.fillerCount).toBeGreaterThanOrEqual(4); // um, basically, you know, like, um
  });

  it('detects hedging', () => {
    const a = analyzeDelivery('I think maybe it was probably the right approach.');
    expect(a.hedgeCount).toBeGreaterThanOrEqual(3);
  });

  it('a clean, substantial answer scores high', () => {
    const clean =
      'I implemented authentication with a JSON Web Token stored in an httpOnly cookie. ' +
      'The server verifies the bcrypt password hash on login and signs a token that middleware ' +
      'validates on every protected route, which keeps the design stateless and secure.';
    expect(analyzeDelivery(clean).deliveryScore).toBeGreaterThan(80);
  });

  it('a filler-heavy answer scores lower than a clean one', () => {
    const messy = 'um like you know basically uh i mean like um you know';
    const clean = 'I optimized the query by adding an index and it ran much faster after that change.';
    expect(analyzeDelivery(messy).deliveryScore).toBeLessThan(analyzeDelivery(clean).deliveryScore);
  });

  it('handles empty input', () => {
    const a = analyzeDelivery('');
    expect(a.wordCount).toBe(0);
    expect(a.fillerCount).toBe(0);
  });
});
