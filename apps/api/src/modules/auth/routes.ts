import { makeStubRouter } from '../_stub.js';

// Phase 1: login / logout / me with JWT httpOnly cookie + bcrypt.
export const authRouter = makeStubRouter('auth', 1);
