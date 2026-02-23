import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import type { SseEvent } from 'react-ai-core';

const { mockSubscribe, mockConnect, mockDisconnect } = vi.hoisted(() => ({
  mockSubscribe: vi.fn(),
  mockConnect: vi.fn(),
  mockDisconnect: vi.fn(),
}));

const { mockSet, mockRemove, mockGetAll } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockRemove: vi.fn(),
  mockGetAll: vi.fn(() => []),
}));

vi.mock('@bnbarak/reactai/react', () => ({
  sseClient: { subscribe: mockSubscribe, connect: mockConnect, disconnect: mockDisconnect },
  useSession: () => ({ sessionId: 'test-session', serverUrl: 'http://localhost:3001/api' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  snapshotRegistry: { set: mockSet, remove: mockRemove, getAll: mockGetAll },
  useStateWithAi: (description: string, initialState: Record<string, unknown>) => {
    const [state, setState] = React.useState(initialState);
    React.useEffect(() => {
      const key = description.toLowerCase().replace(/\s+/g, '-');
      const unsub = mockSubscribe(key, (event: SseEvent) => {
        if (event.type === 'patch') setState((s) => ({ ...s, ...event.patch }));
        if (event.type === 'snapshot') setState(event.state as Record<string, unknown>);
      });
      return unsub;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- test mock, subscribe once on mount
    }, []);
    return [state, setState, { current: null }];
  },
  useAiMarker: vi.fn(),
  reactAI: (Component: React.ComponentType) => Component,
}));

vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_: object, tag: string) =>
        ({
          children,
          ...rest
        }: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) =>
          React.createElement(tag as keyof JSX.IntrinsicElements, rest, children),
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { AppLayout } from '../components/AppLayout.js';

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(() => {});
  });

  it('appLayout_default_showsPortfolioPage', async () => {
    render(<AppLayout activePage="portfolio" />);

    await waitFor(() => expect(screen.getByText('My Portfolio')).toBeTruthy());
  });

  it('appLayout_clickDashboard_showsDashboard', async () => {
    render(<AppLayout activePage="portfolio" />);

    await userEvent.click(screen.getByRole('button', { name: 'Dashboard' }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Analytics Dashboard' })).toBeTruthy(),
    );
  });

  it('appLayout_aiSsePatch_updatesComponentState', async () => {
    const capturedHandlers: Array<(e: SseEvent) => void> = [];
    mockSubscribe.mockImplementation((_: string, handler: (e: SseEvent) => void) => {
      capturedHandlers.push(handler);
      return () => {};
    });

    render(<AppLayout activePage="portfolio" />);

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await waitFor(() => expect(capturedHandlers.length).toBeGreaterThan(0));

    await userEvent.click(screen.getByRole('button', { name: 'Profile' }));

    act(() => {
      const event: SseEvent = {
        type: 'patch',
        key: 'user-profile-settings',
        instanceId: 'user-profile-settings',
        patch: { username: 'alice' },
      };
      capturedHandlers.forEach((h) => h(event));
    });

    expect(screen.getByDisplayValue('alice')).toBeTruthy();
  });
});
