import { Router } from 'express'
import type { SessionStore } from '../SessionStore.js'
import type { SseManager } from '../SseManager.js'
import type { ComponentManifest } from '../../../core/src/types.js'

export interface AiSdkLike {
  updateFromPrompt(
    prompt: string,
    manifests: ComponentManifest[],
    mountedSnapshot: Array<{ key: string; instanceId: string; currentProps?: Record<string, unknown> }>,
  ): Promise<{
    target: { key: string; instanceId: string } | null
    patch: Record<string, unknown> | null
    applied: boolean
    errors?: string[]
  }>
}

export function createAiRouter(
  sdk: AiSdkLike,
  sessionStore: SessionStore,
  sseManager: SseManager,
  manifests: ComponentManifest[],
) {
  const router = Router()

  router.post('/ai/prompt', async (req, res) => {
    const { sessionId, prompt } = req.body

    if (!sessionId || !prompt) {
      res.status(400).json({ error: 'sessionId and prompt are required' })
      return
    }

    if (!sessionStore.hasSession(sessionId)) {
      res.status(404).json({ error: `Session '${sessionId}' not found` })
      return
    }

    const mountedSnapshot = sessionStore.getInstances(sessionId)
    const result = await sdk.updateFromPrompt(prompt, manifests, mountedSnapshot)

    if (result.applied && result.target && result.patch) {
      sessionStore.applyPatch(sessionId, result.target.instanceId, result.patch)
      sseManager.send(sessionId, {
        type: 'patch',
        key: result.target.key,
        instanceId: result.target.instanceId,
        patch: result.patch,
      })
    }

    res.json(result)
  })

  return router
}
