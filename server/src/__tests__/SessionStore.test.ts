import { describe, it, expect, beforeEach } from 'vitest'
import { SessionStore } from '../SessionStore.js'

describe('SessionStore', () => {
  describe('createSession', () => {
    it('createSession_called_returnsUniqueId', () => {
      const store = TestUtil.createStore()

      const id1 = store.createSession()
      const id2 = store.createSession()

      expect(id1).not.toBe(id2)
    })

    it('createSession_called_sessionExists', () => {
      const store = TestUtil.createStore()

      const id = store.createSession()

      expect(store.hasSession(id)).toBe(true)
    })
  })

  describe('registerInstance', () => {
    it('registerInstance_validSession_storesInstance', () => {
      const store = TestUtil.createStore()
      const sid = store.createSession()

      store.registerInstance(sid, TestUtil.createInstance('demo-card', 'inst-1'))

      const instances = store.getInstances(sid)
      expect(instances).toHaveLength(1)
      expect(instances[0].instanceId).toBe('inst-1')
    })

    it('registerInstance_invalidSession_throwsError', () => {
      const store = TestUtil.createStore()

      expect(() =>
        store.registerInstance('bad-session', TestUtil.createInstance('demo-card', 'inst-1')),
      ).toThrow('Session not found: bad-session')
    })
  })

  describe('applyPatch', () => {
    it('applyPatch_validPatch_mergesState', () => {
      const store = TestUtil.createStore()
      const sid = store.createSession()
      store.registerInstance(sid, TestUtil.createInstance('demo-card', 'inst-1', { title: 'Old' }))

      store.applyPatch(sid, 'inst-1', { title: 'New', body: 'Hello' })

      const state = store.getAiState(sid, 'inst-1')
      expect(state).toEqual({ title: 'New', body: 'Hello' })
    })

    it('applyPatch_invalidInstance_throwsError', () => {
      const store = TestUtil.createStore()
      const sid = store.createSession()

      expect(() => store.applyPatch(sid, 'missing-inst', { title: 'x' })).toThrow(
        'Instance not found: missing-inst',
      )
    })
  })

  describe('getInstances', () => {
    it('getInstances_multipleRegistered_returnsAll', () => {
      const store = TestUtil.createStore()
      const sid = store.createSession()
      store.registerInstance(sid, TestUtil.createInstance('card', 'inst-1'))
      store.registerInstance(sid, TestUtil.createInstance('banner', 'inst-2'))

      const instances = store.getInstances(sid)

      expect(instances).toHaveLength(2)
    })
  })
})

const TestUtil = {
  createStore: (): SessionStore => new SessionStore(),

  createInstance: (
    key: string,
    instanceId: string,
    currentProps: Record<string, unknown> = {},
  ) => ({ key, instanceId, currentProps }),
}
