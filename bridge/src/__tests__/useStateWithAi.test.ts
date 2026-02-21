import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor, render } from '@testing-library/react'
import React from 'react'
import type { SseEvent } from '../../../core/src/types.js'
import { TestUtil } from './TestUtil.js'

const { mockSubscribe, mockConnect, mockDisconnect } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
}))

vi.mock('../SseClient.js', () => ({
  sseClient: { subscribe: mockSubscribe, connect: mockConnect, disconnect: mockDisconnect },
}))

vi.mock('../SessionContext.js', () => ({
  useSession: () => ({ sessionId: 'test-session', serverUrl: 'http://localhost:3001/api' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../SnapshotRegistry.js', () => ({
  snapshotRegistry: { set: vi.fn(), remove: vi.fn(), getAll: vi.fn(() => []) },
}))

import { useStateWithAi } from '../useStateWithAi.js'
import { snapshotRegistry } from '../SnapshotRegistry.js'

describe('useStateWithAi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribe.mockReturnValue(() => {})
  })

  it('useStateWithAi_initial_returnsInitialState', () => {
    const { result } = renderHook(() => useStateWithAi('User profile settings', { username: 'barak' }))

    expect(result.current[0]).toEqual({ username: 'barak' })
  })

  it('useStateWithAi_mounted_registersWithSluggedKey', async () => {
    renderHook(() => useStateWithAi('User profile settings', { username: 'barak' }))

    await waitFor(() => expect(snapshotRegistry.set).toHaveBeenCalled())

    const [instanceId, entry] = (snapshotRegistry.set as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(instanceId).toBe('user-profile-settings')
    expect(entry.key).toBe('user-profile-settings')
    expect(entry.description).toBe('User profile settings')
    expect(entry.aiWritableProps).toEqual(['username'])
  })

  it('useStateWithAi_unmounted_removesFromRegistry', () => {
    const { unmount } = renderHook(() => useStateWithAi('User profile settings', { username: 'barak' }))

    unmount()

    expect(snapshotRegistry.remove).toHaveBeenCalledWith('user-profile-settings')
  })

  it('useStateWithAi_patchEvent_updatesState', () => {
    let capturedHandler: ((e: SseEvent) => void) | null = null
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandler = handler
      return () => {}
    })

    const { result } = renderHook(() => useStateWithAi('User profile settings', { username: 'barak' }))

    act(() => {
      capturedHandler!(TestUtil.createPatchEvent('user-profile-settings', 'user-profile-settings', { username: 'alice' }))
    })

    expect(result.current[0]).toEqual({ username: 'alice' })
  })

  it('useStateWithAi_patchEventForDifferentKey_ignoresEvent', () => {
    let capturedHandler: ((e: SseEvent) => void) | null = null
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandler = handler
      return () => {}
    })

    const { result } = renderHook(() => useStateWithAi('User profile settings', { username: 'barak' }))

    act(() => {
      capturedHandler!(TestUtil.createPatchEvent('other-component', 'other-component', { username: 'eve' }))
    })

    expect(result.current[0]).toEqual({ username: 'barak' })
  })

  it('useStateWithAi_snapshotEvent_replacesState', () => {
    let capturedHandler: ((e: SseEvent) => void) | null = null
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandler = handler
      return () => {}
    })

    const { result } = renderHook(() => useStateWithAi('User profile settings', { username: 'barak' }))

    act(() => {
      capturedHandler!(TestUtil.createSnapshotEvent('user-profile-settings', 'user-profile-settings', { username: 'fresh' }))
    })

    expect(result.current[0]).toEqual({ username: 'fresh' })
  })

  it('useStateWithAi_mounted_setsDataAiIdOnRef', async () => {
    const TestComp = () => {
      const [, , aiRef] = useStateWithAi('User profile settings', { username: 'barak' })
      return React.createElement('div', { ref: aiRef as React.RefObject<HTMLDivElement>, 'data-testid': 'root' })
    }

    const { getByTestId } = render(React.createElement(TestComp))

    await waitFor(() => {
      expect(getByTestId('root').getAttribute('data-ai-id')).toBe('user-profile-settings')
    })
  })

  it('useStateWithAi_stateChange_updatesRegistry', async () => {
    const { result } = renderHook(() => useStateWithAi('User profile settings', { username: 'barak' }))

    act(() => { result.current[1]({ username: 'alice' }) })

    await waitFor(() => {
      const calls = (snapshotRegistry.set as ReturnType<typeof vi.fn>).mock.calls
      const lastCall = calls[calls.length - 1]
      expect(lastCall[1].state).toEqual({ username: 'alice' })
    })
  })

  describe('context parameter', () => {
    it('useStateWithAi_withContext_storesContextInRegistry', async () => {
      renderHook(() =>
        useStateWithAi('Theme selector', { selected: 'light' }, { selected: ['light', 'dark', 'system'] }),
      )

      await waitFor(() => expect(snapshotRegistry.set).toHaveBeenCalled())

      const [, entry] = (snapshotRegistry.set as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(entry.context).toEqual({ selected: ['light', 'dark', 'system'] })
    })

    it('useStateWithAi_withContext_writablePropsUnaffected', async () => {
      renderHook(() =>
        useStateWithAi('Theme selector', { selected: 'light' }, { selected: ['light', 'dark', 'system'] }),
      )

      await waitFor(() => expect(snapshotRegistry.set).toHaveBeenCalled())

      const [, entry] = (snapshotRegistry.set as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(entry.aiWritableProps).toEqual(['selected'])
    })

    it('useStateWithAi_withContext_stateDoesNotIncludeContextKeys', async () => {
      renderHook(() =>
        useStateWithAi('Theme selector', { selected: 'light' }, { selected: ['light', 'dark', 'system'] }),
      )

      await waitFor(() => expect(snapshotRegistry.set).toHaveBeenCalled())

      const [, entry] = (snapshotRegistry.set as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(Object.keys(entry.state)).toEqual(['selected'])
    })

    it('useStateWithAi_withArbitraryContext_preservesShape', async () => {
      renderHook(() =>
        useStateWithAi(
          'Priority picker',
          { priority: 'medium' },
          { priority: ['low', 'medium', 'high'], label: 'Task priority' },
        ),
      )

      await waitFor(() => expect(snapshotRegistry.set).toHaveBeenCalled())

      const [, entry] = (snapshotRegistry.set as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(entry.context).toEqual({ priority: ['low', 'medium', 'high'], label: 'Task priority' })
    })

    it('useStateWithAi_withoutContext_contextIsUndefined', async () => {
      renderHook(() => useStateWithAi('Simple state', { value: 'hello' }))

      await waitFor(() => expect(snapshotRegistry.set).toHaveBeenCalled())

      const [, entry] = (snapshotRegistry.set as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(entry.context).toBeUndefined()
    })
  })

  describe('initial state types', () => {
    it('useStateWithAi_stringValue_returnsString', () => {
      const { result } = renderHook(() => useStateWithAi('Page title', { title: 'Hello World' }))

      expect(result.current[0]).toEqual({ title: 'Hello World' })
    })

    it('useStateWithAi_numberValue_returnsNumber', () => {
      const { result } = renderHook(() => useStateWithAi('Counter state', { count: 42, step: 1.5 }))

      expect(result.current[0]).toEqual({ count: 42, step: 1.5 })
    })

    it('useStateWithAi_booleanValue_returnsBoolean', () => {
      const { result } = renderHook(() => useStateWithAi('Toggle state', { enabled: true, visible: false }))

      expect(result.current[0]).toEqual({ enabled: true, visible: false })
    })

    it('useStateWithAi_nestedObject_returnsObject', () => {
      const { result } = renderHook(() =>
        useStateWithAi('Card state', { title: 'hello', meta: { count: 1 } }),
      )

      expect(result.current[0]).toEqual({ title: 'hello', meta: { count: 1 } })
    })

    it('useStateWithAi_nullValue_returnsNull', () => {
      const { result } = renderHook(() => useStateWithAi('Nullable state', { value: null as unknown as string }))

      expect(result.current[0].value).toBeNull()
    })

    it('useStateWithAi_undefinedValue_returnsUndefined', () => {
      const { result } = renderHook(() => useStateWithAi('Optional state', { label: undefined as unknown as string }))

      expect(result.current[0].label).toBeUndefined()
    })

    it('useStateWithAi_arrayValue_returnsArray', () => {
      const { result } = renderHook(() => useStateWithAi('List state', { items: ['a', 'b', 'c'] }))

      expect(result.current[0]).toEqual({ items: ['a', 'b', 'c'] })
    })

    it('useStateWithAi_mixedTypes_registersAllKeysAsAiWritable', async () => {
      renderHook(() =>
        useStateWithAi('Mixed state', { name: 'test', count: 0, active: false }),
      )

      await waitFor(() => expect(snapshotRegistry.set).toHaveBeenCalled())

      const [, entry] = (snapshotRegistry.set as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(entry.aiWritableProps).toEqual(['name', 'count', 'active'])
    })
  })
})
