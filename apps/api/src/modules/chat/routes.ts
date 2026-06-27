import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import type { ChatStreamEvent } from '@abiros/shared';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { createSessionSchema, postMessageSchema } from './schemas.js';
import * as repo from './repo.js';
import { streamAnswer } from './service.js';
import { WORKFLOW_LIST } from './workflows.js';

export const chatRouter: RouterType = Router();
chatRouter.use(requireAuth);

const idParam = z.object({ id: z.string().uuid() });

chatRouter.post('/sessions', async (req, res, next) => {
  try {
    const { title } = createSessionSchema.parse(req.body ?? {});
    res.status(201).json(await repo.createSession(title));
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/workflows', (_req, res) => {
  res.json({ workflows: WORKFLOW_LIST });
});

chatRouter.get('/sessions', async (_req, res, next) => {
  try {
    res.json(await repo.listSessions());
  } catch (err) {
    next(err);
  }
});

chatRouter.get('/sessions/:id', async (req, res, next) => {
  try {
    const { id } = idParam.parse(req.params);
    const data = await repo.getSession(id);
    if (!data) throw HttpError.notFound('Chat session not found');
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** Streams the assistant's answer as Server-Sent Events. */
chatRouter.post('/sessions/:id/messages', async (req, res, next) => {
  let started = false;
  try {
    const { id } = idParam.parse(req.params);
    const { content } = postMessageSchema.parse(req.body);
    const session = await repo.getSession(id);
    if (!session) throw HttpError.notFound('Chat session not found');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    started = true;

    const send = (event: ChatStreamEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    await streamAnswer(id, content, send);
    res.end();
  } catch (err) {
    if (started) {
      const message = err instanceof Error ? err.message : 'stream failed';
      res.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
      res.end();
    } else {
      next(err);
    }
  }
});
