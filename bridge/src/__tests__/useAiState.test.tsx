import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import type { SseEvent } from '../../../core/src/types.js'
import { TestUtil } from './TestUtil.js'

const { mockSubscribe, mockConnect, mockDisconnect } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
}))

vi.mock('../SseClient.js', () => ({
  sseClient: {
    subscribe: mockSubscribe,
    connect: mockConnect,
    disconnect: mockDisconnect,
  },
}))

vi.mock('../SessionContext.js', () => ({
  useSession: () => ({ sessionId: 'test-session', serverUrl: 'http://localhost:3001/api' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

import { useAiState } from '../useAiState.js'

describe('useAiState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribe.mockReturnValue(() => {})
  })

  describe('useAiState', () => {
    it('useAiState_initial_returnsEmptyObject', () => {
      const { result } = renderHook(() => useAiState('demo-card', 'inst-1'))

      expect(result.current).toEqual({})
    })

    it('useAiState_patchEvent_updatesState', () => {
      let capturedHandler: ((e: SseEvent) => void) | null = null
      mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
        capturedHandler = handler
        return () => {}
      })

      const { result } = renderHook(() => useAiState('demo-card', 'inst-1'))

      act(() => { capturedHandler!(TestUtil.createPatchEvent('demo-card', 'inst-1', { title: 'AI Title' })) })

      expect(result.current).toEqual({ title: 'AI Title' })
    })

    it('useAiState_patchEventForDifferentInstance_ignoresEvent', () => {
      let capturedHandler: ((e: SseEvent) => void) | null = null
      mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
        capturedHandler = handler
        return () => {}
      })

      const { result } = renderHook(() => useAiState('demo-card', 'inst-1'))

      act(() => { capturedHandler!(TestUtil.createPatchEvent('demo-card', 'inst-OTHER', { title: 'Should Ignore' })) })

      expect(result.current).toEqual({})
    })

    it('useAiState_snapshotEvent_replacesState', () => {
      let capturedHandler: ((e: SseEvent) => void) | null = null
      mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
        capturedHandler = handler
        return () => {}
      })

      const { result } = renderHook(() => useAiState('demo-card', 'inst-1'))

      act(() => { capturedHandler!(TestUtil.createPatchEvent('demo-card', 'inst-1', { title: 'Old' })) })
      act(() => { capturedHandler!(TestUtil.createSnapshotEvent('demo-card', 'inst-1', { title: 'Fresh', body: 'Reset' })) })

      expect(result.current).toEqual({ title: 'Fresh', body: 'Reset' })
    })

    it('useAiState_patchEvents_mergesProps', () => {
      let capturedHandler: ((e: SseEvent) => void) | null = null
      mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
        capturedHandler = handler
        return () => {}
      })

      const { result } = renderHook(() => useAiState('demo-card', 'inst-1'))

      act(() => { capturedHandler!(TestUtil.createPatchEvent('demo-card', 'inst-1', { title: 'First' })) })
      act(() => { capturedHandler!(TestUtil.createPatchEvent('demo-card', 'inst-1', { body: 'Second' })) })

      expect(result.current).toEqual({ title: 'First', body: 'Second' })
    })
  })
})
