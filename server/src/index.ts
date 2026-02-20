import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { InMemorySessionStore } from './SessionStore.js'
import { SseManager } from './SseManager.js'
import { PatchValidator } from './PatchValidator.js'
import { createRegistryRouter } from './routes/registry.js'
import { createSessionsRouter } from './routes/sessions.js'
import { createPatchesRouter } from './routes/patches.js'
import { createSseRouter } from './routes/sse.js'
import { createAiRouter, type AiSdkLike } from './routes/ai.js'
import type { ComponentManifest } from '../../core/src/types.js'

export interface AppOptions {
  manifests?: ComponentManifest[]
  sdk?: AiSdkLike
}

export function createApp(options: AppOptions = {}) {
  const { manifests = [], sdk } = options

  const sessionStore = new InMemorySessionStore()
  const sseManager = new SseManager()
  const patchValidator = new PatchValidator(manifests)

  const app = express()
  app.use(cors())
  app.use(express.json())

  app.use('/api', createRegistryRouter(manifests))
  app.use('/api', createSessionsRouter(sessionStore))
  app.use('/api', createPatchesRouter(sessionStore, sseManager, patchValidator))
  app.use('/api', createSseRouter(sessionStore, sseManager))

  if (sdk) {
    app.use('/api', createAiRouter(sdk, sessionStore, sseManager, manifests))
  }

  return app
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY environment variable is required')

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const { ReactAiSdk } = await import('../../sdk/src/ReactAiSdk.js')

  let manifests: ComponentManifest[] = []
  try {
    const { readFileSync } = await import('fs')
    const raw = readFileSync('./core/src/generated/registry.json', 'utf-8')
    manifests = JSON.parse(raw)
  } catch {
    console.warn('No registry.json found — run npm run scan first')
  }

  const sdk = new ReactAiSdk(new Anthropic({ apiKey }))
  const app = createApp({ manifests, sdk })
  const PORT = process.env.PORT ?? 3001
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
}
