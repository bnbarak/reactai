import React, { useEffect, useRef } from 'react'
import { useSession } from './SessionContext.js'
import { useAiState } from './useAiState.js'

interface ReactAiOptions {
  key: string
  description: string
}

export function reactAI<P extends object>(
  InnerComponent: React.ComponentType<P>,
  options: ReactAiOptions,
): React.ComponentType<P> {
  const { key } = options

  function AiWrappedComponent(baseProps: P) {
    const instanceId = useRef(crypto.randomUUID()).current
    const { sessionId, serverUrl } = useSession()
    const aiStatePatch = useAiState(key, instanceId)

    useEffect(() => {
      if (!sessionId) return

      fetch(`${serverUrl}/api/sessions/${sessionId}/instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          instanceId,
          currentProps: baseProps,
        }),
      })
    }, [sessionId])

    const effectiveProps = { ...baseProps, ...aiStatePatch } as P
    return <InnerComponent {...effectiveProps} />
  }

  AiWrappedComponent.displayName = `reactAI(${InnerComponent.displayName ?? InnerComponent.name})`
  return AiWrappedComponent
}
