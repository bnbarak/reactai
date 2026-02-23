import { useState, useEffect } from 'react';
import type { SseEvent } from 'react-ai-core/src/types.js';
import { useSession } from './SessionContext.js';
import { sseClient } from './SseClient.js';

export function useAiState(key: string, instanceId: string): Record<string, unknown> {
  const { sessionId } = useSession();
  const [aiStatePatch, setAiStatePatch] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!sessionId) return;

    return sseClient.subscribe(sessionId, (event: SseEvent) => {
      if (event.type === 'patch' && event.key === key && event.instanceId === instanceId) {
        setAiStatePatch((prev) => ({ ...prev, ...event.patch }));
      } else if (
        event.type === 'snapshot' &&
        event.key === key &&
        event.instanceId === instanceId
      ) {
        setAiStatePatch(event.state);
      }
    });
  }, [sessionId, key, instanceId]);

  return aiStatePatch;
}
