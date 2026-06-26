import type { ChatStreamEvent, Citation, SearchHit } from '@abiros/shared';
import { getLlm } from '../../lib/ai.js';
import { hybridSearch } from '../search/service.js';
import * as repo from './repo.js';

const SYSTEM_PROMPT = `You are AbirOS, a personal AI assistant with access to the user's own knowledge base (their notes, PDFs, and saved articles).

Rules:
- Answer using ONLY the provided context snippets. Each snippet is labelled with a [n] citation marker.
- When you use information from a snippet, cite it inline as [n].
- If the context does not contain the answer, say so plainly — do not invent facts.
- Be concise and direct. Use markdown when helpful.`;

/** Build numbered citations (one per distinct source) + a context block for the prompt. */
function buildContext(hits: SearchHit[]): { citations: Citation[]; block: string } {
  const nBySource = new Map<string, number>();
  const citations: Citation[] = [];
  for (const h of hits) {
    if (!nBySource.has(h.sourceId)) {
      const n = citations.length + 1;
      nBySource.set(h.sourceId, n);
      citations.push({ n, sourceId: h.sourceId, title: h.sourceTitle, type: h.sourceType });
    }
  }
  const block = hits
    .map((h) => `[${nBySource.get(h.sourceId)}] (${h.sourceTitle})\n${h.text}`)
    .join('\n\n---\n\n');
  return { citations, block };
}

/**
 * The orchestrator: retrieve relevant context (the search_knowledge tool), then
 * stream a cited answer. Persists both the user and assistant messages. Robust
 * with any local model since it does not depend on native tool-calling.
 */
export async function streamAnswer(
  sessionId: string,
  userContent: string,
  send: (event: ChatStreamEvent) => void,
): Promise<void> {
  await repo.addMessage(sessionId, 'user', userContent);

  send({ type: 'status', message: 'Searching your knowledge base…' });
  const hits = await hybridSearch(userContent, 8);
  const { citations, block } = buildContext(hits);
  send({ type: 'citations', citations });

  const prompt =
    citations.length > 0
      ? `Context snippets:\n\n${block}\n\n---\n\nQuestion: ${userContent}`
      : `The knowledge base returned no relevant snippets for this question.\n\nQuestion: ${userContent}`;

  send({ type: 'status', message: 'Thinking…' });
  const provider = getLlm();
  let full = '';
  try {
    if (provider.stream) {
      for await (const chunk of provider.stream({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      })) {
        if (chunk.delta) {
          full += chunk.delta;
          send({ type: 'token', value: chunk.delta });
        }
      }
    } else {
      const res = await provider.chat({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      });
      full = res.content;
      send({ type: 'token', value: full });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed';
    send({ type: 'error', message });
    await repo.addMessage(sessionId, 'assistant', `⚠️ ${message}`, citations);
    return;
  }

  const assistant = await repo.addMessage(sessionId, 'assistant', full, citations);

  // Name the session from its first user message (only if still untitled).
  await repo.setTitleIfDefault(sessionId, userContent.slice(0, 60)).catch(() => {});

  send({ type: 'done', messageId: assistant.id });
}
