import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type React from 'react';
import type { SseEvent } from 'react-ai-core';
import { useSession } from './SessionContext.js';
import { sseClient } from './SseClient.js';
import { snapshotRegistry } from './SnapshotRegistry.js';

function toKey(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function useStateWithAi<T extends Record<string, unknown>>(
  description: string,
  initialState: T,
  context?: Record<string, unknown>,
): [T, React.Dispatch<React.SetStateAction<T>>, React.RefObject<HTMLElement | null>] {
  const key = useRef(toKey(description)).current;
  const instanceId = key;
  const aiWritableProps = useRef(Object.keys(initialState)).current;
  const { sessionId } = useSession();
  const [state, setState] = useState<T>(initialState);
  const aiRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    aiRef.current?.setAttribute('data-ai-id', instanceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instanceId is derived from a ref, stable for component lifetime
  }, []);

  useEffect(() => {
    snapshotRegistry.set(instanceId, { key, state, description, aiWritableProps, context });
    return () => snapshotRegistry.remove(instanceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key/instanceId/aiWritableProps are stable refs; only re-snapshot when state changes
  }, [state]);

  useEffect(() => {
    if (!sessionId) return;
    return sseClient.subscribe(sessionId, (event: SseEvent) => {
      if (event.type === 'patch' && event.key === key && event.instanceId === instanceId) {
        setState((prev) => ({ ...prev, ...event.patch }) as T);
      } else if (
        event.type === 'snapshot' &&
        event.key === key &&
        event.instanceId === instanceId
      ) {
        setState(event.state as T);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- instanceId === key, already in deps
  }, [sessionId, key]);

  return [state, setState, aiRef];
}
