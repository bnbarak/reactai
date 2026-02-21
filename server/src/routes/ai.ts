import { Router } from 'express'
import type { SessionStore } from '../SessionStore.js'
import type { SseManager } from '../SseManager.js'
import type { AiSdkLike } from '../types.js'
import type { ComponentManifest, MountedInstance, JsonSchema } from '../../../core/src/types.js'

function deriveSchema(
  currentProps: Record<string, unknown>,
  aiWritableProps: string[],
  context?: Record<string, unknown>,
): JsonSchema {
  const properties: Record<string, { type: string; enum?: unknown[] }> = {}
  for (const key of aiWritableProps) {
    const val = currentProps[key]
    const type = typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string'
    const options = context?.[key]
    properties[key] = Array.isArray(options) ? { type, enum: options } : { type }
  }
  return { type: 'object', properties, additionalProperties: false, required: aiWritableProps }
}

export function createAiRouter(
  sdk: AiSdkLike,
  sessionStore: SessionStore,
  sseManager: SseManager,
  manifests: ComponentManifest[],
) {
  const router = Router()

  router.post('/ai/prompt', async (req, res) => {
    const { sessionId, prompt, snapshot, accessibilityTree, markers, currentUrl } = req.body

    if (!sessionId || !prompt || !snapshot) {
      res.status(400).json({ error: 'sessionId, prompt and snapshot are required' })
      return
    }

    if (!sessionStore.hasSession(sessionId)) {
      res.status(404).json({ error: `Session '${sessionId}' not found` })
      return
    }

    const hookManifests: ComponentManifest[] = (snapshot as MountedInstance[])
      .filter((i) => i.description && i.aiWritableProps)
      .map((i) => ({
        key: i.key,
        description: i.description!,
        filePath: '',
        aiWritableProps: i.aiWritableProps!,
        propsJsonSchema: deriveSchema(i.currentProps ?? {}, i.aiWritableProps!, i.context),
      }))

    const hookKeys = new Set(hookManifests.map((m) => m.key))
    const allManifests = [...manifests.filter((m) => !hookKeys.has(m.key)), ...hookManifests]

    let result
    try {
      result = await sdk.updateFromPrompt(prompt, allManifests, snapshot, accessibilityTree, markers, currentUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      res.json({ applied: false, target: null, patch: null, errors: [message], isDone: true })
      return
    }

    if (result.applied && result.target && result.patch) {
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
