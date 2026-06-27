import { z } from 'zod';
import { getLlm } from '../../lib/ai.js';
import * as repo from './repo.js';
import { parseIcs } from './ics.js';

function parseJson(content: string): unknown {
  return JSON.parse(content.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim());
}
async function ask(system: string, user: string): Promise<unknown> {
  const res = await getLlm().chat({ system, json: true, messages: [{ role: 'user', content: user }] });
  return parseJson(res.content);
}

const fmtTime = (d: Date | null) =>
  d ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

// ── Daily plan ───────────────────────────────────────────────────────────────
const planSchema = z.object({
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        detail: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        kind: z.string().default('task'),
      }),
    )
    .default([]),
});

export async function generateDailyPlan(dateStr: string) {
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);
  const [events, assignments, steps, existing] = await Promise.all([
    repo.listEvents(dayStart, dayEnd),
    repo.upcomingAssignments(7),
    repo.incompleteGoalSteps(10),
    repo.getPlan(dateStr),
  ]);

  const context = [
    `Date: ${dateStr}`,
    `Calendar events today:\n${events.map((e) => `- ${fmtTime(e.startAt)} ${e.title}`).join('\n') || '- none'}`,
    `Assignments due within 7 days:\n${assignments.map((a) => `- ${a.courseName}: ${a.title} (due ${a.dueAt ? new Date(a.dueAt).toLocaleDateString() : 'soon'})`).join('\n') || '- none'}`,
    `Goal next-steps:\n${steps.map((s) => `- ${s.goalTitle}: ${s.title}`).join('\n') || '- none'}`,
    `Existing tasks I added:\n${existing.filter((p) => p.kind === 'task').map((p) => `- ${p.title}`).join('\n') || '- none'}`,
  ].join('\n\n');

  const out = planSchema.parse(
    await ask(
      'You are a daily planner. Build a realistic, time-blocked schedule. Reply with JSON only.',
      `Create a sensible ordered plan for the day from the following. Fixed calendar events must keep their times. Add focused blocks for assignments and goals. Respond as JSON: {"items": [{"title": "...", "detail": "...", "startTime": "09:00", "endTime": "10:00", "kind": "event|task|study|assignment|goal"}]}\n\n${context}`,
    ),
  );

  return repo.replacePlan(
    dateStr,
    out.items.map((i, ord) => ({ ...i, ord })),
  );
}

// ── Goal simulator ───────────────────────────────────────────────────────────
const simSchema = z.object({
  probability: z.number().min(0).max(100),
  rationale: z.string().default(''),
  steps: z.array(z.string()).default([]),
});

export async function simulateGoal(goalId: string) {
  const g = await repo.getGoal(goalId);
  if (!g) throw new Error('goal not found');

  const out = simSchema.parse(
    await ask(
      'You are a goal-planning analyst. Estimate success probability and a roadmap. Reply with JSON only.',
      `Goal: ${g.title}\nDescription: ${g.description ?? '(none)'}\nTarget date: ${g.targetDate ?? '(none)'}\nSteps (done?):\n${g.steps.map((s) => `- [${s.done ? 'x' : ' '}] ${s.title}`).join('\n') || '- none yet'}\n\nGiven progress and the target date, estimate the success probability (0-100), give a 1-2 sentence rationale, and suggest the next 3-6 roadmap steps. Respond as JSON: {"probability": 0, "rationale": "...", "steps": ["..."]}`,
    ),
  );

  // First simulation with no steps yet → seed the roadmap.
  if (g.steps.length === 0 && out.steps.length > 0) {
    for (let i = 0; i < out.steps.length; i++) await repo.addStep(goalId, out.steps[i]!, i);
  }
  const snapshot = await repo.addSnapshot(goalId, out.probability, out.rationale);
  return { probability: out.probability, rationale: out.rationale, snapshot };
}

// ── ICS import ───────────────────────────────────────────────────────────────
export async function importIcs(raw: string) {
  const events = parseIcs(raw);
  const imported = await repo.importEvents(events);
  return { parsed: events.length, imported };
}

// ── Exam-prep plan ───────────────────────────────────────────────────────────
const examPlanSchema = z.object({
  sessions: z
    .array(z.object({ when: z.string(), course: z.string().optional(), focus: z.string() }))
    .default([]),
});

export async function generateExamPlan() {
  const [exams, assignments] = await Promise.all([repo.listExams(), repo.upcomingAssignments(30)]);
  if (exams.length === 0 && assignments.length === 0) {
    return { sessions: [] };
  }
  const out = examPlanSchema.parse(
    await ask(
      'You build exam-prep study schedules. Reply with JSON only.',
      `Build a study schedule leading up to these exams/deadlines. Spread sessions sensibly before each date. Respond as JSON: {"sessions": [{"when": "2026-06-01", "course": "...", "focus": "..."}]}\n\nExams:\n${exams.map((e) => `- ${e.courseName}: ${e.title} on ${e.examAt ? new Date(e.examAt).toLocaleDateString() : 'TBD'}`).join('\n') || '- none'}\n\nAssignments:\n${assignments.map((a) => `- ${a.courseName}: ${a.title} due ${a.dueAt ? new Date(a.dueAt).toLocaleDateString() : 'soon'}`).join('\n') || '- none'}`,
    ),
  );
  return out;
}
