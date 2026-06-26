import { makeStubRouter } from '../_stub.js';

// Phase 1: hybrid retrieval (pgvector + full-text fused with RRF).
export const searchRouter = makeStubRouter('search', 1);
