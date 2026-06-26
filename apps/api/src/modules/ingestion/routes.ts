import { makeStubRouter } from '../_stub.js';

// Phase 1: ingest file/url/note → extract → chunk → embed (pg-boss jobs).
export const ingestionRouter = makeStubRouter('ingestion', 1);
