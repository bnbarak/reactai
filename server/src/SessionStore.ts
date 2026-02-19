import type { MountedInstance } from '../../core/src/types.js'

interface InstanceData {
  key: string
  aiState: Record<string, unknown>
}

export class SessionStore {
  private sessions = new Map<string, Map<string, InstanceData>>()

  createSession(): string {
    const id = crypto.randomUUID()
    this.sessions.set(id, new Map())
    return id
  }

  registerInstance(sessionId: string, instance: MountedInstance): void {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)
    session.set(instance.instanceId, {
      key: instance.key,
      aiState: instance.currentProps ?? {},
    })
  }

  getInstances(sessionId: string): MountedInstance[] {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)
    return Array.from(session.entries()).map(([instanceId, data]) => ({
      key: data.key,
      instanceId,
      currentProps: data.aiState,
    }))
  }

  applyPatch(sessionId: string, instanceId: string, patch: Record<string, unknown>): void {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)
    const instance = session.get(instanceId)
    if (!instance) throw new Error(`Instance not found: ${instanceId}`)
    instance.aiState = { ...instance.aiState, ...patch }
  }

  getAiState(sessionId: string, instanceId: string): Record<string, unknown> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error(`Session not found: ${sessionId}`)
    const instance = session.get(instanceId)
    if (!instance) throw new Error(`Instance not found: ${instanceId}`)
    return instance.aiState
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId)
  }
}
