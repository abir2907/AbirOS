import {
  Activity,
  Brain,
  CalendarDays,
  Code2,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  User,
  Library,
  type LucideIcon,
} from 'lucide-react';
import { MODULES, type ModuleDef } from '@abiros/shared';

export interface ModuleUi {
  icon: LucideIcon;
  /** One-line hint shown in the empty state. */
  hint: string;
  /** Bullet list of what this module will do once built. */
  comingSoon: string[];
}

const UI: Record<string, ModuleUi> = {
  dashboard: {
    icon: LayoutDashboard,
    hint: 'Your daily cockpit once the other modules have data.',
    comingSoon: ['Due flashcards', "Today's plan", 'Recent ingests', 'GitHub streak', 'Spend this month'],
  },
  chat: {
    icon: MessageSquare,
    hint: 'Ask anything across your whole knowledge base — the AI orchestrates the right modules.',
    comingSoon: ['Tool-using agent', 'Streaming answers', 'Citations to your sources'],
  },
  search: {
    icon: Search,
    hint: 'One search bar over notes, PDFs, code, journal — everything you ingest.',
    comingSoon: ['Hybrid full-text + semantic', 'Reciprocal Rank Fusion', 'Source filters'],
  },
  knowledge: {
    icon: Brain,
    hint: 'Your second brain: ingested sources, notes, project memory, and the knowledge map.',
    comingSoon: ['Universal ingestion', 'Project memory', 'Entity/relation graph'],
  },
  profile: {
    icon: User,
    hint: 'Your self-model — what the assistant knows about you.',
    comingSoon: ['Profile', 'Interests', 'Accomplishments'],
  },
  collections: {
    icon: Library,
    hint: 'Your music, books, sports, and travel.',
    comingSoon: ['Music', 'Books', 'Sports', 'Travel'],
  },
  learning: {
    icon: GraduationCap,
    hint: 'Turn what you read into durable knowledge.',
    comingSoon: ['Auto summaries', 'Flashcards (SM-2)', 'Quizzes', 'Knowledge gaps'],
  },
  planner: {
    icon: CalendarDays,
    hint: 'Plan your days and steer long-term goals.',
    comingSoon: ['Daily plan generation', 'Goal simulator', 'University companion'],
  },
  developer: {
    icon: Code2,
    hint: 'Your coding life, indexed and analyzed.',
    comingSoon: ['GitHub sync', 'Code historian', 'Career analyzer', 'Resume', 'Interview coach'],
  },
  life: {
    icon: Activity,
    hint: 'Analytics and replay of your real life.',
    comingSoon: ['Metrics dashboard', 'Expense detective', 'Life replay timeline', 'Dataset export'],
  },
  settings: {
    icon: Settings,
    hint: 'Providers, integrations, enabled modules, and data controls.',
    comingSoon: ['AI provider config', 'GitHub token', 'DB usage monitor', 'Data export / purge'],
  },
};

export interface RegisteredModule extends ModuleDef {
  ui: ModuleUi;
}

export const REGISTERED_MODULES: RegisteredModule[] = MODULES.map((m) => ({
  ...m,
  ui: UI[m.id] ?? { icon: LayoutDashboard, hint: '', comingSoon: [] },
}));
