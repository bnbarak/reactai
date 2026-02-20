import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'
import type { ComponentManifest, MountedInstance } from '../../../../core/src/types.js'

describe('routes', () => {
  describe('GET /api/registry', () => {
    it('getRegistry_noManifests_returnsEmptyArray', async () => {
      const app = TestUtil.createApp()

      const res = await request(app).get('/api/registry')

      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })

    it('getRegistry_withManifests_returnsAll', async () => {
      const app = TestUtil.createApp([TestUtil.createManifest()])

      const res = await request(app).get('/api/registry')

      expect(res.status).toBe(200)
      expect(res.body).toHaveLength(1)
      expect(res.body[0].key).toBe('demo-card')
    })
  })

  describe('GET /api/registry/:key', () => {
    it('getRegistryByKey_existingKey_returnsManifest', async () => {
      const app = TestUtil.createApp([TestUtil.createManifest()])

      const res = await request(app).get('/api/registry/demo-card')

      expect(res.status).toBe(200)
      expect(res.body.key).toBe('demo-card')
    })

    it('getRegistryByKey_unknownKey_returns404', async () => {
      const app = TestUtil.createApp()

      const res = await request(app).get('/api/registry/unknown')

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/sessions', () => {
    it('postSessions_called_returnsSessionId', async () => {
      const app = TestUtil.createApp()

      const res = await request(app).post('/api/sessions')

      expect(res.status).toBe(201)
      expect(res.body.sessionId).toBeTruthy()
    })
  })

  describe('POST /api/patches', () => {
    it('postPatches_validPatch_returns200AndApplied', async () => {
      const app = TestUtil.createApp([TestUtil.createManifest()])
      const { body: session } = await request(app).post('/api/sessions')

      const res = await request(app).post('/api/patches').send({
        sessionId: session.sessionId,
        key: 'demo-card',
        instanceId: 'inst-1',
        patch: { title: 'Updated' },
        source: 'direct',
      })

      expect(res.status).toBe(200)
      expect(res.body.applied).toBe(true)
    })

    it('postPatches_nonAiWritableProp_returns422', async () => {
      const app = TestUtil.createApp([TestUtil.createManifest()])
      const { body: session } = await request(app).post('/api/sessions')

      const res = await request(app).post('/api/patches').send({
        sessionId: session.sessionId,
        key: 'demo-card',
        instanceId: 'inst-1',
        patch: { onClick: 'bad' },
        source: 'direct',
      })

      expect(res.status).toBe(422)
    })

    it('postPatches_unknownSession_returns404', async () => {
      const app = TestUtil.createApp([TestUtil.createManifest()])

      const res = await request(app).post('/api/patches').send({
        sessionId: 'bad-sid',
        key: 'demo-card',
        instanceId: 'inst-1',
        patch: { title: 'x' },
      })

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/ai/prompt', () => {
    it('postAiPrompt_noSdkConfigured_returns404', async () => {
      const app = TestUtil.createApp()

      const res = await request(app)
        .post('/api/ai/prompt')
        .send({ sessionId: 'sid', prompt: 'test', snapshot: [] })

      expect(res.status).toBe(404)
    })

    it('postAiPrompt_withMockedSdk_returnsSdkResult', async () => {
      const mockSdk = TestUtil.createMockSdk({ applied: true })
      const app = TestUtil.createApp([TestUtil.createManifest()], mockSdk)
      const { body: session } = await request(app).post('/api/sessions')

      const res = await request(app)
        .post('/api/ai/prompt')
        .send({ sessionId: session.sessionId, prompt: 'make it blue', snapshot: [TestUtil.createSnapshot()] })

      expect(res.status).toBe(200)
      expect(res.body.applied).toBe(true)
    })

    it('postAiPrompt_snapshotWithContext_passesEnumToSdk', async () => {
      let capturedManifests: ComponentManifest[] = []
      const mockSdk = {
        updateFromPrompt: vi.fn().mockImplementation((_prompt, manifests) => {
          capturedManifests = manifests
          return Promise.resolve({ target: { key: 'theme-selector', instanceId: 'theme-selector' }, patch: { selected: 'dark' }, applied: true })
        }),
      }
      const app = TestUtil.createApp([], mockSdk)
      const { body: session } = await request(app).post('/api/sessions')

      await request(app)
        .post('/api/ai/prompt')
        .send({
          sessionId: session.sessionId,
          prompt: 'switch to dark mode',
          snapshot: [{
            key: 'theme-selector',
            instanceId: 'theme-selector',
            description: 'Theme selector',
            aiWritableProps: ['selected'],
            currentProps: { selected: 'light' },
            context: { selected: ['light', 'dark', 'system'] },
          }],
        })

      const manifest = capturedManifests.find((m) => m.key === 'theme-selector')!
      const schemaProp = (manifest.propsJsonSchema as { properties: Record<string, unknown> }).properties
      expect(schemaProp.selected).toEqual({ type: 'string', enum: ['light', 'dark', 'system'] })
    })

    it('postAiPrompt_snapshotWithoutContext_noEnumInSchema', async () => {
      let capturedManifests: ComponentManifest[] = []
      const mockSdk = {
        updateFromPrompt: vi.fn().mockImplementation((_prompt, manifests) => {
          capturedManifests = manifests
          return Promise.resolve({ target: { key: 'title-state', instanceId: 'title-state' }, patch: { title: 'New' }, applied: true })
        }),
      }
      const app = TestUtil.createApp([], mockSdk)
      const { body: session } = await request(app).post('/api/sessions')

      await request(app)
        .post('/api/ai/prompt')
        .send({
          sessionId: session.sessionId,
          prompt: 'change title',
          snapshot: [{
            key: 'title-state',
            instanceId: 'title-state',
            description: 'Title state',
            aiWritableProps: ['title'],
            currentProps: { title: 'Hello' },
          }],
        })

      const manifest = capturedManifests.find((m) => m.key === 'title-state')!
      const schemaProp = (manifest.propsJsonSchema as { properties: Record<string, unknown> }).properties
      expect(schemaProp.title).toEqual({ type: 'string' })
      expect((schemaProp.title as Record<string, unknown>).enum).toBeUndefined()
    })

    it('postAiPrompt_missingSnapshot_returns400', async () => {
      const mockSdk = TestUtil.createMockSdk()
      const app = TestUtil.createApp([], mockSdk)
      const { body: session } = await request(app).post('/api/sessions')

      const res = await request(app)
        .post('/api/ai/prompt')
        .send({ sessionId: session.sessionId, prompt: 'test' })

      expect(res.status).toBe(400)
    })

    it('postAiPrompt_withMarkersAndUrl_forwardsToSdk', async () => {
      const mockSdk = { updateFromPrompt: vi.fn().mockResolvedValue({ applied: true, target: null, patch: null }) }
      const app = TestUtil.createApp([], mockSdk)
      const { body: session } = await request(app).post('/api/sessions')
      const markers = { activePage: 'settings' }
      const currentUrl = 'http://localhost:5173/'

      await request(app)
        .post('/api/ai/prompt')
        .send({ sessionId: session.sessionId, prompt: 'update it', snapshot: [], markers, currentUrl })

      expect(mockSdk.updateFromPrompt).toHaveBeenCalledWith(
        'update it',
        expect.anything(),
        expect.anything(),
        undefined,
        markers,
        currentUrl,
      )
    })

    it('postAiPrompt_sdkReturnsIsDoneFalse_includesInResponse', async () => {
      const mockSdk = TestUtil.createMockSdk({ applied: true, isDone: false })
      const app = TestUtil.createApp([TestUtil.createManifest()], mockSdk)
      const { body: session } = await request(app).post('/api/sessions')

      const res = await request(app)
        .post('/api/ai/prompt')
        .send({ sessionId: session.sessionId, prompt: 'navigate', snapshot: [TestUtil.createSnapshot()] })

      expect(res.body.isDone).toBe(false)
    })

    it('postAiPrompt_sdkThrows_returnsIsDoneTrue', async () => {
      const mockSdk = { updateFromPrompt: vi.fn().mockRejectedValue(new Error('LLM timeout')) }
      const app = TestUtil.createApp([], mockSdk)
      const { body: session } = await request(app).post('/api/sessions')

      const res = await request(app)
        .post('/api/ai/prompt')
        .send({ sessionId: session.sessionId, prompt: 'test', snapshot: [] })

      expect(res.body.applied).toBe(false)
      expect(res.body.isDone).toBe(true)
    })
  })
})

const TestUtil = {
  createManifest: (): ComponentManifest => ({
    key: 'demo-card',
    description: 'A demo card',
    filePath: '/fake/path.tsx',
    aiWritableProps: ['title', 'body', 'buttonLabel'],
    propsJsonSchema: {
      type: 'object',
      properties: { title: { type: 'string' } },
    },
  }),

  createSnapshot: (): MountedInstance => ({
    key: 'demo-card',
    instanceId: 'inst-1',
    description: 'A demo card',
    aiWritableProps: ['title'],
    currentProps: { title: 'Hello' },
  }),

  createApp: (manifests: ComponentManifest[] = [], sdk?: unknown) =>
    createApp({ manifests, sdk: sdk as never }),

  createMockSdk: (overrides: Record<string, unknown> = {}) => ({
    updateFromPrompt: vi.fn().mockResolvedValue({
      target: { key: 'demo-card', instanceId: 'inst-1' },
      patch: { title: 'AI Title' },
      applied: true,
      ...overrides,
    }),
  }),
}
