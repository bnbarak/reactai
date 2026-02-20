import { Router } from 'express'
import type { ComponentManifest } from '../../../../core/src/types.js'

export function createRegistryRouter(manifests: ComponentManifest[]) {
  const router = Router()

  router.get('/registry', (_req, res) => {
    res.json(manifests)
  })

  router.get('/registry/:key', (req, res) => {
    const manifest = manifests.find((m) => m.key === req.params.key)
    if (!manifest) {
      res.status(404).json({ error: `Component '${req.params.key}' not found` })
      return
    }
    res.json(manifest)
  })

  return router
}
