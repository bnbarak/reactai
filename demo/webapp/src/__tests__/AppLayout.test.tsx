import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import type { SseEvent } from '../../../../core/src/types.js'

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

vi.mock('@bnbarak/reactai/react', () => ({
  sseClient: { subscribe: mockSubscribe, connect: mockConnect, disconnect: mockDisconnect },
}))

vi.mock('@bnbarak/reactai/react', () => ({
  useSession: () => ({ sessionId: 'test-session', serverUrl: 'http://localhost:3001/api' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@bnbarak/reactai/react', () => ({
  snapshotRegistry: { set: mockSet, remove: mockRemove, getAll: mockGetAll },
}))

// motion/react uses animation which doesn't work in jsdom — stub it out
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      React.createElement('div', rest, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

import { AppLayout } from '../components/AppLayout.js'

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribe.mockReturnValue(() => {})
  })

  it('appLayout_default_showsPortfolioPage', async () => {
    render(<AppLayout activePage="portfolio" />)

    await waitFor(() => expect(screen.getByText('My Portfolio')).toBeTruthy())
  })

  it('appLayout_clickTicTacToe_showsTicTacToePage', async () => {
    render(<AppLayout activePage="portfolio" />)

    await userEvent.click(screen.getByRole('button', { name: 'Tic-Tac-Toe' }))

    expect(screen.getByRole('heading', { name: 'Tic-Tac-Toe' })).toBeTruthy()
  })

  it('appLayout_clickSettings_showsSettingsPage', async () => {
    render(<AppLayout activePage="portfolio" />)

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

    await waitFor(() => expect(screen.getByText('Username')).toBeTruthy())
    expect(screen.getByDisplayValue('barak')).toBeTruthy()
  })

  it('appLayout_navigateToSettingsThenProfileTab_showsUsername', async () => {
    render(<AppLayout activePage="portfolio" />)

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Profile' })).toBeTruthy())
    await userEvent.click(screen.getByRole('button', { name: 'Profile' }))

    expect(screen.getByText('Username')).toBeTruthy()
    expect(screen.getByDisplayValue('barak')).toBeTruthy()
  })

  it('appLayout_navigateToSettingsThenNotifications_showsNotificationsContent', async () => {
    render(<AppLayout activePage="portfolio" />)

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy())
    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(screen.getByText('Email digests')).toBeTruthy()
  })

  it('appLayout_aiPatchOnSettings_updatesUsernameFromAnyPage', async () => {
    const capturedHandlers: Array<(e: SseEvent) => void> = []
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandlers.push(handler)
      return () => {}
    })

    render(<AppLayout activePage="portfolio" />)

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    await waitFor(() => expect(capturedHandlers.length).toBeGreaterThan(0))

    await userEvent.click(screen.getByRole('button', { name: 'Profile' }))

    act(() => {
      const event: SseEvent = { type: 'patch', key: 'user-profile-settings', instanceId: 'user-profile-settings', patch: { username: 'alice' } }
      capturedHandlers.forEach((h) => h(event))
    })

    expect(screen.getByDisplayValue('alice')).toBeTruthy()
  })
})
