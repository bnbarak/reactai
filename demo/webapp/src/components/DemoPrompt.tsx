import { useState, useContext } from 'react'
import { useSession } from '@bnbarak/reactai/react'

export function DemoPrompt() {
  const { sessionId, serverUrl } = useSession()
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [lastResult, setLastResult] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sessionId || !prompt.trim()) return

    setStatus('loading')
    setLastResult(null)

    const res = await fetch(`${serverUrl}/ai/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, prompt }),
    })

    const data = await res.json()

    if (data.applied) {
      setStatus('success')
      setLastResult(`Applied to: ${data.target?.key} / ${data.target?.instanceId}`)
    } else {
      setStatus('error')
      setLastResult(data.errors?.join(', ') ?? 'Unknown error')
    }

    setPrompt('')
  }

  return (
    <div style={{ padding: 16, border: '1px solid #eee', borderRadius: 8, marginTop: 24 }}>
      <h3 style={{ margin: '0 0 8px' }}>AI Prompt</h3>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. Make the card title say 'Hello World'"
          rows={2}
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <button
          type="submit"
          disabled={!sessionId || status === 'loading' || !prompt.trim()}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          {status === 'loading' ? 'Thinking…' : 'Send'}
        </button>
      </form>
      {lastResult && (
        <p style={{ margin: '8px 0 0', color: status === 'error' ? 'red' : 'green', fontSize: 13 }}>
          {lastResult}
        </p>
      )}
      {!sessionId && (
        <p style={{ margin: '8px 0 0', color: '#999', fontSize: 12 }}>Connecting to session…</p>
      )}
    </div>
  )
}
