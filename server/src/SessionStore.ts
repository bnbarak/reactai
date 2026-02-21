export interface SessionStore {
  createSession(): string
  hasSession(sessionId: string): boolean
}

export class InMemorySessionStore implements SessionStore {
  private sessions = new Set<string>()

  createSession(): string {
    const id = crypto.randomUUID()
    this.sessions.add(id)
    return id
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }
}
