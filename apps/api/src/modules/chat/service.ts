import type { ChatStreamEvent, Citation, SearchHit } from '@abiros/shared';
import { getLlm } from '../../lib/ai.js';
import { logger } from '../../lib/logger.js';
import { hybridSearch } from '../search/service.js';
import { recentMemories } from '../memory/repo.js';
import { getSelfModel } from '../profile/selfModel.js';
import { AGENT_TOOLS } from './tools.js';
import { expandWorkflow } from './workflows.js';
import * as repo from './repo.js';

const MAX_STEPS = 5;

const ANSWER_SYSTEM = `You are AbirOS, a personal AI assistant. Answer the user using the gathered information below — knowledge snippets from their own notes/documents and/or live results from their calendar, tasks, goals, code, flashcards, expenses, and metrics.

Rules:
- Knowledge snippets are labelled [n]; cite them inline as [n] when you use them.
- Use the tool results to answer questions about the user's schedule, tasks, goals, spending, due cards, and so on.
- If the gathered information does not contain the answer, say so plainly — do not invent facts.
- Be concise and well-structured; use markdown (e.g. a checklist when building a plan).`;

const TOOL_MENU = Object.values(AGENT_TOOLS)
  .map((t) => `- ${t.def.name}: ${t.def.description}`)
  .join('\n');

const PLANNER_SYSTEM = `You are AbirOS's planner. You decide which tools to call to gather what's needed to answer the user's request. You can call tools across multiple turns.

Available tools:
${TOOL_MENU}

Respond with EXACTLY ONE JSON object and nothing else:
- To call a tool: {"tool":"<name>","args":{ ... }}
- When you have gathered enough: {"done":true}

Rules:
- For anything about the user's own notes, documents, code, calendar, tasks, goals, flashcards, expenses, or metrics, call the relevant tool(s) first.
- A broad request (e.g. "prepare me for tomorrow") may need several tools — calendar, tasks, due flashcards, recent github activity.
- Never call the same tool with the same arguments twice.
- Return {"done":true} as soon as you have enough; do not over-call.`;

/** Build numbered citations (one per distinct source) + a context block for the prompt. */
function buildContext(hits: SearchHit[]): { citations: Citation[]; block: string } {
  const nBySource = new Map<string, number>();
  const citations: Citation[] = [];
  const lines: string[] = [];
  for (const h of hits) {
    if (!nBySource.has(h.sourceId)) {
      const n = citations.length + 1;
      nBySource.set(h.sourceId, n);
      citations.push({ n, sourceId: h.sourceId, chunkId: h.chunkId, title: h.sourceTitle, type: h.sourceType });
    }
    lines.push(`[${nBySource.get(h.sourceId)}] (${h.sourceTitle})\n${h.text}`);
  }
  return { citations, block: lines.join('\n\n---\n\n') };
}

function parseJson(content: string): { tool?: string; args?: Record<string, unknown>; done?: boolean } | null {
  try {
    return JSON.parse(content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
  } catch {
    return null;
  }
}

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/**
 * The AI Command Center orchestrator — an autonomous multi-tool agent loop.
 *
 * Phase A: a JSON-instructed planning loop where the model calls tools (across
 * turns) to gather data from any module — e.g. calendar + tasks + flashcards +
 * github for "prepare me for tomorrow". Provider-agnostic (no dependency on
 * native tool-calling) so it works with local models.
 * Phase B: streams a final, cited answer composed from everything gathered.
 * A search_knowledge fallback guarantees knowledge questions stay grounded.
 */
export async function streamAnswer(
  sessionId: string,
  userContent: string,
  send: (event: ChatStreamEvent) => void,
): Promise<void> {
  await repo.addMessage(sessionId, 'user', userContent);
  const provider = getLlm();

  // Slash commands (e.g. /prep-interview react) expand into a richer instruction.
  const agentInput = expandWorkflow(userContent) ?? userContent;

  // Inject the self-model ("About Me") + long-term memory into the system prompts.
  const [selfModel, memories] = await Promise.all([
    getSelfModel().catch(() => ''),
    recentMemories(20).catch(() => []),
  ]);
  const aboutBlock = selfModel ? `\n\n${selfModel}` : '';
  const memoryBlock = memories.length
    ? `\n\nKnown facts about the user (use when relevant):\n${memories.map((m) => `- ${m.content}`).join('\n')}`
    : '';
  const plannerSystem = PLANNER_SYSTEM + aboutBlock + memoryBlock;
  const answerSystem = ANSWER_SYSTEM + aboutBlock + memoryBlock;

  const searchHits: SearchHit[] = [];
  const toolNotes: string[] = [];
  const called = new Set<string>();
  const transcript: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: agentInput },
  ];

  // ── Phase A: autonomous tool loop ──────────────────────────────────────────
  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await provider.chat({ system: plannerSystem, messages: transcript, json: true });
      const decision = parseJson(res.content);
      if (!decision || decision.done || !decision.tool) break;

      const tool = AGENT_TOOLS[decision.tool];
      if (!tool) break;
      const args = decision.args && typeof decision.args === 'object' ? decision.args : {};
      const sig = `${decision.tool}:${JSON.stringify(args)}`;
      if (called.has(sig)) break; // avoid loops / duplicate calls
      called.add(sig);

      send({ type: 'status', message: `Using ${decision.tool}…` });
      let out: unknown;
      try {
        out = await tool.execute(args);
      } catch (e) {
        out = { error: e instanceof Error ? e.message : 'tool failed' };
      }

      let outText: string;
      if (decision.tool === 'search_knowledge' && Array.isArray(out)) {
        const hits = out as SearchHit[];
        searchHits.push(...hits);
        outText = hits.map((h) => `(${h.sourceTitle}) ${truncate(h.text, 240)}`).join('\n') || '(no matches)';
      } else {
        outText = truncate(JSON.stringify(out), 1500);
        toolNotes.push(`${decision.tool} →\n${outText}`);
      }

      send({
        type: 'tool',
        name: decision.tool,
        summary:
          decision.tool === 'search_knowledge' && Array.isArray(out)
            ? `${(out as SearchHit[]).length} snippet(s) found`
            : truncate(outText.replace(/\s+/g, ' '), 80),
      });

      transcript.push({ role: 'assistant', content: res.content });
      transcript.push({
        role: 'user',
        content: `Tool "${decision.tool}" returned:\n${outText}\n\nCall another tool or return {"done":true}.`,
      });
    }
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, 'agent planning loop aborted');
  }

  // Fallback: if no tool gathered anything, ground the answer with hybrid search.
  if (searchHits.length === 0 && toolNotes.length === 0) {
    send({ type: 'status', message: 'Searching your knowledge base…' });
    try {
      searchHits.push(...(await hybridSearch(userContent, 8)));
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.message : err }, 'fallback search failed');
    }
  }

  // ── Phase B: stream the final, cited answer ────────────────────────────────
  const { citations, block } = buildContext(searchHits);
  send({ type: 'citations', citations });

  const parts: string[] = [];
  if (block) parts.push(`Knowledge snippets:\n${block}`);
  if (toolNotes.length) parts.push(`Tool results:\n${toolNotes.join('\n\n')}`);
  const context = parts.join('\n\n---\n\n') || '(no relevant data found)';
  const prompt = `${context}\n\n---\n\nUser request: ${agentInput}`;

  send({ type: 'status', message: 'Thinking…' });
  let full = '';
  try {
    if (provider.stream) {
      for await (const chunk of provider.stream({
        system: answerSystem,
        messages: [{ role: 'user', content: prompt }],
      })) {
        if (chunk.delta) {
          full += chunk.delta;
          send({ type: 'token', value: chunk.delta });
        }
      }
    } else {
      const res = await provider.chat({ system: answerSystem, messages: [{ role: 'user', content: prompt }] });
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
  await repo.setTitleIfDefault(sessionId, userContent.slice(0, 60)).catch(() => {});
  send({ type: 'done', messageId: assistant.id });
}
