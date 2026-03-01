import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

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
  useStateWithAi: (_description: string, initialState: Record<string, unknown>) => {
    const [state, setState] = React.useState(initialState);
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
        ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) =>
          React.createElement(tag, rest, children),
    },
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('chess.js', () => ({
  Chess: class {
    fen() {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    turn() {
      return 'w';
    }
    moves() {
      return [];
    }
    move() {
      return null;
    }
    isGameOver() {
      return false;
    }
    isCheckmate() {
      return false;
    }
    isDraw() {
      return false;
    }
    isCheck() {
      return false;
    }
    reset() {}
  },
}));

import { AppLayout } from '../components/AppLayout.js';

describe('AppLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribe.mockReturnValue(() => {});
  });

  it('appLayout_defaultSearch_showsSearchPage', async () => {
    render(<AppLayout activePage="search" />);

    await waitFor(() => expect(screen.getByPlaceholderText(/search/i)).toBeTruthy());
  });

  it('appLayout_clickChess_showsChessPage', async () => {
    render(<AppLayout activePage="search" />);

    await userEvent.click(screen.getByRole('button', { name: 'Chess' }));

    await waitFor(() => expect(screen.getByText('Chess')).toBeTruthy());
  });

  it('appLayout_activePage_chess_showsChessPage', async () => {
    render(<AppLayout activePage="chess" />);

    await waitFor(() => expect(screen.getByText('Chess')).toBeTruthy());
  });
});
