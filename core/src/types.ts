export type JsonSchema = Record<string, unknown>

export interface ComponentManifest {
  key: string
  description: string
  filePath: string
  aiWritableProps: string[]
  propsJsonSchema: JsonSchema
  contextSummary?: string
}

export interface MountedInstance {
  key: string
  instanceId: string
  currentProps?: Record<string, unknown>
  description?: string       // self-describing: provided by useStateWithAi
  aiWritableProps?: string[] // self-describing: provided by useStateWithAi
  context?: Record<string, unknown> // read-only context: enum options, ranges, labels, etc.
}

export interface PatchRequest {
  sessionId: string
  key: string
  instanceId: string
  patch: Record<string, unknown>
  source: 'llm' | 'direct'
}

export type SseEvent =
  | { type: 'patch'; key: string; instanceId: string; patch: Record<string, unknown> }
  | { type: 'snapshot'; key: string; instanceId: string; state: Record<string, unknown> }
  | { type: 'error'; message: string }
  | { type: 'ack'; requestId: string; applied: boolean }

export interface SdkResult {
  target: { key: string; instanceId: string } | null
  patch: Record<string, unknown> | null
  applied: boolean
  errors?: string[]
  reasoning?: string
  isDone?: boolean
}
