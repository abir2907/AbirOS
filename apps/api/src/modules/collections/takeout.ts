/**
 * Parse a Google Takeout YouTube **watch-history.json** export and extract
 * music-like entries — free, offline, no API. YouTube auto-generates "<Artist> -
 * Topic" channels for music, which is a reliable signal; we also catch obvious
 * "official video/audio/lyrics" titles. Pure + unit-tested.
 */
interface TakeoutEntry {
  title?: string;
  titleUrl?: string;
  subtitles?: { name?: string }[];
  time?: string;
}

export interface ParsedTrack {
  title: string;
  artist?: string;
  externalId?: string;
  url?: string;
  occurredAt?: string;
}

export function parseTakeoutMusic(raw: string): ParsedTrack[] {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const out: ParsedTrack[] = [];
  for (const e of data as TakeoutEntry[]) {
    const titleRaw = e?.title;
    if (!titleRaw) continue;
    const channel = e?.subtitles?.[0]?.name;
    const isMusic =
      (channel && /\s-\sTopic$/.test(channel)) ||
      /(official\s+(video|audio)|lyric|\bMV\b)/i.test(titleRaw);
    if (!isMusic) continue;

    const title = titleRaw.replace(/^Watched\s+/i, '').trim();
    const artist = channel ? channel.replace(/\s*-\s*Topic$/i, '').trim() : undefined;
    const url = e?.titleUrl;
    const externalId = url?.match(/[?&]v=([\w-]+)/)?.[1];
    const key = externalId || `${artist ?? ''}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title, artist, externalId, url, occurredAt: e?.time });
  }
  return out;
}
