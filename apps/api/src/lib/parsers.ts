import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface Extracted {
  title?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

/** Extract readable article text from a web page. */
export async function extractFromUrl(url: string): Promise<Extracted> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (AbirOS ingestion)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const html = await res.text();
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  const text = (article?.textContent ?? '').trim();
  if (!text) throw new Error('Could not extract readable content from the page.');
  return {
    title: article?.title ?? new URL(url).hostname,
    text,
    metadata: { url, byline: article?.byline ?? undefined, excerpt: article?.excerpt ?? undefined },
  };
}

/** Extract text from a PDF buffer using unpdf (pure-JS, no native deps). */
export async function extractFromPdf(data: Uint8Array): Promise<Extracted> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(data);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  const merged = (Array.isArray(text) ? text.join('\n\n') : text).trim();
  if (!merged) throw new Error('No extractable text in PDF (it may be scanned — OCR arrives in Phase 2).');
  return { text: merged, metadata: { pages: totalPages } };
}
