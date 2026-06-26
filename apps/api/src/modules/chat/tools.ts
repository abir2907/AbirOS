import type { ToolDef } from '@abiros/ai';
import { hybridSearch } from '../search/service.js';
import { listSources, getSourceDetail } from '../sources/repo.js';

/**
 * The agent tool registry — the typed functions the AI Command Center can call.
 * Phase 1 wires `search_knowledge` into the orchestrator's retrieve-then-answer
 * loop; the registry is the basis for native multi-tool calling expanded in
 * later phases (get_calendar, get_github_activity, get_due_flashcards, …).
 */
export interface AgentTool {
  def: ToolDef;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export const AGENT_TOOLS: Record<string, AgentTool> = {
  search_knowledge: {
    def: {
      name: 'search_knowledge',
      description:
        'Hybrid semantic + full-text search across everything the user has ingested. Use for any question about their notes, documents, or saved content.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query' },
          k: { type: 'number', description: 'How many chunks to return (default 8)' },
        },
        required: ['query'],
      },
    },
    execute: (args) => hybridSearch(String(args.query ?? ''), Number(args.k ?? 8)),
  },

  list_sources: {
    def: {
      name: 'list_sources',
      description: 'List the most recently ingested sources (notes, PDFs, web articles).',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'number' } },
      },
    },
    execute: (args) => listSources(Number(args.limit ?? 20), 0),
  },

  get_source: {
    def: {
      name: 'get_source',
      description: 'Fetch the full detail and text preview of one source by its id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
    execute: (args) => getSourceDetail(String(args.id ?? '')),
  },
};

export const AGENT_TOOL_DEFS: ToolDef[] = Object.values(AGENT_TOOLS).map((t) => t.def);
