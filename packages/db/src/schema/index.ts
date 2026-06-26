/**
 * Drizzle schema barrel. The Drizzle client and drizzle.config.ts both point
 * here. The actual DDL (extension, generated tsvector column, HNSW + GIN
 * indexes) is applied by the hand-written SQL migration in ./migrations, run by
 * the custom migrator (`pnpm db:migrate`) — see DECISIONS.md.
 */
export * from './_shared.js';
export * from './knowledge.js';
export * from './graph.js';
export * from './app.js';
