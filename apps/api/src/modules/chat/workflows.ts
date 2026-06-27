/**
 * Saved multi-step workflows — slash commands the user can type in the Command
 * Center. Each expands into an instruction that drives the autonomous tool loop.
 */
interface Workflow {
  name: string;
  description: string;
  build: (arg: string) => string;
}

const WORKFLOWS: Record<string, Workflow> = {
  'prep-interview': {
    name: '/prep-interview',
    description: 'Prepare for an interview on a topic',
    build: (t) =>
      `Help me prepare for an interview about "${t || 'my field'}". Use search_knowledge for my notes on it, search_code for my relevant implementations, and get_due_flashcards for weak areas. Give a focused prep plan: likely questions, what to revise, and talking points.`,
  },
  'daily-brief': {
    name: '/daily-brief',
    description: "A briefing for today",
    build: () =>
      `Give me a concise briefing for today. Use get_calendar for events, get_tasks for my plan, and get_due_flashcards for reviews. Format as a short, prioritized checklist.`,
  },
  'weekly-review': {
    name: '/weekly-review',
    description: 'Review my past week',
    build: () =>
      `Summarize my past week. Use get_github_activity for commits, get_expenses for spending, and list_sources for what I saved. Highlight wins and what to focus on next week.`,
  },
  'study-plan': {
    name: '/study-plan',
    description: 'Build a study plan',
    build: (t) =>
      `Build a study plan${t ? ` focused on "${t}"` : ''}. Use create_study_plan for due cards and weak topics, and search_knowledge for relevant material. Give a prioritized schedule.`,
  },
};

/** If `content` is a known slash command, return the expanded instruction. */
export function expandWorkflow(content: string): string | null {
  if (!content.startsWith('/')) return null;
  const space = content.indexOf(' ');
  const name = (space === -1 ? content.slice(1) : content.slice(1, space)).toLowerCase();
  const arg = space === -1 ? '' : content.slice(space + 1).trim();
  return WORKFLOWS[name]?.build(arg) ?? null;
}

export const WORKFLOW_LIST = Object.values(WORKFLOWS).map((w) => ({
  name: w.name,
  description: w.description,
}));
