import { Router } from 'express'
import type { SessionStore } from '../SessionStore.js'
import type { SseManager } from '../SseManager.js'
import type { PatchValidator } from '../PatchValidator.js'

export function createPatchesRouter(
  sessionStore: SessionStore,
  sseManager: SseManager,
  patchValidator: PatchValidator,
) {
  const router = Router()

  router.post('/patches', (req, res) => {
    const { sessionId, key, instanceId, patch, source } = req.body

    if (!sessionId || !key || !instanceId || !patch) {
      res.status(400).json({ error: 'sessionId, key, instanceId, and patch are required' })
      return
    }

    if (!sessionStore.hasSession(sessionId)) {
      res.status(404).json({ error: `Session '${sessionId}' not found` })
      return
    }

    const validation = patchValidator.validate(key, patch)
    if (!validation.valid) {
      res.status(422).json({ error: 'Patch validation failed', errors: validation.errors })
      return
    }

    sessionStore.applyPatch(sessionId, instanceId, patch)

    sseManager.send(sessionId, {
      type: 'patch',
      key,
      instanceId,
      patch,
    })

    res.json({ applied: true, source: source ?? 'direct' })
  })

  return router
}
