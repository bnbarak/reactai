import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import type React from 'react'
import type { SseEvent } from '../../core/src/types.js'
import { useSession } from './SessionContext.js'
import { sseClient } from './SseClient.js'
import { snapshotRegistry } from './SnapshotRegistry.js'

function toKey(description: string): string {
  return description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function useStateWithAi<T extends Record<string, unknown>>(
  description: string,
  initialState: T,
  context?: Record<string, unknown>,
): [T, React.Dispatch<React.SetStateAction<T>>, React.RefObject<HTMLElement | null>] {
  const key = useRef(toKey(description)).current
  const instanceId = key
  const aiWritableProps = useRef(Object.keys(initialState)).current
  const { sessionId } = useSession()
  const [state, setState] = useState<T>(initialState)
  const aiRef = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    aiRef.current?.setAttribute('data-ai-id', instanceId)
  }, [])

  useEffect(() => {
    snapshotRegistry.set(instanceId, { key, state, description, aiWritableProps, context })
    return () => snapshotRegistry.remove(instanceId)
  }, [state])

  useEffect(() => {
    if (!sessionId) return
    return sseClient.subscribe(sessionId, (event: SseEvent) => {
      if (event.type === 'patch' && event.key === key && event.instanceId === instanceId) {
        setState((prev) => ({ ...prev, ...event.patch }) as T)
      } else if (event.type === 'snapshot' && event.key === key && event.instanceId === instanceId) {
        setState(event.state as T)
      }
    })
  }, [sessionId, key])

  return [state, setState, aiRef]
}
