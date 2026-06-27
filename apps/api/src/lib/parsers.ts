import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface Extracted {
  title?: string;
  text: string;
  metadata?: Record<string, unknown>;
}

/** Fetch a URL's raw HTML (kept for the web archive before extraction). */
export async function fetchUrlHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (AbirOS ingestion)' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

/** Extract readable article text from already-fetched HTML. */
export function extractArticle(html: string, url: string): Extracted {
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

export async function extractFromUrl(url: string): Promise<Extracted> {
  return extractArticle(await fetchUrlHtml(url), url);
}

/** Extract text from a PDF buffer using unpdf (pure-JS, no native deps). */
export async function extractFromPdf(data: Uint8Array): Promise<Extracted> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(data);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  const merged = (Array.isArray(text) ? text.join('\n\n') : text).trim();
  if (!merged) throw new Error('No extractable text in PDF (it may be scanned — try OCR via image upload).');
  return { text: merged, metadata: { pages: totalPages } };
}

/** OCR an image (screenshot/photo) with tesseract.js (local, free). */
export async function extractFromImage(data: Buffer): Promise<Extracted> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(data);
    const clean = text.replace(/\s+\n/g, '\n').trim();
    return {
      text: clean || '(no text detected in image)',
      metadata: { ocr: true, chars: clean.length },
    };
  } finally {
    await worker.terminate();
  }
}
