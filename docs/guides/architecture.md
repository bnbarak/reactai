# Architecture

reactAI is a closed-loop system: React state → prompt → LLM → patch → React state.

## The core loop

```
Mount:
  Components register their current state in a client-side SnapshotRegistry

Prompt:
  Your app posts { prompt, snapshot } to the server
  Server merges the live snapshot with the static registry
  One LLM call returns { key, instanceId, patch }
  Server broadcasts the patch via SSE

Apply:
  Bridge receives the SSE event
  The matching component merges the patch into React state
  Component re-renders
```

## Design principles

**All state lives on the client.**
The server never stores component state between requests. Every prompt submission sends a full snapshot of all currently mounted AI-controllable components. This keeps the server stateless and horizontally scalable — no sticky sessions, no shared memory.

**One LLM call per turn.**
A single Anthropic API call selects the target component *and* generates the patch in one shot. No two-step "select then generate" flow. This halves latency and keeps the context small.

**Components describe themselves.**
With `useStateWithAi`, the component description, current state, and writable props all travel with every prompt. The AI always sees fresh context — no stale cache, no separate sync step.

**Fail fast.**
The server throws on startup if `registryPath` is given but the file doesn't exist. Patches that reference non-AI-writable props are rejected with 422. There is no silent fallback to an empty state.

## Packages

| Package | What it does | Who uses it |
|---------|-------------|-------------|
| `server` | Express router — sessions, SSE, patch validation, AI prompt | Your backend |
| `bridge` | React hooks + HOC + SSE client | Your React app |
| `scanner` | Build-time CLI — AST scan → `registry.json` | Your CI / build step |
| `sdk` | LLM orchestration (Anthropic) | Passed into `server` |
| `core` | Shared TypeScript types | All packages |

`demo/server` and `demo/webapp` are not published — they're the development sandbox that uses all packages as a consumer would.

## Two component patterns

| Pattern | When to use | Scanner needed? |
|---------|-------------|-----------------|
| `useStateWithAi()` | State owned by the component (form fields, toggles, display values) | No |
| `reactAI()` HOC | Prop-based components from a design system or library | Yes |

Prefer `useStateWithAi` for new components. Use the HOC when you can't modify the component's internals.

## Data shapes

**Snapshot** (sent with every prompt):
```ts
MountedInstance {
  key: string          // derived from description or HOC config
  instanceId: string   // stable per mount
  description: string
  aiWritableProps: string[]
  currentProps: Record<string, unknown>
  context?: Record<string, unknown>  // enum options for selects, etc.
}
```

**Patch event** (broadcast via SSE):
```ts
SseEvent {
  type: 'patch'
  key: string
  instanceId: string
  patch: Record<string, unknown>
}
```
