import { Router } from 'express'
import type { SessionStore } from '../SessionStore.js'

export function createSessionsRouter(sessionStore: SessionStore) {
  const router = Router()

  router.post('/sessions', (_req, res) => {
    const sessionId = sessionStore.createSession()
    res.status(201).json({ sessionId })
  })

  router.post('/sessions/:sid/instances', (req, res) => {
    const { sid } = req.params
    const { key, instanceId, contextHints, currentProps } = req.body

    if (!key || !instanceId) {
      res.status(400).json({ error: 'key and instanceId are required' })
      return
    }

    if (!sessionStore.hasSession(sid)) {
      res.status(404).json({ error: `Session '${sid}' not found` })
      return
    }

    sessionStore.registerInstance(sid, { key, instanceId, contextHints, currentProps })
    res.status(204).send()
  })

  return router
}
