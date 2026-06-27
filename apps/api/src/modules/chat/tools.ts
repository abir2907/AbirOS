import type { ToolDef } from '@abiros/ai';
import { hybridSearch } from '../search/service.js';
import { listSources, getSourceDetail } from '../sources/repo.js';
import { searchCode, recentActivity } from '../developer/repo.js';
import { dueFlashcards, countDue, knowledgeGaps } from '../learning/repo.js';
import { listEvents, getPlan, listGoals } from '../planner/repo.js';

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

  search_code: {
    def: {
      name: 'search_code',
      description:
        "Code Historian — search the user's synced GitHub commit messages and repos (e.g. 'find every authentication implementation').",
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' }, k: { type: 'number' } },
        required: ['query'],
      },
    },
    execute: (args) => searchCode(String(args.query ?? ''), Number(args.k ?? 20)),
  },

  get_github_activity: {
    def: {
      name: 'get_github_activity',
      description: 'Recent GitHub commit activity for the user within the last N days (default 30).',
      parameters: {
        type: 'object',
        properties: { days: { type: 'number' } },
      },
    },
    execute: (args) => recentActivity(Number(args.days ?? 30)),
  },

  get_due_flashcards: {
    def: {
      name: 'get_due_flashcards',
      description: 'Flashcards that are due for spaced-repetition review right now.',
      parameters: { type: 'object', properties: { limit: { type: 'number' } } },
    },
    execute: async (args) => ({
      count: await countDue(),
      cards: await dueFlashcards(Number(args.limit ?? 20)),
    }),
  },

  create_study_plan: {
    def: {
      name: 'create_study_plan',
      description:
        'Gather the material for a study plan: due flashcards and the weakest topics (knowledge gaps).',
      parameters: { type: 'object', properties: {} },
    },
    execute: async () => ({
      dueCount: await countDue(),
      dueCards: await dueFlashcards(15),
      gaps: await knowledgeGaps(),
    }),
  },

  get_calendar: {
    def: {
      name: 'get_calendar',
      description: 'Calendar events in the next N days (default 7).',
      parameters: { type: 'object', properties: { days: { type: 'number' } } },
    },
    execute: (args) =>
      listEvents(new Date(), new Date(Date.now() + Number(args.days ?? 7) * 86_400_000)),
  },

  get_tasks: {
    def: {
      name: 'get_tasks',
      description: "The daily plan items for a date (YYYY-MM-DD, default today).",
      parameters: { type: 'object', properties: { date: { type: 'string' } } },
    },
    execute: (args) => getPlan(String(args.date ?? new Date().toISOString().slice(0, 10))),
  },

  get_goals: {
    def: {
      name: 'get_goals',
      description: 'The user\'s active goals.',
      parameters: { type: 'object', properties: {} },
    },
    execute: () => listGoals(),
  },
};

export const AGENT_TOOL_DEFS: ToolDef[] = Object.values(AGENT_TOOLS).map((t) => t.def);
