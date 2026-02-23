import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('SseClient', () => {
  let mockSource: {
    onmessage: ((e: MessageEvent) => void) | null;
    onerror: (() => void) | null;
    close: ReturnType<typeof vi.fn>;
  };
  let EventSourceMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockSource = { onmessage: null, onerror: null, close: vi.fn() };
    EventSourceMock = vi.fn(() => mockSource);
    vi.stubGlobal('EventSource', EventSourceMock);

    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('connect', () => {
    it('connect_newSession_createsEventSource', async () => {
      const { sseClient } = await import('../SseClient.js');

      sseClient.connect('session-1', 'http://localhost:3001/api');

      expect(EventSourceMock).toHaveBeenCalledWith('http://localhost:3001/api/sse/session-1');
    });

    it('connect_calledTwice_createsOnlyOneSource', async () => {
      const { sseClient } = await import('../SseClient.js');

      sseClient.connect('session-1', 'http://localhost:3001/api');
      sseClient.connect('session-1', 'http://localhost:3001/api');

      expect(EventSourceMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('subscribe_withHandler_callsOnMessage', async () => {
      const { sseClient } = await import('../SseClient.js');
      sseClient.connect('session-1', 'http://localhost:3001/api');
      const handler = vi.fn();

      sseClient.subscribe('session-1', handler);
      mockSource.onmessage!({
        data: JSON.stringify({ type: 'patch', key: 'card', instanceId: 'i1', patch: {} }),
      } as MessageEvent);

      expect(handler).toHaveBeenCalledOnce();
    });

    it('subscribe_unsubscribed_doesNotCallHandler', async () => {
      const { sseClient } = await import('../SseClient.js');
      sseClient.connect('session-1', 'http://localhost:3001/api');
      const handler = vi.fn();

      const unsub = sseClient.subscribe('session-1', handler);
      unsub();
      mockSource.onmessage!({
        data: JSON.stringify({ type: 'patch', key: 'card', instanceId: 'i1', patch: {} }),
      } as MessageEvent);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('disconnect_existingSession_closesSource', async () => {
      const { sseClient } = await import('../SseClient.js');
      sseClient.connect('session-1', 'http://localhost:3001/api');

      sseClient.disconnect('session-1');

      expect(mockSource.close).toHaveBeenCalled();
    });
  });
});
