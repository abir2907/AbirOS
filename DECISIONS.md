# Decisions Log

Deviations from the master spec and notable architectural choices, with reasons.
Append-only; newest at top.

## Phase 4

- **"Scheduling" is on-demand generation, not recurring background jobs.** Daily
  plans, goal simulations, and exam-prep schedules are generated when the user
  asks. This keeps to the launch-when-used model and conserves Neon compute (no
  constant pg-boss polling). True recurring automation (cron) can be added later
  with pg-boss / node-cron if a real need appears.

- **Minimal hand-written `.ics` parser** (no dependency) — unfolds folded lines
  and reads SUMMARY/DTSTART/DTEND/LOCATION/UID/VALUE=DATE. Covers personal
  calendar exports; a full ical library can replace it if edge cases bite.
  Imported events dedupe by UID.

- **Lectures folded into timetable/calendar.** The spec lists a `lecture` table;
  for now lectures are represented as recurring `timetable_slot`s or calendar
  events rather than a separate table. Easy to split out later.

- **Goal roadmap is seeded on first simulate** — if a goal has no steps, the
  simulator's suggested steps become its roadmap; subsequent simulates only add a
  probability snapshot (charted over time).

## Phase 3

- **Knowledge map renders with `d3-force` + plain SVG**, not a heavy graph library
  (react-force-graph / cytoscape). The layout is computed client-side (300 ticks,
  deterministic) and drawn as SVG — smaller, dependency-light, and reliable with
  Vite. A richer interactive lib can be swapped in later if needed.

- **Quiz answers are withheld from the client.** `GET /quiz/:id` returns questions
  without `answerIndex`; grading happens server-side in `POST /quiz/:id/attempt`,
  so the correct answers can't be peeked from the network tab.

- **SM-2 lives as a pure function** in `@abiros/ai` (`schedule()`), unit-tested.
  Rating→quality mapping: again=1, hard=3, good=4, easy=5; ease floor 1.3.

- **Learning generation (summaries/flashcards/quizzes) and graph extraction are
  on-demand**, not part of ingestion — they cost LLM calls, so the user triggers
  them per source. `extract-all` is bounded to 25 sources per run.

- **Entities upsert by select-then-insert** on `normalized_name` (no unique
  constraint added) — fine for a single-user app with no write concurrency.

## Phase 2

- **Code Historian uses full-text search, not embeddings.** Commit messages + repo
  metadata get a generated `tsvector` and are searched with Postgres full-text —
  not embedded. Embedding thousands of commits would blow the Neon free-tier
  storage budget (the spec's own warning). Hybrid/embedding code search can be
  added later, opt-in, for selected repos.

- **`git_commit` table (not `commit`).** `commit` is a SQL keyword; the table is
  named `git_commit` and exported from Drizzle as `gitCommit`.

- **GitHub sync is bounded** — 50 repos (most recently pushed) × 100 commits each.
  Keeps within rate limits and storage; deeper history can be added on demand.

- **OCR runs in-process via tesseract.js** (pure JS/WASM, free, local). The `eng`
  trained-data downloads once on first use and is then cached. Uploaded images are
  ingested as `screenshot` sources through the same pipeline.

- **Web archive = raw HTML saved to local disk** during URL ingestion (keyed
  `html-<hash>`), so the page is preserved even if it later changes; only the
  extracted text + embeddings go to Neon.

- **`source.project_id` FK is declared in SQL only**, not in the Drizzle table
  helper, to avoid a schema import cycle (project ↔ source). Drizzle still has the
  plain `projectId` column for queries.

## Phase 1

- **Hand-written SQL migrations + a tiny custom migrator (`pnpm db:migrate`)**
  instead of `drizzle-kit generate`. The DDL uses pgvector, an HNSW index, a
  `GENERATED` tsvector column, and GIN indexes — hand-written SQL applies these
  predictably, where drizzle-kit's generated SQL would need editing anyway.
  Drizzle is still the query builder and source of TS types; the SQL just has to
  stay in sync with the schema files (both live in `packages/db`).

- **In-process ingestion pipeline instead of pg-boss (for now).** The ingest
  endpoint creates a `pending` source, returns immediately, and a fire-and-forget
  in-process task runs extract → chunk → embed and updates `source.status` (the
  UI polls it). Rationale: pg-boss polls the DB continuously, which the spec's own
  Neon notes warn burns free-tier compute hours; an in-process runner is simpler,
  free, and fully testable. `job_run` still audits each run. pg-boss will be added
  when genuinely durable/scheduled jobs arrive (e.g. the Phase 4 daily planner).

- **Auth verifies against env, not the DB.** Per spec §11 the single account's
  bcrypt hash lives in `AUTH_PASSWORD_HASH`; `app_user` is reserved for profile
  data. No DB round-trip on login.

- **Chat orchestrator is retrieve-then-generate (robust RAG), not a native
  tool-call loop.** Small local models call tools unreliably, so the orchestrator
  always runs hybrid search first and streams a cited answer. The typed tool
  registry (`chat/tools.ts`: `search_knowledge`, `list_sources`, `get_source`)
  exists and is the basis for native multi-tool calling in later phases.

## Phase 0

- **`bcryptjs` instead of native `bcrypt`.** The spec names `bcrypt`. We use the
  pure-JS `bcryptjs` (drop-in API) to avoid native node-gyp compilation on
  Windows, which is brittle. Same hashes, no build toolchain required.

- **ESLint 8 (classic `.eslintrc.cjs`) instead of ESLint 9 flat config.** Chosen
  for "boring, well-supported" stability; `typescript-eslint` v8 still supports
  classic config. Can migrate to flat config later if desired.

- **ESM throughout** (`"type": "module"`, `moduleResolution: "Bundler"`). Dev runs
  via `tsx` (API) and Vite (web), both of which resolve workspace TS sources
  directly, so no pre-build step is needed for `pnpm dev`.

- **Workspace packages point `main`/`types` at `src/index.ts`.** Enables zero-build
  dev. A `tsc` `build` script exists per package for production/typecheck.

- **No local Postgres container.** Per spec, the database is Neon. `docker-compose.yml`
  only runs Ollama (+ optional pgAdmin). Ollama may alternatively be installed
  natively on Windows; the API only needs `OLLAMA_BASE_URL`.

- **`vector` extension enabled via a standalone script** (`pnpm db:enable-vector`)
  over the Neon *direct* connection, rather than a full Drizzle migration. The
  complete schema + Drizzle migrations land in Phase 1; Phase 0 only needs the
  extension present to satisfy the connectivity check.
