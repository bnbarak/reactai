import { Router } from 'express';
import type { SessionStore } from '../SessionStore.js';

export function createSessionsRouter(sessionStore: SessionStore) {
  const router = Router();

  router.post('/sessions', (_req, res) => {
    const sessionId = sessionStore.createSession();
    res.status(201).json({ sessionId });
  });

  return router;
}
