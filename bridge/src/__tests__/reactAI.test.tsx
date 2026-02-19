import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

const { mockSubscribe, mockConnect, mockDisconnect } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
}))

const mockFetch = vi.hoisted(() => vi.fn())
vi.stubGlobal('fetch', mockFetch)

vi.mock('../SseClient.js', () => ({
  sseClient: {
    subscribe: mockSubscribe,
    connect: mockConnect,
    disconnect: mockDisconnect,
  },
}))

vi.mock('../SessionContext.js', () => ({
  useSession: () => ({ sessionId: 'sess-1', serverUrl: 'http://localhost:3001' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

import { reactAI } from '../reactAI.js'

describe('reactAI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribe.mockReturnValue(() => {})
    mockFetch.mockResolvedValue({ json: () => Promise.resolve({}) })
  })

  describe('reactAI HOC', () => {
    it('reactAI_mounted_rendersInnerComponent', () => {
      const Card = ({ title }: { title: string }) => <div>{title}</div>
      const AiCard = reactAI(Card, { key: 'demo-card', description: 'A card' })

      render(<AiCard title="Base Title" />)

      expect(screen.getByText('Base Title')).toBeTruthy()
    })

    it('reactAI_mounted_registersWithServer', async () => {
      const Card = ({ title }: { title: string }) => <div>{title}</div>
      const AiCard = reactAI(Card, { key: 'demo-card', description: 'A card' })

      render(<AiCard title="Hello" />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/sessions/sess-1/instances'),
          expect.objectContaining({ method: 'POST' }),
        )
      })
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
})
