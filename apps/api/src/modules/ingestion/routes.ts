import { Router, type Router as RouterType } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.js';
import { HttpError } from '../../lib/errors.js';
import { ingestNoteSchema, ingestUrlSchema } from './schemas.js';
import { ingestNote, ingestUrl, ingestFile } from './service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

export const ingestionRouter: RouterType = Router();
ingestionRouter.use(requireAuth);

ingestionRouter.post('/note', async (req, res, next) => {
  try {
    const input = ingestNoteSchema.parse(req.body);
    res.status(202).json(await ingestNote(input));
  } catch (err) {
    next(err);
  }
});

ingestionRouter.post('/url', async (req, res, next) => {
  try {
    const input = ingestUrlSchema.parse(req.body);
    res.status(202).json(await ingestUrl(input));
  } catch (err) {
    next(err);
  }
});

ingestionRouter.post('/file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw HttpError.validation('No file uploaded (field name must be "file").');
    res.status(202).json(await ingestFile(req.file));
  } catch (err) {
    next(err);
  }
});
