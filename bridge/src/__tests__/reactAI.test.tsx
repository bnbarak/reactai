import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'
import type { SseEvent } from '../../../core/src/types.js'
import { TestUtil } from './TestUtil.js'

const { mockSubscribe, mockConnect, mockDisconnect } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
}))

const { mockSet, mockRemove, mockGetAll } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockRemove: vi.fn(),
  mockGetAll: vi.fn(() => []),
}))

vi.mock('../SseClient.js', () => ({
  sseClient: { subscribe: mockSubscribe, connect: mockConnect, disconnect: mockDisconnect },
}))

vi.mock('../SessionContext.js', () => ({
  useSession: () => ({ sessionId: 'sess-1', serverUrl: 'http://localhost:3001' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../SnapshotRegistry.js', () => ({
  snapshotRegistry: { set: mockSet, remove: mockRemove, getAll: mockGetAll },
}))

import { reactAI } from '../reactAI.js'

describe('reactAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribe.mockReturnValue(() => {})
  })

  describe('reactAI HOC', () => {
    it('reactAI_mounted_rendersInnerComponent', () => {
      const Card = ({ title }: { title: string }) => <div>{title}</div>
      const AiCard = reactAI(Card, { key: 'demo-card', description: 'A card' })

      render(<AiCard title="Base Title" />)

      expect(screen.getByText('Base Title')).toBeTruthy()
    })

    it('reactAI_mounted_registersInSnapshotRegistry', async () => {
      const Card = ({ title }: { title: string }) => <div>{title}</div>
      const AiCard = reactAI(Card, { key: 'demo-card', description: 'A card' })

      render(<AiCard title="Hello" />)

      await waitFor(() => expect(mockSet).toHaveBeenCalled())

      const [instanceId, entry] = mockSet.mock.calls[0]
      expect(typeof instanceId).toBe('string')
      expect(entry.key).toBe('demo-card')
      expect(entry.state).toEqual({ title: 'Hello' })
    })

    it('reactAI_unmounted_removesFromRegistry', async () => {
      const Card = ({ title }: { title: string }) => <div>{title}</div>
      const AiCard = reactAI(Card, { key: 'demo-card', description: 'A card' })

      const { unmount } = render(<AiCard title="Hello" />)
      await waitFor(() => expect(mockSet).toHaveBeenCalled())
      const [instanceId] = mockSet.mock.calls[0]

      unmount()

      expect(mockRemove).toHaveBeenCalledWith(instanceId)
    })

    it('reactAI_baseProps_passedToInnerComponent', () => {
      const Card = ({ title, body }: { title: string; body?: string }) => (
        <div>
          <span data-testid="title">{title}</span>
          <span data-testid="body">{body}</span>
        </div>
      )
      const AiCard = reactAI(Card, { key: 'demo-card', description: 'A card' })

      render(<AiCard title="Base Title" body="Base Body" />)

      expect(screen.getByTestId('title').textContent).toBe('Base Title')
      expect(screen.getByTestId('body').textContent).toBe('Base Body')
    })

    it('reactAI_displayName_includesComponentName', () => {
      function MyCard({ title }: { title: string }) {
        return <div>{title}</div>
      }

      const AiCard = reactAI(MyCard, { key: 'my-card', description: 'Card' })

      expect(AiCard.displayName).toBe('reactAI(MyCard)')
    })
  })

  describe('multiple components', () => {
    it('threeComponents_allRegisterWithUniqueInstanceIds', async () => {
      const AiBanner = reactAI(
        ({ headline }: { headline: string }) => <span data-testid="banner">{headline}</span>,
        { key: 'demo-banner', description: 'Banner' },
      )
      const AiCard = reactAI(
        ({ title }: { title: string }) => <span data-testid="card">{title}</span>,
        { key: 'demo-card', description: 'Card' },
      )
      const AiHeader = reactAI(
        ({ text }: { text: string }) => <span data-testid="header">{text}</span>,
        { key: 'demo-header', description: 'Header' },
      )

      render(
        <div>
          <AiBanner headline="Banner" />
          <AiCard title="Card" />
          <AiHeader text="Header" />
        </div>,
      )

      await waitFor(() => expect(mockSet).toHaveBeenCalledTimes(3))

      const instanceIds = mockSet.mock.calls.map(([id]) => id)
      expect(new Set(instanceIds).size).toBe(3)
    })

    it('threeComponents_patchForOne_onlyUpdatesTargetComponent', async () => {
      const handlers: Array<(e: SseEvent) => void> = []
      mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
        handlers.push(handler)
        return () => {}
      })

      const AiBanner = reactAI(
        ({ headline }: { headline: string }) => <span data-testid="banner">{headline}</span>,
        { key: 'demo-banner', description: 'Banner' },
      )
      const AiCard = reactAI(
        ({ title }: { title: string }) => <span data-testid="card">{title}</span>,
        { key: 'demo-card', description: 'Card' },
      )
      const AiHeader = reactAI(
        ({ text }: { text: string }) => <span data-testid="header">{text}</span>,
        { key: 'demo-header', description: 'Header' },
      )

      render(
        <div>
          <AiBanner headline="Original Banner" />
          <AiCard title="Original Card" />
          <AiHeader text="Original Header" />
        </div>,
      )

      await waitFor(() => expect(mockSet).toHaveBeenCalledTimes(3))

      const cardCall = mockSet.mock.calls.find(([, entry]) => entry.key === 'demo-card')!
      const cardInstanceId = cardCall[0] as string

      act(() => {
        handlers.forEach((h) => h(TestUtil.createPatchEvent('demo-card', cardInstanceId, { title: 'AI Card' })))
      })

      expect(screen.getByTestId('card').textContent).toBe('AI Card')
      expect(screen.getByTestId('banner').textContent).toBe('Original Banner')
      expect(screen.getByTestId('header').textContent).toBe('Original Header')
    })

    it('nestedComponents_patchForChild_doesNotAffectParent', async () => {
      const handlers: Array<(e: SseEvent) => void> = []
      mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
        handlers.push(handler)
        return () => {}
      })

      const AiParent = reactAI(
        ({ theme, children }: { theme: string; children?: React.ReactNode }) => (
          <div data-testid="parent" data-theme={theme}>{children}</div>
        ),
        { key: 'app-layout', description: 'Layout' },
      )
      const AiChild = reactAI(
        ({ title }: { title: string }) => <span data-testid="child">{title}</span>,
        { key: 'demo-card', description: 'Card' },
      )

      render(
        <AiParent theme="light">
          <AiChild title="Child Title" />
        </AiParent>,
      )

      await waitFor(() => expect(mockSet).toHaveBeenCalledTimes(2))

      const childCall = mockSet.mock.calls.find(([, entry]) => entry.key === 'demo-card')!
      const childInstanceId = childCall[0] as string

      act(() => {
        handlers.forEach((h) => h(TestUtil.createPatchEvent('demo-card', childInstanceId, { title: 'AI Child' })))
      })

      expect(screen.getByTestId('child').textContent).toBe('AI Child')
      expect(screen.getByTestId('parent').getAttribute('data-theme')).toBe('light')
    })
  })
})
