import type {
  ApiError,
  ChatStreamEvent,
  Health,
  Paginated,
  SearchHit,
  SourceSummary,
} from '@abiros/shared';

/**
 * Thin typed fetch wrapper. Requests are relative and Vite proxies them to the
 * Express API (single origin, cookies included).
 */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;
  let body: ApiError | undefined;
  try {
    body = (await res.json()) as ApiError;
  } catch {
    /* non-JSON error */
  }
  throw new ApiRequestError(
    res.status,
    body?.error.code ?? 'UNKNOWN',
    body?.error.message ?? res.statusText,
    body?.error.details,
  );
}

export async function apiGet<T>(path: string): Promise<T> {
  return handle<T>(await fetch(path, { credentials: 'include' }));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return handle<T>(
    await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

export async function apiDelete<T>(path: string): Promise<T> {
  return handle<T>(await fetch(path, { method: 'DELETE', credentials: 'include' }));
}

// ── Health ───────────────────────────────────────────────────────────────
export const getHealth = () => apiGet<Health>('/health');

// ── Auth ─────────────────────────────────────────────────────────────────
export interface Me {
  username: string;
}
export const login = (username: string, password: string) =>
  apiPost<Me>('/api/auth/login', { username, password });
export const logout = () => apiPost<{ ok: true }>('/api/auth/logout');
export const getMe = () => apiGet<Me>('/api/auth/me');

// ── Ingestion ──────────────────────────────────────────────────────────────
export const ingestNote = (title: string, content: string) =>
  apiPost<SourceSummary>('/api/ingest/note', { title, content });
export const ingestUrl = (url: string) => apiPost<SourceSummary>('/api/ingest/url', { url });
export async function ingestFile(file: File): Promise<SourceSummary> {
  const form = new FormData();
  form.append('file', file);
  return handle<SourceSummary>(
    await fetch('/api/ingest/file', { method: 'POST', credentials: 'include', body: form }),
  );
}

// ── Sources ────────────────────────────────────────────────────────────────
export const listSources = (limit = 50, offset = 0) =>
  apiGet<Paginated<SourceSummary>>(`/api/sources?limit=${limit}&offset=${offset}`);
export interface SourceDetail extends SourceSummary {
  metadata: Record<string, unknown>;
  chunkCount: number;
  preview: string | null;
  tags: string[];
}
export const getSource = (id: string) => apiGet<SourceDetail>(`/api/sources/${id}`);
export const deleteSource = (id: string) => apiDelete<{ ok: true }>(`/api/sources/${id}`);

// ── Search ───────────────────────────────────────────────────────────────
export const search = (query: string, k?: number) =>
  apiPost<{ query: string; hits: SearchHit[] }>('/api/search', { query, k });

// ── Chat ─────────────────────────────────────────────────────────────────
export interface ChatSessionRow {
  id: string;
  title: string;
  createdAt: string;
}
export interface ChatMessageRow {
  id: string;
  role: string;
  content: string;
  citations: import('@abiros/shared').Citation[];
  createdAt: string;
}
export const createSession = (title?: string) =>
  apiPost<ChatSessionRow>('/api/chat/sessions', title ? { title } : {});
export const listSessions = () => apiGet<ChatSessionRow[]>('/api/chat/sessions');
export const getSessionDetail = (id: string) =>
  apiGet<{ session: ChatSessionRow; messages: ChatMessageRow[] }>(`/api/chat/sessions/${id}`);

/** POST a message and consume the SSE stream, invoking onEvent per event. */
export async function streamChat(
  sessionId: string,
  content: string,
  onEvent: (e: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ content }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new ApiRequestError(res.status, 'STREAM', 'Failed to start chat stream');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      const dataLine = part.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      const json = dataLine.slice(5).trim();
      if (json) onEvent(JSON.parse(json) as ChatStreamEvent);
    }
  }
}

// ── Tags ───────────────────────────────────────────────────────────────────
export const listTags = () => apiGet<{ tags: { name: string; count: number }[] }>('/api/tags');

// ── Projects ─────────────────────────────────────────────────────────────────
export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  architecture: string | null;
  apiNotes: string | null;
  decisions: string | null;
}
export const listProjects = () => apiGet<{ projects: ProjectRow[] }>('/api/projects');
export const createProject = (body: { name: string; description?: string }) =>
  apiPost<ProjectRow>('/api/projects', body);
export const linkSource = (sourceId: string, projectId: string | null) =>
  apiPost<{ ok: true }>('/api/projects/link', { sourceId, projectId });

// ── Developer (GitHub) ───────────────────────────────────────────────────────
export interface RepoRow {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string | null;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  stars: number;
  pushedAt: string | null;
}
export interface CodeHit {
  kind: 'commit' | 'repo';
  title: string;
  detail: string;
  url: string | null;
  date: string | null;
}
export interface CareerInsights {
  repoCount: number;
  commitCount: number;
  starCount: number;
  languages: { name: string; bytes: number; share: number }[];
  commitsByMonth: { month: string; count: number }[];
}
export const syncGithub = () =>
  apiPost<{ login: string; repos: number; commits: number }>('/api/developer/github/sync');
export const listRepos = () => apiGet<{ repos: RepoRow[] }>('/api/developer/repos');
export const searchCode = (query: string) =>
  apiPost<{ query: string; hits: CodeHit[] }>('/api/developer/code/search', { query });
export const getAnalyzer = () => apiGet<CareerInsights>('/api/developer/analyzer');

// ── Learning ─────────────────────────────────────────────────────────────────
export type Rating = 'again' | 'hard' | 'good' | 'easy';
export interface FlashcardRow {
  id: string;
  sourceId: string | null;
  front: string;
  back: string;
  dueAt: string;
  reps: number;
}
export interface SummaryRow {
  sourceId: string;
  text: string;
  keyPoints: string[];
}
export interface QuizRow {
  id: string;
  title: string;
  sourceId: string | null;
  createdAt: string;
}
export interface QuizQuestionPublic {
  id: string;
  ord: number;
  question: string;
  options: string[];
}
export interface AttemptResult {
  score: number;
  total: number;
  results: { correct: boolean; chosen: number; answerIndex: number; explanation: string | null }[];
}
export interface Gap {
  sourceId: string;
  title: string;
  cards: number;
  avgEase: number;
  lapses: number;
  overdue: number;
}

export const summarizeSource = (sourceId: string) =>
  apiPost<SummaryRow>('/api/learning/summary', { sourceId });
export const generateFlashcards = (sourceId: string, n?: number) =>
  apiPost<{ created: number }>('/api/learning/flashcards/generate', { sourceId, n });
export const getDueFlashcards = () =>
  apiGet<{ count: number; cards: FlashcardRow[] }>('/api/learning/flashcards/due');
export const reviewFlashcard = (id: string, rating: Rating) =>
  apiPost<FlashcardRow>(`/api/learning/flashcards/${id}/review`, { rating });
export const generateQuiz = (sourceId: string, n?: number) =>
  apiPost<QuizRow>('/api/learning/quiz/generate', { sourceId, n });
export const listQuizzes = () => apiGet<{ quizzes: QuizRow[] }>('/api/learning/quiz');
export const getQuiz = (id: string) =>
  apiGet<{ quiz: QuizRow; questions: QuizQuestionPublic[] }>(`/api/learning/quiz/${id}`);
export const attemptQuiz = (id: string, answers: number[]) =>
  apiPost<AttemptResult>(`/api/learning/quiz/${id}/attempt`, { answers });
export const getGaps = () => apiGet<{ gaps: Gap[] }>('/api/learning/gaps');

// ── Knowledge graph ──────────────────────────────────────────────────────────
export interface GraphData {
  nodes: { id: string; name: string; type: string; mentions: number }[];
  edges: { source: string; target: string; type: string; weight: number }[];
}
export const getGraph = () => apiGet<GraphData>('/api/knowledge/graph');
export const buildGraph = () =>
  apiPost<{ sources: number; entities: number; relations: number }>('/api/knowledge/extract-all');

// ── Planner ──────────────────────────────────────────────────────────────────
export interface CalEvent {
  id: string;
  title: string;
  location: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  source: string;
}
export interface PlanItem {
  id: string;
  title: string;
  detail: string | null;
  startTime: string | null;
  endTime: string | null;
  kind: string;
  done: boolean;
}
export interface GoalRow {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
}
export interface GoalDetail extends GoalRow {
  steps: { id: string; title: string; done: boolean }[];
  snapshots: { probability: number; rationale: string | null; capturedAt: string }[];
}
export interface CourseRow {
  id: string;
  name: string;
  code: string | null;
  term: string | null;
}
export interface AssignmentRow {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  dueAt: string | null;
  status: string;
}
export interface ExamRow {
  id: string;
  courseName: string;
  title: string;
  examAt: string | null;
  location: string | null;
}
export interface TimetableRow {
  id: string;
  courseName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string | null;
}

// calendar + daily plan
export const getCalendar = () => apiGet<{ events: CalEvent[] }>('/api/planner/calendar');
export const createEvent = (body: { title: string; startAt: string; endAt?: string; location?: string }) =>
  apiPost<CalEvent>('/api/planner/calendar', body);
export const importIcs = (ics: string) =>
  apiPost<{ parsed: number; imported: number }>('/api/planner/calendar/import', { ics });
export const getToday = (date?: string) =>
  apiGet<{ date: string; items: PlanItem[] }>(`/api/planner/today${date ? `?date=${date}` : ''}`);
export const generatePlan = (date?: string) =>
  apiPost<{ date: string; items: PlanItem[] }>('/api/planner/today/generate', date ? { date } : {});
export const addPlanTask = (date: string, title: string) =>
  apiPost<PlanItem>('/api/planner/today/task', { date, title });
export const togglePlanItem = (id: string, done: boolean) =>
  apiPost<{ ok: true }>(`/api/planner/plan/${id}/toggle`, { done });

// goals
export const getGoals = () => apiGet<{ goals: GoalRow[] }>('/api/planner/goals');
export const createGoal = (body: { title: string; description?: string; targetDate?: string }) =>
  apiPost<GoalRow>('/api/planner/goals', body);
export const getGoalDetail = (id: string) => apiGet<GoalDetail>(`/api/planner/goals/${id}`);
export const deleteGoal = (id: string) => apiDelete<{ ok: true }>(`/api/planner/goals/${id}`);
export const toggleStep = (id: string, done: boolean) =>
  apiPost<{ ok: true }>(`/api/planner/goals/steps/${id}/toggle`, { done });
export const simulateGoal = (id: string) =>
  apiPost<{ probability: number; rationale: string }>(`/api/planner/goals/${id}/simulate`);

// university
export const getCourses = () => apiGet<{ courses: CourseRow[] }>('/api/planner/courses');
export const createCourse = (body: { name: string; code?: string; term?: string }) =>
  apiPost<CourseRow>('/api/planner/courses', body);
export const getAssignments = () => apiGet<{ assignments: AssignmentRow[] }>('/api/planner/assignments');
export const createAssignment = (body: { courseId: string; title: string; dueAt?: string }) =>
  apiPost<AssignmentRow>('/api/planner/assignments', body);
export const toggleAssignment = (id: string, status: 'todo' | 'done') =>
  apiPost<{ ok: true }>(`/api/planner/assignments/${id}/toggle`, { status });
export const getExams = () => apiGet<{ exams: ExamRow[] }>('/api/planner/exams');
export const createExam = (body: { courseId: string; title: string; examAt?: string }) =>
  apiPost<ExamRow>('/api/planner/exams', body);
export const getTimetable = () => apiGet<{ slots: TimetableRow[] }>('/api/planner/timetable');
export const generateExamPlan = () =>
  apiPost<{ sessions: { when: string; course?: string; focus: string }[] }>('/api/planner/exam-plan/generate');

// ── Life ─────────────────────────────────────────────────────────────────────
export interface MetricRow {
  id: string;
  name: string;
  unit: string | null;
  points: number;
  last_value: number | null;
  last_at: string | null;
}
export interface MetricAnalytics {
  metric: { id: string; name: string; unit: string | null };
  points: { value: number; recordedAt: string }[];
  stats: { average: number; smoothed: number[]; count: number };
  forecast: number[];
}
export interface ExpenseRow {
  id: string;
  spentOn: string;
  amount: number;
  category: string | null;
  merchant: string | null;
}
export interface CategorySummary {
  category: string;
  total: number;
  count: number;
}
export interface ExpenseInsights {
  totalSpend: number;
  monthly: { month: string; total: number }[];
  forecastNextMonth: number;
  categories: CategorySummary[];
  recurring: { merchant: string; amount: number; count: number; cadence: string }[];
  unusual: { id: string; merchant: string | null; amount: number; spentOn: string }[];
}
export interface TimelineEvent {
  at: string;
  type: string;
  title: string;
  detail: string | null;
}
export interface JournalRow {
  id: string;
  entryOn: string;
  title: string | null;
  content: string;
  mood: number | null;
}
export interface DatasetRow {
  date: string;
  commits: number;
  spend: number;
  sources_added: number;
  cards_reviewed: number;
  journal_entries: number;
}

// metrics
export const getMetrics = () => apiGet<{ metrics: MetricRow[] }>('/api/life/metrics');
export const createMetric = (name: string, unit?: string) =>
  apiPost<MetricRow>('/api/life/metrics', { name, unit });
export const addMetricPoint = (id: string, value: number, note?: string) =>
  apiPost('/api/life/metrics/' + id + '/points', { value, note });
export const getMetric = (id: string) => apiGet<MetricAnalytics>(`/api/life/metrics/${id}`);

// expenses
export const getExpenses = () =>
  apiGet<{ expenses: ExpenseRow[]; categories: CategorySummary[] }>('/api/life/expenses');
export const addExpense = (body: { spentOn: string; amount: number; merchant?: string; category?: string }) =>
  apiPost<ExpenseRow>('/api/life/expenses', body);
export const importExpensesCsv = (csv: string) =>
  apiPost<{ imported: number; skipped: number }>('/api/life/expenses/import', { csv });
export const getExpenseInsights = () => apiGet<ExpenseInsights>('/api/life/expenses/insights');

// journal + timeline
export const getJournal = () => apiGet<{ entries: JournalRow[] }>('/api/life/journal');
export const addJournal = (body: { entryOn: string; content: string; title?: string; mood?: number }) =>
  apiPost<JournalRow>('/api/life/journal', body);
export const getTimeline = (q?: string) =>
  apiGet<{ events: TimelineEvent[] }>(`/api/life/timeline${q ? `?q=${encodeURIComponent(q)}` : ''}`);

// dataset
export const getDataset = () => apiGet<{ rows: DatasetRow[] }>('/api/life/dataset');
export const DATASET_CSV_URL = '/api/life/dataset?format=csv';

// ── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardSummary {
  dueFlashcards: number;
  planToday: { count: number; items: { id: string; title: string; done: boolean }[] };
  recentSources: SourceSummary[];
  totalSources: number;
  commits30d: number;
  spendThisMonth: number;
  goals: { total: number; active: number };
}
export const getDashboard = () => apiGet<DashboardSummary>('/api/dashboard/summary');

// ── Settings ─────────────────────────────────────────────────────────────────
export interface AppSettings {
  providers: { llm: string; embedding: string; chatModel: string; embedModel: string; ollamaBaseUrl: string };
  integrations: { github: boolean };
  allModules: string[];
  enabledModules: string[];
}
export const getSettings = () => apiGet<AppSettings>('/api/settings');
export const getUsage = () => apiGet<{ usage: { table: string; rows: number }[] }>('/api/settings/usage');
export const setEnabledModules = (modules: string[]) =>
  apiPost<{ enabledModules: string[] }>('/api/settings/enabled-modules', { modules });
export const purgeData = () => apiPost<{ ok: true }>('/api/settings/purge', { confirm: 'DELETE' });

// ── Developer: Interview / Resume / Time Machine ─────────────────────────────
export interface InterviewTurn {
  id: string;
  ord: number;
  question: string;
  answer: string | null;
  scores: Record<string, number>;
  feedback: string | null;
}
export const startInterview = (topic: string) =>
  apiPost<{ sessionId: string; topic: string; question: string }>('/api/developer/interview/start', { topic });
export const answerInterview = (id: string, answer: string) =>
  apiPost<{ scores: Record<string, number>; feedback: string; nextQuestion: string }>(
    `/api/developer/interview/${id}/answer`,
    { answer },
  );

export interface ResumeVersionRow {
  id: string;
  label: string;
  createdAt: string;
}
export const generateResume = () => apiPost<{ id: string; content: string }>('/api/developer/resume/generate');
export const tailorResume = (id: string, jobDescription: string) =>
  apiPost<{ id: string; content: string }>(`/api/developer/resume/${id}/tailor`, { jobDescription });
export const listResumes = () => apiGet<{ versions: ResumeVersionRow[] }>('/api/developer/resume');
export const getResume = (id: string) =>
  apiGet<{ id: string; label: string; content: string }>(`/api/developer/resume/${id}`);

export interface TimeMachineData {
  cumulative: { month: string; total: number }[];
  milestones: { date: string; title: string; detail: string | null }[];
}
export const getTimeMachine = () => apiGet<TimeMachineData>('/api/developer/time-machine');
