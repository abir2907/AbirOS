import { logger } from '../../lib/logger.js';
import { getLlm } from '../../lib/ai.js';
import { upsertTagsAndLink } from '../tags/repo.js';

/**
 * Best-effort auto-tagging: asks the LLM for a few topic tags and links them to
 * the source. Failures (model down, bad JSON) are swallowed — tags are a bonus,
 * never a reason ingestion fails.
 */
export async function autoTag(sourceId: string, text: string): Promise<void> {
  if (!text.trim() || text.startsWith('(no text detected')) return;
  try {
    const res = await getLlm().chat({
      system: 'You extract concise topical tags. Reply with JSON only.',
      json: true,
      messages: [
        {
          role: 'user',
          content: `Give 3-6 short lowercase topic tags (one or two words each) for this content. Respond as JSON: {"tags": ["tag1","tag2"]}\n\n${text.slice(0, 3000)}`,
        },
      ],
    });
    const parsed = JSON.parse(res.content) as { tags?: unknown };
    const tags = Array.isArray(parsed.tags) ? parsed.tags.map(String).filter(Boolean) : [];
    if (tags.length > 0) await upsertTagsAndLink(sourceId, tags);
  } catch (err) {
    logger.warn({ sourceId, err: err instanceof Error ? err.message : err }, 'auto-tagging skipped');
  }
}
