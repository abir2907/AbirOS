import { describe, it, expect } from 'vitest';
import { composeSelfModel } from '../modules/profile/selfModel.js';

describe('composeSelfModel', () => {
  it('returns empty string when there is nothing to say', () => {
    expect(composeSelfModel({ interests: [], accomplishments: [], goals: [] })).toBe('');
  });

  it('builds an About-Me block from the parts', () => {
    const out = composeSelfModel({
      bio: 'Engineer who loves building things.',
      personality: 'curious, direct',
      coreValues: ['craft', 'honesty'],
      communicationPrefs: 'be concise',
      interests: [
        { label: 'jazz', sentiment: 'love' },
        { label: 'sushi', sentiment: 'like' },
        { label: 'cilantro', sentiment: 'dislike' },
      ],
      accomplishments: [{ title: 'Built AbirOS' }],
      goals: [{ title: 'Land an internship', horizon: 'short_term' }],
    });
    expect(out).toContain('# About the user');
    expect(out).toContain('Engineer who loves building things.');
    expect(out).toContain('**Likes:** jazz, sushi');
    expect(out).toContain('**Dislikes:** cilantro');
    expect(out).toContain('Built AbirOS');
    expect(out).toContain('Land an internship (short term)');
  });

  it('respects the character budget', () => {
    const out = composeSelfModel(
      { bio: 'x'.repeat(5000), interests: [], accomplishments: [], goals: [] },
      200,
    );
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.endsWith('…')).toBe(true);
  });
});
