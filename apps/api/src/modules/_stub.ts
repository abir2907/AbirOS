import { Router } from 'express';

/**
 * Phase 0 placeholder router. Each feature module gets its own folder now so the
 * architecture is locked; real `routes.ts` / `service.ts` / `repo.ts` /
 * `schemas.ts` files replace this in the module's assigned phase. The stub
 * answers GET `/api/<module>` with its scaffolding status.
 */
export function makeStubRouter(moduleId: string, phase: number): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json({ module: moduleId, phase, status: 'scaffolded' });
  });
  return router;
}
