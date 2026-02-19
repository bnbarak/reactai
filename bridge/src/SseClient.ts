import type { SseEvent } from '../../core/src/types.js'

type EventHandler = (event: SseEvent) => void

class SseClientManager {
  private sources = new Map<string, EventSource>()
  private handlers = new Map<string, Set<EventHandler>>()
  private baseUrls = new Map<string, string>()

  connect(sessionId: string, baseUrl: string): void {
    if (this.sources.has(sessionId)) return

    this.baseUrls.set(sessionId, baseUrl)
    this.openConnection(sessionId, baseUrl)
  }

  private openConnection(sessionId: string, baseUrl: string): void {
    const source = new EventSource(`${baseUrl}/api/sse/${sessionId}`)

    source.onmessage = (e: MessageEvent) => {
      const event: SseEvent = JSON.parse(e.data)
      const handlers = this.handlers.get(sessionId)
      if (handlers) handlers.forEach((h) => h(event))
    }

    source.onerror = () => {
      source.close()
      this.sources.delete(sessionId)
      setTimeout(() => {
        const url = this.baseUrls.get(sessionId)
        if (url) this.openConnection(sessionId, url)
      }, 1000)
    }

    this.sources.set(sessionId, source)
  }

  subscribe(sessionId: string, handler: EventHandler): () => void {
    if (!this.handlers.has(sessionId)) this.handlers.set(sessionId, new Set())
    this.handlers.get(sessionId)!.add(handler)
    return () => this.handlers.get(sessionId)?.delete(handler)
  }

  disconnect(sessionId: string): void {
    this.sources.get(sessionId)?.close()
    this.sources.delete(sessionId)
    this.handlers.delete(sessionId)
    this.baseUrls.delete(sessionId)
  }
}

export const sseClient = new SseClientManager()
