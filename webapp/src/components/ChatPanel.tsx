import React, { useState } from 'react'
import { useSession } from '../../../bridge/src/SessionContext.js'
import { snapshotRegistry } from '../../../bridge/src/SnapshotRegistry.js'
import { markerRegistry } from '../../../bridge/src/MarkerRegistry.js'
import { extractAccessibilityTree } from '../../../bridge/src/AccessibilityTreeExtractor.js'
import { useLoading } from '../LoadingContext.js'
import { useDebug } from '../DebugContext.js'

const SERVER_URL = 'http://localhost:3001'
const MAX_TURNS = 4

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export const ChatPanel = () => {
  const { sessionId } = useSession()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const { loading, setLoading } = useLoading()
  const { addTurn, clearTurns } = useDebug()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionId || !input.trim() || loading) return

    const prompt = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: prompt }])
    setLoading(true)
    clearTurns()

    let turns = 0
    let isDone = false
    const replies: string[] = []

    try {
      while (!isDone && turns < MAX_TURNS) {
        turns++
        const accessibilityTree = extractAccessibilityTree()
        const snapshot = snapshotRegistry.getAll()
        const markers = markerRegistry.getAll()
        const currentUrl = window.location.href

        const res = await fetch(`${SERVER_URL}/api/ai/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, prompt, snapshot, accessibilityTree, markers, currentUrl }),
        })
        const data = await res.json()

        if (data.applied) {
          const intent = data.reasoning ? `${data.reasoning}\n` : ''
          replies.push(`${intent}[${turns}] ✓ ${data.target?.key}: ${JSON.stringify(data.patch)}`)
          addTurn({ turn: turns, intent: data.reasoning, key: data.target?.key, patch: data.patch, success: true })
        } else {
          const error = data.errors?.join(', ') ?? 'unknown error'
          const intent = data.reasoning ? `${data.reasoning}\n` : ''
          replies.push(`${intent}[${turns}] ✗ ${error}`)
          addTurn({ turn: turns, intent: data.reasoning, success: false, error })
          break
        }

        isDone = data.isDone ?? true
        if (!isDone) await new Promise((r) => setTimeout(r, 100))
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'network error'
      replies.push(`[${turns}] ✗ ${error}`)
      addTurn({ turn: turns, success: false, error })
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: replies.join('\n') }])
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div
      style={{
        width: 280,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        borderRight: '2px solid black',
        fontFamily: 'monospace',
        background: 'white',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid black',
          fontWeight: 'bold',
          fontSize: 13,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        AI Chat
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: '#999', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Ask me to change anything on screen. Try:
            <br />
            <br />
            <em>"Go to settings and change username to alice"</em>
            <br />
            <em>"Change AAPL price to 210"</em>
            <br />
            <em>"Tell the player they're losing"</em>
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              padding: '8px 10px',
              background: m.role === 'user' ? 'black' : '#f0f0f0',
              color: m.role === 'user' ? 'white' : 'black',
              fontSize: 12,
              lineHeight: 1.5,
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%',
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>thinking…</div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ padding: 12, borderTop: '1px solid black', display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a command… (Enter to send)"
          rows={3}
          disabled={!sessionId}
          style={{
            padding: 8,
            border: '1px solid black',
            fontFamily: 'monospace',
            fontSize: 12,
            resize: 'none',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!sessionId || loading || !input.trim()}
          style={{
            padding: '7px 0',
            border: '1px solid black',
            background: !sessionId || loading || !input.trim() ? '#eee' : 'black',
            color: !sessionId || loading || !input.trim() ? '#999' : 'white',
            fontFamily: 'monospace',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 'bold',
          }}
        >
          {!sessionId ? 'connecting…' : loading ? 'thinking…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
