import React, { createContext, useContext, useEffect, useState } from 'react'
import { sseClient } from './SseClient.js'

interface SessionContextValue {
  sessionId: string | null
  serverUrl: string
}

const SessionContext = createContext<SessionContextValue>({
  sessionId: null,
  serverUrl: 'http://localhost:3001/api',
})

interface SessionProviderProps {
  children: React.ReactNode
  serverUrl?: string
}

export const SessionProvider = ({
  children,
  serverUrl = 'http://localhost:3001/api',
}: SessionProviderProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    fetch(`${serverUrl}/sessions`, { method: 'POST' })
      .then((r) => r.json())
      .then(({ sessionId: id }: { sessionId: string }) => {
        if (!mounted) return
        setSessionId(id)
        sseClient.connect(id, serverUrl)
      })

    return () => {
      mounted = false
      if (sessionId) sseClient.disconnect(sessionId)
    }
  }, [serverUrl])

  return (
    <SessionContext.Provider value={{ sessionId, serverUrl }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = (): SessionContextValue => useContext(SessionContext)
