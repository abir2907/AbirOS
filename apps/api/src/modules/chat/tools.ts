import type { ToolDef } from '@abiros/ai';
import { hybridSearch } from '../search/service.js';
import { listSources, getSourceDetail } from '../sources/repo.js';
import { searchCode, recentActivity } from '../developer/repo.js';
import { dueFlashcards, countDue, knowledgeGaps } from '../learning/repo.js';
import { listEvents, getPlan, listGoals } from '../planner/repo.js';
import { listMetrics } from '../life/repo.js';
import { expenseInsights } from '../life/service.js';
import { addMemory } from '../memory/repo.js';
import { getProfile, listInterests, listAccomplishments } from '../profile/repo.js';
import { listStudyItems, suggestNextStudy } from '../learning/study.js';
import { listBooks, listSports, listPlaces } from '../collections/repo.js';
import { musicTaste, recommendBook, planTrip } from '../collections/service.js';
import { dietSummary } from '../life/diet.js';
import { workoutConsistency } from '../life/gym.js';
import { listBiomarkers, HEALTH_DISCLAIMER } from '../life/health.js';
import { getLeetcodeProfile, searchSolvedProblems, weakTopics } from '../developer/leetcode.js';
import { analyzeResume } from '../developer/resumeAnalysis.js';
import type { InterestCategory, StudyStatus, BookStatus, PlaceStatus } from '@abiros/shared';

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
      description: "The user's goals; optionally filter by horizon (short_term | long_term | life).",
      parameters: { type: 'object', properties: { horizon: { type: 'string' } } },
    },
    execute: async (args) => {
      const goals = await listGoals();
      const h = args.horizon ? String(args.horizon) : '';
      return h ? goals.filter((g) => g.horizon === h) : goals;
    },
  },

  get_profile: {
    def: {
      name: 'get_profile',
      description: "The user's self-profile: bio, personality, values, and how they like to be talked to.",
      parameters: { type: 'object', properties: {} },
    },
    execute: () => getProfile(),
  },

  get_interests: {
    def: {
      name: 'get_interests',
      description:
        'The user\'s interests/tastes; optionally filter by category (music_genre, artist, food, hobby, sport, author, place, …).',
      parameters: { type: 'object', properties: { category: { type: 'string' } } },
    },
    execute: (args) =>
      listInterests(args.category ? (String(args.category) as InterestCategory) : undefined),
  },

  get_accomplishments: {
    def: {
      name: 'get_accomplishments',
      description: 'Things the user has done / achieved.',
      parameters: { type: 'object', properties: {} },
    },
    execute: () => listAccomplishments(50),
  },

  get_study_backlog: {
    def: {
      name: 'get_study_backlog',
      description:
        'The user\'s study backlog; optionally filter by status (want_to_study | studying | studied).',
      parameters: { type: 'object', properties: { status: { type: 'string' } } },
    },
    execute: (args) =>
      listStudyItems(args.status ? (String(args.status) as StudyStatus) : undefined),
  },

  suggest_next_study: {
    def: {
      name: 'suggest_next_study',
      description: 'Recommend what to study next from the backlog, weak topics, due cards, and goals.',
      parameters: { type: 'object', properties: {} },
    },
    execute: () => suggestNextStudy(),
  },

  get_music_taste: {
    def: {
      name: 'get_music_taste',
      description: "The user's music taste — top artists and a summary from imported listening.",
      parameters: { type: 'object', properties: {} },
    },
    execute: () => musicTaste(),
  },

  get_books: {
    def: {
      name: 'get_books',
      description: "The user's books; optionally filter by status (want_to_read | reading | read).",
      parameters: { type: 'object', properties: { status: { type: 'string' } } },
    },
    execute: (args) => listBooks(args.status ? (String(args.status) as BookStatus) : undefined),
  },

  recommend_book: {
    def: {
      name: 'recommend_book',
      description: "Recommend a book based on the user's interests, goals, and current shelf.",
      parameters: { type: 'object', properties: {} },
    },
    execute: () => recommendBook(),
  },

  get_sports_interests: {
    def: {
      name: 'get_sports_interests',
      description: "Sports, teams, and athletes the user follows.",
      parameters: { type: 'object', properties: {} },
    },
    execute: () => listSports(),
  },

  get_places: {
    def: {
      name: 'get_places',
      description: "Places the user wants to visit or has visited (filter by status).",
      parameters: { type: 'object', properties: { status: { type: 'string' } } },
    },
    execute: (args) => listPlaces(args.status ? (String(args.status) as PlaceStatus) : undefined),
  },

  plan_trip: {
    def: {
      name: 'plan_trip',
      description: "Draft a trip itinerary from the user's travel wishlist (optionally for a place/region).",
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
    },
    execute: (args) => planTrip(args.query ? String(args.query) : ''),
  },

  get_expenses: {
    def: {
      name: 'get_expenses',
      description: 'Spending insights: totals, by category, detected subscriptions, and unusual charges.',
      parameters: { type: 'object', properties: {} },
    },
    execute: () => expenseInsights(),
  },

  get_metrics: {
    def: {
      name: 'get_metrics',
      description: 'List of tracked life metrics (sleep, gym, mood, coding, …) with their latest values.',
      parameters: { type: 'object', properties: {} },
    },
    execute: () => listMetrics(),
  },

  remember_fact: {
    def: {
      name: 'remember_fact',
      description:
        'Save a durable fact about the user to long-term memory (a preference, goal, background detail). Use when the user shares something worth remembering for future chats.',
      parameters: {
        type: 'object',
        properties: { fact: { type: 'string' } },
        required: ['fact'],
      },
    },
    execute: async (args) => {
      const fact = String(args.fact ?? '').trim();
      if (!fact) return { saved: false };
      await addMemory(fact, 'assistant');
      return { saved: true, fact };
    },
  },

  get_diet: {
    def: {
      name: 'get_diet',
      description: "Daily calorie/macro totals from the user's logged meals (last N days, default 7).",
      parameters: { type: 'object', properties: { days: { type: 'number' } } },
    },
    execute: (args) => dietSummary(Number(args.days ?? 7)),
  },

  get_gym: {
    def: {
      name: 'get_gym',
      description: "The user's workout consistency: per-day counts, total, and current streak.",
      parameters: { type: 'object', properties: {} },
    },
    execute: () => workoutConsistency(),
  },

  get_biomarkers: {
    def: {
      name: 'get_biomarkers',
      description:
        "Latest blood-test biomarkers vs the report's reference ranges. NOT medical advice — only describe the numbers and recommend seeing a doctor.",
      parameters: { type: 'object', properties: {} },
    },
    execute: async () => ({ biomarkers: await listBiomarkers(), disclaimer: HEALTH_DISCLAIMER }),
  },

  get_leetcode_stats: {
    def: {
      name: 'get_leetcode_stats',
      description: "The user's LeetCode solved counts and ranking.",
      parameters: { type: 'object', properties: {} },
    },
    execute: () => getLeetcodeProfile(),
  },

  search_solved_problems: {
    def: {
      name: 'search_solved_problems',
      description: "Search the user's solved LeetCode problems by title keyword.",
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    },
    execute: (args) => searchSolvedProblems(String(args.query ?? '')),
  },

  weak_topics: {
    def: {
      name: 'weak_topics',
      description: 'Where the user is weakest on LeetCode (the difficulty bucket to focus on).',
      parameters: { type: 'object', properties: {} },
    },
    execute: () => weakTopics(),
  },

  analyze_resume: {
    def: {
      name: 'analyze_resume',
      description:
        "Analyze the user's resume against their real GitHub/LeetCode/accomplishments (and an optional job description).",
      parameters: { type: 'object', properties: { target_jd: { type: 'string' } } },
    },
    execute: (args) => analyzeResume(args.target_jd ? String(args.target_jd) : undefined),
  },
};

export const AGENT_TOOL_DEFS: ToolDef[] = Object.values(AGENT_TOOLS).map((t) => t.def);
