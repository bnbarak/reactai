import { Router } from 'express'
import type { SessionStore } from '../SessionStore.js'
import type { SseManager } from '../SseManager.js'

export function createSseRouter(sessionStore: SessionStore, sseManager: SseManager) {
  const router = Router()

  router.get('/sse/:sessionId', (req, res) => {
    const { sessionId } = req.params

    if (!sessionStore.hasSession(sessionId)) {
      res.status(404).json({ error: `Session '${sessionId}' not found` })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    sseManager.addClient(sessionId, res)

    req.on('close', () => {
      sseManager.removeClient(sessionId, res)
    })
  })

  return router
}
