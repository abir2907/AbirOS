import { listGoals } from '../planner/repo.js';
import { musicSummaryData, listBooks } from '../collections/repo.js';
import * as repo from './repo.js';

export interface SelfModelInput {
  bio?: string | null;
  personality?: string | null;
  coreValues?: string[];
  communicationPrefs?: string | null;
  interests: { label: string; sentiment: string }[];
  accomplishments: { title: string }[];
  goals: { title: string; horizon: string }[];
  music?: string[];
  reading?: string[];
}

/**
 * Pure composer: build a compact "About Me" markdown block under a character
 * budget (~4 chars/token, so ~3200 chars ≈ ~800 tokens). Returns '' when there
 * is nothing meaningful to say (so we don't inject an empty header).
 */
export function composeSelfModel(input: SelfModelInput, budgetChars = 3200): string {
  const likes = input.interests.filter((i) => i.sentiment === 'love' || i.sentiment === 'like');
  const dislikes = input.interests.filter((i) => i.sentiment === 'dislike');

  const body: string[] = [];
  if (input.bio?.trim()) body.push(input.bio.trim());
  if (input.personality?.trim()) body.push(`**Personality:** ${input.personality.trim()}`);
  if (input.coreValues?.length) body.push(`**Values:** ${input.coreValues.join(', ')}`);
  if (input.communicationPrefs?.trim())
    body.push(`**How to talk to me:** ${input.communicationPrefs.trim()}`);
  if (likes.length) body.push(`**Likes:** ${likes.slice(0, 25).map((i) => i.label).join(', ')}`);
  if (dislikes.length)
    body.push(`**Dislikes:** ${dislikes.slice(0, 15).map((i) => i.label).join(', ')}`);
  if (input.accomplishments.length)
    body.push(
      `**Recent accomplishments:** ${input.accomplishments.slice(0, 8).map((a) => a.title).join('; ')}`,
    );
  if (input.goals.length)
    body.push(
      `**Active goals:** ${input.goals.map((g) => `${g.title} (${g.horizon.replace('_', ' ')})`).join('; ')}`,
    );
  if (input.music?.length) body.push(`**Music:** ${input.music.slice(0, 10).join(', ')}`);
  if (input.reading?.length) body.push(`**Currently reading:** ${input.reading.join(', ')}`);

  if (body.length === 0) return '';
  const out = ['# About the user', ...body].join('\n');
  return out.length > budgetChars ? `${out.slice(0, budgetChars - 1)}…` : out;
}

/** Fetch everything and compose the self-model block. */
export async function buildSelfModel(): Promise<string> {
  const [p, interests, accomplishments, goals, music, reading] = await Promise.all([
    repo.getProfile(),
    repo.listInterests(),
    repo.listAccomplishments(50),
    listGoals(),
    musicSummaryData().catch(() => ({ topArtists: [] as { name: string }[], trackCount: 0 })),
    listBooks('reading').catch(() => [] as { title: string }[]),
  ]);
  return composeSelfModel({
    bio: p?.bio,
    personality: p?.personality,
    coreValues: p?.coreValues,
    communicationPrefs: p?.communicationPrefs,
    interests: interests.map((i) => ({ label: i.label, sentiment: i.sentiment })),
    accomplishments: accomplishments.map((a) => ({ title: a.title })),
    goals: goals.filter((g) => g.status === 'active').map((g) => ({ title: g.title, horizon: g.horizon })),
    music: music.topArtists.slice(0, 8).map((a) => a.name),
    reading: reading.map((b) => b.title),
  });
}

// Cached, with TTL + explicit invalidation on writes (no pg-boss needed).
let cache: { text: string; at: number } | undefined;
const TTL_MS = 5 * 60 * 1000;

export async function getSelfModel(): Promise<string> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.text;
  const text = await buildSelfModel().catch(() => '');
  cache = { text, at: Date.now() };
  return text;
}

export function invalidateSelfModel(): void {
  cache = undefined;
}
