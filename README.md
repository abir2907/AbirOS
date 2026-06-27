# AbirOS

A personal **AI operating system for my digital life** — one shared knowledge base
about everything I do, with modules that read and write to it, fronted by an AI
Command Center that can answer questions and run workflows across all of them.

Single-user, self-hosted, and **$0 to run**: local AI via Ollama, vectors in
Postgres via `pgvector`, files on local disk. The only cloud piece is Neon's free
Postgres tier (swappable for local Postgres by changing one connection string).

> **Status: Phase 6 complete — AbirOS is feature-complete.** Phase 6 added the
> **Interview Coach** (text + optional voice, scored answers), **Resume Evolution**
> (auto-build from GitHub + tailor to a job description), the **Developer Time
> Machine** (replay your growth), a real aggregated **Dashboard**, and the
> **Settings** module (providers, DB usage, enabled modules, export, danger zone).
>
> 📖 **New here? Read the [User Guide](USER_GUIDE.md)** — a full manual for every module.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo, TypeScript (strict) |
| Backend | Node 20, Express 4, Drizzle ORM, `pg`, pg-boss, zod, pino |
| Database | **Neon** serverless Postgres (free tier) + `pgvector` (HNSW, cosine) |
| AI | **Ollama** (local) — `nomic-embed-text` embeddings + `qwen2.5:7b-instruct` chat, behind a provider interface |
| Frontend | React 18 + Vite, Tailwind + shadcn/ui, TanStack Query, Zustand, React Router |
| Search | Hybrid: Postgres full-text (`tsvector`) + pgvector, fused with RRF |

## Repository layout

```
abiros/
├─ packages/
│  ├─ shared/   # zod schemas, types, the module registry, constants
│  ├─ db/       # Drizzle client (pooled URL) + drizzle config (direct URL) + enable-vector
│  └─ ai/       # provider interfaces + Ollama/OpenAI/Anthropic impls + embed smoke test
└─ apps/
   ├─ api/      # Express: env, health, middleware, module route stubs, jobs
   └─ web/      # React shell: sidebar, topbar, ⌘K palette, a page per module
```

---

## Prerequisites

- **Node 20+** and **pnpm 9+** (`corepack enable pnpm`)
- **Ollama** — [install natively on Windows](https://ollama.com/download) *or* run via Docker (`docker compose up -d ollama`)
- A free **Neon** project (below). Docker Desktop is optional (only for the Ollama/pgAdmin containers).

## Setup

### 1. Install dependencies

```bash
corepack enable pnpm
pnpm install
```

### 2. Create the env file

```bash
cp .env.example .env
```

### 3. Set up Neon (free Postgres + pgvector)

1. Create a free project at **https://neon.tech**.
2. In the dashboard's connection panel, copy **two** connection strings:
   - the **Pooled** string (host contains `-pooler`) → `DATABASE_URL`
   - the **Direct** string (no `-pooler`) → `DIRECT_DATABASE_URL`
   - make sure each ends with `?sslmode=require`
3. Paste both into `.env`, then enable pgvector:

```bash
pnpm db:enable-vector
# ✓ pgvector is enabled (version 0.x.x).
```

> Why two strings? The app runs on the **pooled** connection; schema migrations
> and the extension setup use the **direct** connection (the pooler mishandles
> advisory locks). Neon autosuspends when idle — expect a ~1s cold start on the
> first query, and treat AbirOS as an app you launch, not a 24/7 service.

### 4. Pull the Ollama models

```bash
ollama pull nomic-embed-text       # 768-dim embeddings
ollama pull qwen2.5:7b-instruct    # chat/reasoning (~5 GB, Q4)
```

Then verify the AI layer end to end:

```bash
pnpm ai:smoke
# → Embedding "hello" via "ollama" (model: nomic-embed-text)…
# ✓ Got a 768-dim vector. ...
# ✓ Embedding smoke test passed.
```

### 5. Create your login password (used in Phase 1)

```bash
pnpm setup:password
# paste the printed AUTH_PASSWORD_HASH=... line into .env
```

---

## Run

```bash
pnpm dev          # starts the API (:4000) and the web app (:5173) together
```

Open **http://localhost:5173**. You should see:

- the **AbirOS dashboard** with a live **System status** card (Database + Ollama
  checks turn green once Neon and Ollama are configured);
- a collapsible **sidebar** listing every module, and a **⌘K / Ctrl-K** command
  palette to jump between them;
- each module route (Chat, Search, Knowledge, Learning, Planner, Developer, Life,
  Settings) renders an **empty state** describing what arrives in its phase.

Health check directly: **http://localhost:4000/health**

```jsonc
{ "status": "ok", "checks": { "db": { "ok": true }, "ollama": { "ok": true } } }
```

---

## Phase 1 — first run

After `.env` is filled in (Neon + Ollama) and models are pulled:

```bash
pnpm db:migrate        # create all tables, pgvector, HNSW + full-text indexes
pnpm setup:password    # paste AUTH_PASSWORD_HASH into .env
pnpm db:seed           # optional: 3 sample notes so search/chat work immediately
pnpm dev               # API :4000 + web :5173
```

Then at **http://localhost:5173**:

1. **Sign in** with `AUTH_USERNAME` and the password you set.
2. **Knowledge** → add a note, a web-page URL, or a PDF. Watch the status chip go
   `pending → processing → ready` (it polls automatically).
3. **Search** → type a query; results are hybrid (semantic + keyword) with source chips.
4. **Command Center** (or ⌘/Ctrl-K → "Ask the AI") → ask a question; the answer
   streams in and shows **citation chips** for the sources it used.

**How to test this phase**

```bash
pnpm test        # chunker, RRF fusion, and auth-flow tests (no DB/Ollama needed)
```

Manual end-to-end: sign in → ingest the sample seed (or your own note) → search a
word from it → ask the Command Center about it → confirm the answer cites the note.

## Phase 2 — what's new

After `pnpm db:migrate` applies the new tables, two areas light up:

**Knowledge** now also accepts **screenshots/images** (OCR'd locally with
tesseract.js), **archives** the raw HTML of web pages, **auto-tags** each source
with the LLM, and supports **project memory** (create a project, assign sources).

**Developer** — connect GitHub to index your code history:
1. Create a token at *GitHub → Settings → Developer settings → Personal access
   tokens (classic)* with scopes **`repo`** and **`read:user`**.
2. Put it in `.env` as `GITHUB_TOKEN=...` and restart `pnpm dev`.
3. Open **Developer → Sync GitHub**. Then:
   - **Code Historian** — search every commit message + repo ("find auth", "migration").
   - **Career Analyzer** — language mix (by bytes) and commits-over-time charts.

The Command Center also gains `search_code` and `get_github_activity` agent tools.

## Phase 3 — what's new

After `pnpm db:migrate` adds the Learning tables, the **Learning** module (needs
Ollama for generation) offers five tabs:

- **Review** — spaced-repetition flashcards (SM-2). Show the answer, rate
  Again/Hard/Good/Easy; the scheduler sets the next due date.
- **Study tools** — pick any ready source → generate a **summary**, **flashcards**,
  or a **quiz** from it.
- **Quizzes** — take a generated multiple-choice quiz; it's graded server-side
  with per-question explanations.
- **Knowledge map** — click **Build map** to extract entities/relations from your
  sources, then explore the force-directed graph.
- **Gaps** — topics ranked by how much you're forgetting (lapses + overdue cards).

New agent tools: `get_due_flashcards`, `create_study_plan`.

## Phase 4 — what's new

After `pnpm db:migrate` adds the Planner tables, the **Planner** module has three tabs:

- **Today** — see your day's plan; **Generate plan** builds a time-blocked schedule
  (needs Ollama) from your calendar, upcoming assignments, and goal steps. Quick-add
  tasks; tick items off. Sidebar shows upcoming events and **imports `.ics`** (paste
  an export from Google/Apple Calendar).
- **Goals** — add a goal with a target date, **Simulate** to get a success
  probability + an AI roadmap; re-simulate over time to chart your odds.
- **University** — add courses, assignments (with due dates that feed the planner),
  and exams; **Generate** an exam-prep study schedule.

New agent tools: `get_calendar`, `get_tasks`, `get_goals`.

## Phase 5 — what's new

After `pnpm db:migrate` adds the Life tables, the **Life** module has four tabs:

- **Analytics** — define any metric (sleep, gym, mood, coding minutes…), log values,
  and see a chart with a simple trend **forecast**.
- **Expenses** — add expenses or **import a CSV**; get a category breakdown, a
  next-month **forecast**, **detected subscriptions**, and **unusual charges**.
- **Life Replay** — one searchable **timeline** across notes, commits, expenses,
  journal entries, and calendar events; plus a quick journal box.
- **Dataset** — a daily-aggregated dataset of your activity, **downloadable as CSV**
  (or JSON) to train your own models.

New agent tools: `get_expenses`, `get_metrics`.

## Phase 6 — what's new (final)

After `pnpm db:migrate` adds the last tables:

- **Developer → Interview Coach** — practice by topic; answers are scored on
  relevance, confidence, and delivery (filler words), with feedback + a follow-up.
  Optional **voice input** (Web Speech API, Chrome).
- **Developer → Resume** — **generate** a resume from your GitHub activity, then
  **tailor** it to a pasted job description; every version is saved.
- **Developer → Time Machine** — replay your cumulative commit growth and project
  milestones over time.
- **Dashboard** — now a real cross-module summary (due cards, today's plan, recent
  ingests, commits/30d, spend this month, goals) on top of system status.
- **Settings** — AI provider info, GitHub connection status, **DB usage** row
  counts (watch the Neon free tier), enable/disable modules, data export, and a
  **danger zone** to purge all content.

📖 See the full **[User Guide](USER_GUIDE.md)** for how to use every module.

## Extension — Stage A: the "Me" core

Run `pnpm db:migrate` to apply the new tables, then:

- A new **Me** module: your **Profile** (bio, personality, values, how the AI should
  talk to you), an **Interests** board (likes/dislikes by category), and
  **Accomplishments** (which are also embedded into the knowledge base, so they're
  searchable).
- These compile into a budgeted **"About Me"** block injected into the Command
  Center every turn — so it genuinely knows you. Try: *"what do you know about me?"*
- **Goals** now have a **horizon** (short-term / long-term / life) — set it in
  **Planner → Goals**; the assistant can filter by it.
- A **study backlog** in **Learning → Backlog** (want-to-study / studying / studied)
  with a **Suggest next** recommender that blends your backlog, weak topics, due
  cards, and goals. Try: *"what should I study next?"*

New agent tools: `get_profile`, `get_interests`, `get_accomplishments`,
`get_study_backlog`, `suggest_next_study` (and `get_goals` now filters by horizon).

## Extension — Stage B: Interests & collections

Run `pnpm db:migrate`, then a new **Collections** module (sidebar) has four tabs:

- **Music** — **import your YouTube history from Google Takeout** (offline, free):
  *takeout.google.com → YouTube and YouTube Music → `history/watch-history.json`* →
  upload that file. AbirOS extracts music (it reads "Artist - Topic" channels and
  official videos), then writes an LLM **taste summary** that feeds your self-model.
- **Books** — a shelf (want-to-read / reading / read) with a **Recommend** button
  (uses your interests + goals). Finished books appear in **Life Replay**.
- **Sports** — the sports, teams, and athletes you follow.
- **Travel** — a wishlist on a free **OpenStreetMap** map (add lat/lng to pin a
  place) and a **Plan a trip** itinerary drafter. Trips appear in Life Replay.

New agent tools: `get_music_taste`, `get_books`, `recommend_book`,
`get_sports_interests`, `get_places`, `plan_trip`. Try: *"plan a weekend from my
travel wishlist"* or *"recommend me a book"*.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run API + web together (Turborepo) |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type-check everything |
| `pnpm test` | Run unit/integration tests (Vitest) |
| `pnpm lint` / `pnpm format` | Lint / Prettier-format |
| `pnpm setup:password` | Generate a bcrypt hash for the single account |
| `pnpm db:enable-vector` | Enable `pgvector` on Neon (direct connection) |
| `pnpm db:migrate` | Apply SQL migrations (creates all tables + indexes) |
| `pnpm db:seed` | Insert sample notes (needs a migrated DB + Ollama) |
| `pnpm db:studio` | Browse the database with Drizzle Studio |
| `pnpm ai:smoke` | Embed "hello" through the configured provider |

## Build phases

Built incrementally; each phase ships fully and runnable before the next starts.

0. **Scaffold** — monorepo, provider interfaces, Express boot, web shell. ✅
1. **Foundation** — auth, ingestion pipeline (note/PDF/URL), hybrid search, AI Command Center. ✅
2. **Second Brain + Developer** — screenshots/OCR, web archive, auto-tagging, project memory, GitHub sync, Code Historian, Career Analyzer. ✅
3. **Learning** — summaries, flashcards (SM-2), quizzes, knowledge-map, gap detection. ✅
4. **Planner** — daily plan (.ics import), goal simulator, university companion. ✅
5. **Life** — metrics analytics, expense detective, life replay timeline, dataset export. ✅
6. **Polish & advanced** — interview coach (+voice), resume evolution, time machine, dashboard, settings. ✅ **(feature-complete)**

See `DECISIONS.md` for deviations from the spec and why.

## Troubleshooting

- **`pnpm install` fails with `Cannot find matching keyid` (corepack).** The corepack
  bundled with Node 20.14 ships rotated signing keys. Either update it
  (`npm i -g corepack@latest`) or pin the version explicitly:
  `COREPACK_DEFAULT_TO_LATEST=0 corepack pnpm@9.12.0 install`.
- **Dashboard shows DB/Ollama as amber.** That's expected until you finish setup —
  configure Neon (`DATABASE_URL` + `pnpm db:enable-vector`) and start Ollama
  (`ollama pull nomic-embed-text`). The page auto-refreshes every 15s.

## Notes on cost & privacy

Everything runs locally for free. Your files never leave your machine (local
storage driver); only text, chunks, embeddings, and metadata go to Neon. Nothing
is sent to a hosted AI provider unless you explicitly set one in `.env`.
