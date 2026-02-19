import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import { createApp } from '../index.js'
import type { ComponentManifest } from '../../../core/src/types.js'

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

  describe('POST /api/sessions/:sid/instances', () => {
    it('postInstances_validSession_returns204', async () => {
      const app = TestUtil.createApp()
      const { body } = await request(app).post('/api/sessions')

      const res = await request(app)
        .post(`/api/sessions/${body.sessionId}/instances`)
        .send(TestUtil.createInstanceBody('demo-card', 'inst-1'))

      expect(res.status).toBe(204)
    })

    it('postInstances_invalidSession_returns404', async () => {
      const app = TestUtil.createApp()

      const res = await request(app)
        .post('/api/sessions/bad-sid/instances')
        .send(TestUtil.createInstanceBody('demo-card', 'inst-1'))

      expect(res.status).toBe(404)
    })

    it('postInstances_missingKey_returns400', async () => {
      const app = TestUtil.createApp()
      const { body } = await request(app).post('/api/sessions')

      const res = await request(app)
        .post(`/api/sessions/${body.sessionId}/instances`)
        .send({ instanceId: 'inst-1' })

      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/patches', () => {
    it('postPatches_validPatch_returns200AndApplied', async () => {
      const app = TestUtil.createApp([TestUtil.createManifest()])
      const { body: session } = await request(app).post('/api/sessions')
      const sid = session.sessionId
      await request(app)
        .post(`/api/sessions/${sid}/instances`)
        .send(TestUtil.createInstanceBody('demo-card', 'inst-1'))

      const res = await request(app).post('/api/patches').send({
        sessionId: sid,
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
      const sid = session.sessionId
      await request(app)
        .post(`/api/sessions/${sid}/instances`)
        .send(TestUtil.createInstanceBody('demo-card', 'inst-1'))

      const res = await request(app).post('/api/patches').send({
        sessionId: sid,
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
        .send({ sessionId: 'sid', prompt: 'test' })

      expect(res.status).toBe(404)
    })

    it('postAiPrompt_withMockedSdk_returnsSdkResult', async () => {
      const mockSdk = TestUtil.createMockSdk({ applied: true })
      const app = TestUtil.createApp([TestUtil.createManifest()], mockSdk)
      const { body: session } = await request(app).post('/api/sessions')
      const sid = session.sessionId
      await request(app)
        .post(`/api/sessions/${sid}/instances`)
        .send(TestUtil.createInstanceBody('demo-card', 'inst-1'))

      const res = await request(app)
        .post('/api/ai/prompt')
        .send({ sessionId: sid, prompt: 'make it blue' })

      expect(res.status).toBe(200)
      expect(res.body.applied).toBe(true)
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

  createInstanceBody: (key: string, instanceId: string) => ({
    key,
    instanceId,
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
