import { readFileSync } from 'fs'
import express from 'express'
import { InMemorySessionStore } from './SessionStore.js'
import { SseManager } from './SseManager.js'
import { PatchValidator } from './PatchValidator.js'
import { createRegistryRouter } from './routes/registry.js'
import { createSessionsRouter } from './routes/sessions.js'
import { createPatchesRouter } from './routes/patches.js'
import { createSseRouter } from './routes/sse.js'
import { createAiRouter } from './routes/ai.js'
import type { ReactAiRouterOptions } from './types.js'
import type { ComponentManifest } from '../../core/src/types.js'

export function createReactAiRouter(options: ReactAiRouterOptions = {}): express.Router {
  const { registryPath, manifests: inlineManifests, sdk } = options
  const manifests: ComponentManifest[] = inlineManifests ?? loadRegistry(registryPath)
  const sessionStore = new InMemorySessionStore()
  const sseManager = new SseManager()
  const patchValidator = new PatchValidator(manifests)

  const router = express.Router()
  router.use(express.json())
  router.use(createRegistryRouter(manifests))
  router.use(createSessionsRouter(sessionStore))
  router.use(createPatchesRouter(sessionStore, sseManager, patchValidator))
  router.use(createSseRouter(sessionStore, sseManager))

  if (sdk) {
    router.use(createAiRouter(sdk, sessionStore, sseManager, manifests))
  }

  return router
}

function loadRegistry(registryPath: string | undefined): ComponentManifest[] {
  if (!registryPath) return []
  const raw = readFileSync(registryPath, 'utf-8')
  return JSON.parse(raw) as ComponentManifest[]
}
