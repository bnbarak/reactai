import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import type { SseEvent } from '../../../../core/src/types.js'

const { mockSubscribe, mockConnect, mockDisconnect } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
}))

vi.mock('@bnbarak/reactai/react', () => {
  const toKey = (desc: string) => desc.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return {
    sseClient: { subscribe: mockSubscribe, connect: mockConnect, disconnect: mockDisconnect },
    useSession: () => ({ sessionId: 'test-session', serverUrl: 'http://localhost:3001/api' }),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
    snapshotRegistry: { set: vi.fn(), remove: vi.fn(), getAll: vi.fn(() => []) },
    useStateWithAi: (description: string, initialState: Record<string, unknown>) => {
      const key = toKey(description)
      const [state, setState] = React.useState(initialState)
      React.useEffect(() => {
        return mockSubscribe('test-session', (event: SseEvent) => {
          if (event.type === 'patch' && event.key === key && event.instanceId === key)
            setState(s => ({ ...s, ...event.patch }))
          else if (event.type === 'snapshot' && event.key === key && event.instanceId === key)
            setState(event.state as Record<string, unknown>)
        })
      }, [])
      return [state, setState, { current: null }]
    },
    useAiMarker: vi.fn(),
    reactAI: (Component: React.ComponentType) => Component,
  }
})

import { SettingsPage } from '../pages/SettingsPage.js'

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribe.mockReturnValue(() => {})
  })

  it('settingsPage_default_showsProfileTabWithUsernameInput', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Username')).toBeTruthy()
    expect(screen.getByDisplayValue('barak')).toBeTruthy()
  })

  it('settingsPage_typeInInput_updatesValue', async () => {
    render(<SettingsPage />)

    const input = screen.getByDisplayValue('barak')
    await userEvent.clear(input)
    await userEvent.type(input, 'alice')

    expect(screen.getByDisplayValue('alice')).toBeTruthy()
  })

  it('settingsPage_clickNotifications_showsNotificationsTab', async () => {
    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }))

    expect(screen.getByText('Email digests')).toBeTruthy()
    expect(screen.queryByText('Username')).toBeNull()
  })

  it('settingsPage_clickAppearance_showsAppearanceTab', async () => {
    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Appearance' }))

    expect(screen.getByText('Compact')).toBeTruthy()
    expect(screen.queryByText('Username')).toBeNull()
  })

  it('settingsPage_clickProfileAfterSwitch_showsProfileTabAgain', async () => {
    render(<SettingsPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Notifications' }))
    await userEvent.click(screen.getByRole('button', { name: 'Profile' }))

    expect(screen.getByText('Username')).toBeTruthy()
  })

  it('settingsPage_aiPatch_updatesUsernameInput', async () => {
    const capturedHandlers: Array<(e: SseEvent) => void> = []
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandlers.push(handler)
      return () => {}
    })

    render(<SettingsPage />)

    await waitFor(() => expect(capturedHandlers.length).toBeGreaterThan(0))

    act(() => {
      const event: SseEvent = { type: 'patch', key: 'user-profile-settings', instanceId: 'user-profile-settings', patch: { username: 'alice' } }
      capturedHandlers.forEach((h) => h(event))
    })

    expect(screen.getByDisplayValue('alice')).toBeTruthy()
    expect(screen.queryByDisplayValue('barak')).toBeNull()
  })

  it('settingsPage_aiSnapshot_replacesUsernameInput', async () => {
    const capturedHandlers: Array<(e: SseEvent) => void> = []
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandlers.push(handler)
      return () => {}
    })

    render(<SettingsPage />)

    await waitFor(() => expect(capturedHandlers.length).toBeGreaterThan(0))

    act(() => {
      const event: SseEvent = { type: 'snapshot', key: 'user-profile-settings', instanceId: 'user-profile-settings', state: { username: 'charlie' } }
      capturedHandlers.forEach((h) => h(event))
    })

    expect(screen.getByDisplayValue('charlie')).toBeTruthy()
  })
})
