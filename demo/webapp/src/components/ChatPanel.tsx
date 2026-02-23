import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'motion/react'
import { useSession } from '@bnbarak/reactai/react'
import { snapshotRegistry } from '@bnbarak/reactai/react'
import { markerRegistry } from '@bnbarak/reactai/react'
import { extractAccessibilityTree } from '@bnbarak/reactai/react'
import { useLoading } from '../LoadingContext.js'
import { useDebug } from '../DebugContext.js'

const MAX_TURNS = 4
const INTER_TURN_DELAY_MS = 300

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const PROMPT_GROUPS: Array<{ page: string; prompts: string[] }> = [
  {
    page: 'Portfolio',
    prompts: [
      'Go to Portfolio tab and change AAPL price to 210',
      'Go to Portfolio tab and make it look like a bad week',
    ],
  },
  {
    page: 'Dashboard',
    prompts: [
      'Go to Dashboard tab and simulate a bad week for the metrics',
      'Go to Dashboard tab and show a security incident alert',
      'Go to Dashboard tab and spike Friday activity to 99',
    ],
  },
  {
    page: 'Kanban',
    prompts: [
      'Go to Kanban tab and move the login bug to done',
      'Go to Kanban tab and reassign all of alice\'s tasks to bob',
      'Go to Kanban tab and mark all high priority cards as done',
    ],
  },
  {
    page: 'Store',
    prompts: [
      'Go to Store tab and feature the headphones on sale for $69',
      'Go to Store tab and run a flash sale — cut all prices 30%',
      'Go to Store tab and change the banner to announce free shipping',
    ],
  },
  {
    page: 'Music',
    prompts: [
      'Go to Music tab and switch to chill mode',
      'Go to Music tab, I\'m feeling sad — change the mood',
      'Go to Music tab and play track 3 at volume 90',
    ],
  },
]

export const ChatPanel = () => {
  const { sessionId, serverUrl } = useSession()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const { loading, setLoading } = useLoading()
  const { addTurn, clearTurns } = useDebug()
  const [isRecording, setIsRecording] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)

  useEffect(() => {
    setSpeechSupported(
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    )
  }, [])

  const doSubmit = useCallback(async (prompt: string) => {
    if (!sessionId || !prompt.trim() || loading) return

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

        const res = await fetch(`${serverUrl}/ai/prompt`, {
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
        if (!isDone) await new Promise((r) => setTimeout(r, INTER_TURN_DELAY_MS))
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'network error'
      replies.push(`[${turns}] ✗ ${error}`)
      addTurn({ turn: turns, success: false, error })
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: replies.join('\n') }])
    setLoading(false)
  }, [sessionId, serverUrl, loading])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    doSubmit(input.trim())
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doSubmit(input.trim())
    }
  }

  function handleMicClick() {
    const SpeechRecognitionCtor =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) return

    setIsRecording(true)
    const recognition = new SpeechRecognitionCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setIsRecording(false)
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)
    recognition.start()
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
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ color: sessionId ? '#999' : '#f0a500', fontSize: 11, margin: 0, lineHeight: 1.5 }}>
              {sessionId ? 'Click a prompt or type your own command below.' : 'Connecting to server…'}
            </p>
            {PROMPT_GROUPS.map((group) => (
              <div key={group.page}>
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    color: '#bbb',
                    marginBottom: 6,
                    fontWeight: 'bold',
                  }}
                >
                  {group.page}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {group.prompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => doSubmit(prompt)}
                      disabled={loading}
                      style={{
                        textAlign: 'left',
                        padding: '6px 10px',
                        border: '1px solid #e0e0e0',
                        background: 'white',
                        fontFamily: 'monospace',
                        fontSize: 11,
                        cursor: loading ? 'default' : 'pointer',
                        color: loading ? '#bbb' : '#333',
                        lineHeight: 1.4,
                        transition: 'background 0.1s, border-color 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        if (loading) return
                        e.currentTarget.style.background = '#f5f5f5'
                        e.currentTarget.style.borderColor = '#999'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.borderColor = '#e0e0e0'
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
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
          ))
        )}
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
          placeholder="Type or 🎤 a command… (Enter to send)"
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
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="submit"
            disabled={!sessionId || loading || !input.trim()}
            style={{
              flex: 1,
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
          {speechSupported && (
            <button
              type="button"
              onClick={handleMicClick}
              disabled={loading || isRecording}
              style={{
                width: 34,
                border: '1px solid black',
                background: isRecording ? 'black' : 'white',
                color: isRecording ? 'white' : 'black',
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isRecording ? (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  ●
                </motion.span>
              ) : (
                '🎤'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
