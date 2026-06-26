/**
 * Cross-cutting constants shared by the API and web app.
 * The module registry here is the single source of truth for navigation,
 * route mounting, and the Settings "enabled modules" list.
 */

/** Every kind of thing AbirOS can ingest into the shared knowledge base. */
export const SOURCE_TYPES = [
  'note',
  'pdf',
  'docx',
  'web_article',
  'screenshot',
  'image',
  'github_repo',
  'github_commit',
  'journal_entry',
  'email',
  'expense_csv',
  'book',
  'research_paper',
  'certificate',
  'dataset',
  'chat_message',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Lifecycle of an ingested source as it flows through the RAG pipeline. */
export const SOURCE_STATUSES = ['pending', 'processing', 'ready', 'failed'] as const;
export type SourceStatus = (typeof SOURCE_STATUSES)[number];

/** AI provider selectors (chosen via env, never by rewriting call sites). */
export const LLM_PROVIDERS = ['ollama', 'openai_compatible', 'anthropic'] as const;
export type LlmProviderId = (typeof LLM_PROVIDERS)[number];

export const EMBEDDING_PROVIDERS = ['ollama', 'openai_compatible'] as const;
export type EmbeddingProviderId = (typeof EMBEDDING_PROVIDERS)[number];

/**
 * Feature modules. `id` is used for API mount paths, web routes, nav, and the
 * `setting.enabled_modules` flags. `phase` documents when it gets real
 * functionality (shells exist from Phase 0).
 */
export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  /** Path segment under both `/api/:id` and the web router `/:id`. */
  path: string;
  phase: number;
}

export const MODULES: readonly ModuleDef[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'At-a-glance summary pulling from every module.',
    path: '/',
    phase: 6,
  },
  {
    id: 'chat',
    label: 'Command Center',
    description: 'The AI orchestrator — ask anything across your whole knowledge base.',
    path: '/chat',
    phase: 1,
  },
  {
    id: 'search',
    label: 'Search',
    description: 'Hybrid full-text + semantic search over everything you have ingested.',
    path: '/search',
    phase: 1,
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    description: 'Your second brain: sources, notes, project memory, and the knowledge map.',
    path: '/knowledge',
    phase: 1,
  },
  {
    id: 'learning',
    label: 'Learning',
    description: 'Summaries, flashcards (spaced repetition), quizzes, and concept graph.',
    path: '/learning',
    phase: 3,
  },
  {
    id: 'planner',
    label: 'Planner',
    description: 'Daily plans, goal simulator, and university companion.',
    path: '/planner',
    phase: 4,
  },
  {
    id: 'developer',
    label: 'Developer',
    description: 'Code historian, GitHub career analyzer, resume, and interview coach.',
    path: '/developer',
    phase: 2,
  },
  {
    id: 'life',
    label: 'Life',
    description: 'Life analytics, expense detective, timeline replay, and dataset export.',
    path: '/life',
    phase: 5,
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Providers, integrations, enabled modules, data export, and danger zone.',
    path: '/settings',
    phase: 0,
  },
] as const;

export const MODULE_IDS = MODULES.map((m) => m.id);
