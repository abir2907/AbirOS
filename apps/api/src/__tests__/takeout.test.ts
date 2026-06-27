import { describe, it, expect } from 'vitest';
import { parseTakeoutMusic } from '../modules/collections/takeout.js';

const SAMPLE = JSON.stringify([
  {
    title: 'Watched So What',
    titleUrl: 'https://www.youtube.com/watch?v=abc123',
    subtitles: [{ name: 'Miles Davis - Topic' }],
    time: '2026-01-01T10:00:00Z',
  },
  {
    title: 'Watched How to center a div',
    titleUrl: 'https://www.youtube.com/watch?v=xyz',
    subtitles: [{ name: 'Some Dev Channel' }],
    time: '2026-01-02T10:00:00Z',
  },
  {
    title: 'Watched Blinding Lights (Official Video)',
    titleUrl: 'https://www.youtube.com/watch?v=def456',
    subtitles: [{ name: 'TheWeeknd' }],
    time: '2026-01-03T10:00:00Z',
  },
  // duplicate of the first by video id
  {
    title: 'Watched So What',
    titleUrl: 'https://www.youtube.com/watch?v=abc123',
    subtitles: [{ name: 'Miles Davis - Topic' }],
  },
]);

describe('parseTakeoutMusic', () => {
  it('extracts "- Topic" music tracks and parses artist + video id', () => {
    const tracks = parseTakeoutMusic(SAMPLE);
    const miles = tracks.find((t) => t.externalId === 'abc123');
    expect(miles).toBeDefined();
    expect(miles!.title).toBe('So What');
    expect(miles!.artist).toBe('Miles Davis');
  });

  it('catches "Official Video" titles but skips non-music', () => {
    const tracks = parseTakeoutMusic(SAMPLE);
    expect(tracks.some((t) => t.title.includes('Blinding Lights'))).toBe(true);
    expect(tracks.some((t) => t.title.includes('center a div'))).toBe(false);
  });

  it('dedupes by video id', () => {
    const tracks = parseTakeoutMusic(SAMPLE);
    expect(tracks.filter((t) => t.externalId === 'abc123')).toHaveLength(1);
  });

  it('returns [] for invalid / non-array input', () => {
    expect(parseTakeoutMusic('not json')).toEqual([]);
    expect(parseTakeoutMusic('{"a":1}')).toEqual([]);
  });
});
