import { getLlm } from '../../lib/ai.js';
import { invalidateSelfModel } from '../profile/selfModel.js';
import { listInterests } from '../profile/repo.js';
import { listGoals } from '../planner/repo.js';
import { parseTakeoutMusic } from './takeout.js';
import * as repo from './repo.js';

export async function importTakeout(raw: string) {
  const tracks = parseTakeoutMusic(raw);
  const imported = await repo.importTakeoutTracks(tracks);
  invalidateSelfModel();
  return { parsed: tracks.length, imported };
}

export async function musicTaste() {
  const { topArtists, trackCount } = await repo.musicSummaryData();
  if (trackCount === 0) return { summary: 'No music imported yet.', topArtists, trackCount };
  const res = await getLlm().chat({
    system: 'You summarize a person\'s music taste in 2-3 sentences. No preamble.',
    messages: [
      {
        role: 'user',
        content: `My top artists by play count: ${topArtists.map((a) => `${a.name} (${a.n})`).join(', ')}. Total tracks: ${trackCount}. Describe my music taste.`,
      },
    ],
  });
  return { summary: res.content, topArtists, trackCount };
}

export async function recommendBook() {
  const [interests, goals, shelf] = await Promise.all([
    listInterests(),
    listGoals(),
    repo.listBooks(),
  ]);
  const res = await getLlm().chat({
    system: 'You recommend one book and why, in 2-3 sentences. No preamble.',
    messages: [
      {
        role: 'user',
        content: `Recommend a book for me.
Interests: ${interests.map((i) => i.label).join(', ') || 'n/a'}
Active goals: ${goals.filter((g) => g.status === 'active').map((g) => g.title).join(', ') || 'n/a'}
Already on my shelf: ${shelf.map((b) => b.title).join(', ') || 'none'}
Suggest something new and specific.`,
      },
    ],
  });
  return { recommendation: res.content };
}

export async function planTrip(input: string) {
  const wishlist = await repo.listPlaces('want_to_visit');
  const filtered = input
    ? wishlist.filter((p) => `${p.name} ${p.country ?? ''}`.toLowerCase().includes(input.toLowerCase()))
    : wishlist;
  const target = filtered.length ? filtered : wishlist;
  const res = await getLlm().chat({
    system: 'You draft a short, practical trip itinerary. Markdown ok, no preamble.',
    messages: [
      {
        role: 'user',
        content: `Draft an itinerary${input ? ` for ${input}` : ''} drawing on my wishlist: ${
          target.map((p) => `${p.name}${p.country ? `, ${p.country}` : ''}`).join('; ') ||
          '(empty — suggest a few ideas)'
        }. Keep it to a few days and concrete.`,
      },
    ],
  });
  return { itinerary: res.content, places: target.map((p) => p.name) };
}
