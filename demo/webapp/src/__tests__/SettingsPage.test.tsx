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

vi.mock('../../../../bridge/src/SseClient.js', () => ({
  sseClient: { subscribe: mockSubscribe, connect: mockConnect, disconnect: mockDisconnect },
}))

vi.mock('../../../../bridge/src/SessionContext.js', () => ({
  useSession: () => ({ sessionId: 'test-session', serverUrl: 'http://localhost:3001' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../../../../bridge/src/SnapshotRegistry.js', () => ({
  snapshotRegistry: { set: vi.fn(), remove: vi.fn(), getAll: vi.fn(() => []) },
}))

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
    let capturedHandler: ((e: SseEvent) => void) | null = null
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandler = handler
      return () => {}
    })

    render(<SettingsPage />)

    await waitFor(() => expect(capturedHandler).not.toBeNull())

    act(() => {
      capturedHandler!({
        type: 'patch',
        key: 'user-profile-settings',
        instanceId: 'user-profile-settings',
        patch: { username: 'alice' },
      })
    })

    expect(screen.getByDisplayValue('alice')).toBeTruthy()
    expect(screen.queryByDisplayValue('barak')).toBeNull()
  })

  it('settingsPage_aiSnapshot_replacesUsernameInput', async () => {
    let capturedHandler: ((e: SseEvent) => void) | null = null
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandler = handler
      return () => {}
    })

    render(<SettingsPage />)

    await waitFor(() => expect(capturedHandler).not.toBeNull())

    act(() => {
      capturedHandler!({
        type: 'snapshot',
        key: 'user-profile-settings',
        instanceId: 'user-profile-settings',
        state: { username: 'charlie' },
      })
    })

    expect(screen.getByDisplayValue('charlie')).toBeTruthy()
  })
})
