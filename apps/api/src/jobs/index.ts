/**
 * Background jobs (pg-boss) live here.
 *
 * Phase 0: not started. Phase 1 introduces the pg-boss supervisor for the
 * ingestion pipeline (extract → chunk → embed → enrich). Per the Neon notes,
 * the supervisor only runs while the API is up and uses generous polling
 * intervals to conserve Neon compute hours.
 */
export async function startJobs(): Promise<void> {
  // no-op until Phase 1
}

export async function stopJobs(): Promise<void> {
  // no-op until Phase 1
}
