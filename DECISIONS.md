# Decisions Log

Deviations from the master spec and notable architectural choices, with reasons.
Append-only; newest at top.

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
