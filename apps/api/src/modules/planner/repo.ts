import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import {
  getDb,
  calendarEvent,
  planItem,
  goal,
  goalStep,
  goalSnapshot,
  course,
  assignment,
  timetableSlot,
  exam,
} from '@abiros/db';
import type { IcsEvent } from './ics.js';

// ── Calendar ─────────────────────────────────────────────────────────────────
export async function listEvents(from: Date, to: Date) {
  const db = getDb();
  return db
    .select()
    .from(calendarEvent)
    .where(and(gte(calendarEvent.startAt, from), lte(calendarEvent.startAt, to)))
    .orderBy(asc(calendarEvent.startAt));
}

export async function createEvent(values: typeof calendarEvent.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(calendarEvent).values(values).returning();
  return row!;
}

export async function deleteEvent(id: string) {
  const db = getDb();
  const res = await db.delete(calendarEvent).where(eq(calendarEvent.id, id)).returning({ id: calendarEvent.id });
  return res.length > 0;
}

export async function importEvents(events: IcsEvent[]) {
  const db = getDb();
  let imported = 0;
  for (const e of events) {
    const res = await db
      .insert(calendarEvent)
      .values({
        title: e.title,
        description: e.description,
        location: e.location,
        startAt: e.startAt,
        endAt: e.endAt,
        allDay: e.allDay,
        source: 'ics',
        uid: e.uid,
      })
      .onConflictDoNothing()
      .returning({ id: calendarEvent.id });
    if (res.length > 0) imported++;
  }
  return imported;
}

// ── Daily plan ───────────────────────────────────────────────────────────────
export async function getPlan(planDate: string) {
  const db = getDb();
  return db
    .select()
    .from(planItem)
    .where(eq(planItem.planDate, planDate))
    .orderBy(asc(planItem.ord), asc(planItem.startTime));
}

export async function replacePlan(
  planDate: string,
  items: {
    title: string;
    detail?: string;
    startTime?: string;
    endTime?: string;
    kind?: string;
    ord: number;
  }[],
) {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.delete(planItem).where(eq(planItem.planDate, planDate));
    if (items.length > 0) {
      await tx.insert(planItem).values(items.map((i) => ({ ...i, planDate })));
    }
  });
  return getPlan(planDate);
}

export async function addTask(planDate: string, title: string, detail?: string) {
  const db = getDb();
  const [row] = await db
    .insert(planItem)
    .values({ planDate, title, detail, kind: 'task', ord: 999 })
    .returning();
  return row!;
}

export async function togglePlanItem(id: string, done: boolean) {
  const db = getDb();
  const res = await db
    .update(planItem)
    .set({ done, updatedAt: new Date() })
    .where(eq(planItem.id, id))
    .returning({ id: planItem.id });
  return res.length > 0;
}

// ── Goals ────────────────────────────────────────────────────────────────────
export async function listGoals() {
  const db = getDb();
  return db.select().from(goal).where(isNull(goal.deletedAt)).orderBy(desc(goal.createdAt));
}

export async function createGoal(values: typeof goal.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(goal).values(values).returning();
  return row!;
}

export async function getGoal(id: string) {
  const db = getDb();
  const [g] = await db
    .select()
    .from(goal)
    .where(and(eq(goal.id, id), isNull(goal.deletedAt)))
    .limit(1);
  if (!g) return undefined;
  const steps = await db.select().from(goalStep).where(eq(goalStep.goalId, id)).orderBy(asc(goalStep.ord));
  const snapshots = await db
    .select()
    .from(goalSnapshot)
    .where(eq(goalSnapshot.goalId, id))
    .orderBy(asc(goalSnapshot.capturedAt));
  return { ...g, steps, snapshots };
}

export async function deleteGoal(id: string) {
  const db = getDb();
  const res = await db
    .update(goal)
    .set({ deletedAt: new Date() })
    .where(and(eq(goal.id, id), isNull(goal.deletedAt)))
    .returning({ id: goal.id });
  return res.length > 0;
}

export async function addStep(goalId: string, title: string, ord: number) {
  const db = getDb();
  const [row] = await db.insert(goalStep).values({ goalId, title, ord }).returning();
  return row!;
}

export async function toggleStep(id: string, done: boolean) {
  const db = getDb();
  const res = await db.update(goalStep).set({ done }).where(eq(goalStep.id, id)).returning({ id: goalStep.id });
  return res.length > 0;
}

export async function addSnapshot(goalId: string, probability: number, rationale: string) {
  const db = getDb();
  const [row] = await db.insert(goalSnapshot).values({ goalId, probability, rationale }).returning();
  return row!;
}

export async function incompleteGoalSteps(limit = 20) {
  const db = getDb();
  return db
    .select({ title: goalStep.title, goalTitle: goal.title })
    .from(goalStep)
    .innerJoin(goal, eq(goal.id, goalStep.goalId))
    .where(and(eq(goalStep.done, false), isNull(goal.deletedAt)))
    .limit(limit);
}

// ── University ───────────────────────────────────────────────────────────────
export async function listCourses() {
  const db = getDb();
  return db.select().from(course).where(isNull(course.deletedAt)).orderBy(asc(course.name));
}

export async function createCourse(values: typeof course.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(course).values(values).returning();
  return row!;
}

export async function deleteCourse(id: string) {
  const db = getDb();
  const res = await db
    .update(course)
    .set({ deletedAt: new Date() })
    .where(eq(course.id, id))
    .returning({ id: course.id });
  return res.length > 0;
}

export async function listAssignments() {
  const db = getDb();
  return db
    .select({
      id: assignment.id,
      courseId: assignment.courseId,
      title: assignment.title,
      dueAt: assignment.dueAt,
      status: assignment.status,
      weight: assignment.weight,
      courseName: course.name,
    })
    .from(assignment)
    .innerJoin(course, eq(course.id, assignment.courseId))
    .where(isNull(course.deletedAt))
    .orderBy(asc(assignment.dueAt));
}

export async function createAssignment(values: typeof assignment.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(assignment).values(values).returning();
  return row!;
}

export async function toggleAssignment(id: string, status: string) {
  const db = getDb();
  const res = await db
    .update(assignment)
    .set({ status, updatedAt: new Date() })
    .where(eq(assignment.id, id))
    .returning({ id: assignment.id });
  return res.length > 0;
}

export async function upcomingAssignments(days = 7) {
  const db = getDb();
  const until = new Date(Date.now() + days * 86_400_000);
  return db
    .select({ title: assignment.title, dueAt: assignment.dueAt, courseName: course.name })
    .from(assignment)
    .innerJoin(course, eq(course.id, assignment.courseId))
    .where(and(eq(assignment.status, 'todo'), lte(assignment.dueAt, until), isNull(course.deletedAt)))
    .orderBy(asc(assignment.dueAt));
}

export async function listTimetable() {
  const db = getDb();
  return db
    .select({
      id: timetableSlot.id,
      courseId: timetableSlot.courseId,
      dayOfWeek: timetableSlot.dayOfWeek,
      startTime: timetableSlot.startTime,
      endTime: timetableSlot.endTime,
      location: timetableSlot.location,
      courseName: course.name,
    })
    .from(timetableSlot)
    .innerJoin(course, eq(course.id, timetableSlot.courseId))
    .where(isNull(course.deletedAt))
    .orderBy(asc(timetableSlot.dayOfWeek), asc(timetableSlot.startTime));
}

export async function addTimetableSlot(values: typeof timetableSlot.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(timetableSlot).values(values).returning();
  return row!;
}

export async function listExams() {
  const db = getDb();
  return db
    .select({
      id: exam.id,
      courseId: exam.courseId,
      title: exam.title,
      examAt: exam.examAt,
      location: exam.location,
      courseName: course.name,
    })
    .from(exam)
    .innerJoin(course, eq(course.id, exam.courseId))
    .where(isNull(course.deletedAt))
    .orderBy(asc(exam.examAt));
}

export async function addExam(values: typeof exam.$inferInsert) {
  const db = getDb();
  const [row] = await db.insert(exam).values(values).returning();
  return row!;
}
