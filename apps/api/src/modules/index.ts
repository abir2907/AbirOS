import { Router } from 'express';
import { authRouter } from './auth/routes.js';
import { ingestionRouter } from './ingestion/routes.js';
import { searchRouter } from './search/routes.js';
import { chatRouter } from './chat/routes.js';
import { sourcesRouter } from './sources/routes.js';
import { knowledgeRouter } from './knowledge/routes.js';
import { learningRouter } from './learning/routes.js';
import { plannerRouter } from './planner/routes.js';
import { developerRouter } from './developer/routes.js';
import { lifeRouter } from './life/routes.js';
import { dashboardRouter } from './dashboard/routes.js';
import { settingsRouter } from './settings/routes.js';

/**
 * Mounts every feature module under /api/<module>. In Phase 0 these are stubs;
 * each is replaced with real routes in its assigned phase WITHOUT changing this
 * wiring. Auth-protection (requireAuth) is applied per-module starting Phase 1.
 */
export function mountModules(): Router {
  const router = Router();
  router.use('/auth', authRouter);
  router.use('/ingest', ingestionRouter);
  router.use('/sources', sourcesRouter);
  router.use('/search', searchRouter);
  router.use('/chat', chatRouter);
  router.use('/knowledge', knowledgeRouter);
  router.use('/learning', learningRouter);
  router.use('/planner', plannerRouter);
  router.use('/developer', developerRouter);
  router.use('/life', lifeRouter);
  router.use('/dashboard', dashboardRouter);
  router.use('/settings', settingsRouter);
  return router;
}
