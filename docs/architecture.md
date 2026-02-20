# reactAI Architecture

reactAI lets an AI model update React component state at runtime via natural language prompts.

## How it works

```
User types prompt
       ↓
ChatPanel sends { sessionId, prompt, snapshot }
       ↓
Server (POST /api/ai/prompt)
  → merges registry manifests + snapshot manifests
  → calls SDK (one LLM call)
  → broadcasts SSE patch event
       ↓
SseClient receives event
  → dispatches to useAiState / useStateWithAi subscribers
       ↓
React state updates → re-render
```

## Packages

| Package  | Role |
|----------|------|
| `scanner` | Build-time AST scan → `registry.json` (component descriptions + schemas) |
| `server`  | Express HTTP + SSE control plane; stateless — no server-side component state |
| `sdk`     | LLM orchestration; single Anthropic call returns `{ key, instanceId, patch }` |
| `bridge`  | React side: `reactAI()` HOC, `useStateWithAi()` hook, SSE client, snapshot registry |
| `core`    | Shared TypeScript types |
| `webapp`  | Demo Vite/React app |

## State model

All component state lives **on the client** in `SnapshotRegistry` (a module-level singleton).
Every prompt submission sends a full snapshot of all mounted AI-controllable state to the server.
The server is stateless — it does not track component state between requests.

## Two ways to make a component AI-controllable

### 1. `reactAI()` HOC — for class-based component libraries

```tsx
const AiCard = reactAI(Card, { key: 'demo-card', description: 'A product card' })
// scanner must have found Card's props via @reactAi annotation
<AiCard title="Hello" />
```

### 2. `useStateWithAi()` hook — for state inside components

```tsx
const [profile, setProfile] = useStateWithAi('User profile settings', { username: 'barak' })
// key is auto-derived: "user-profile-settings"
// no scanner annotation needed
```

## Data flow detail

```
Mount:
  useStateWithAi / reactAI HOC
    → snapshotRegistry.set(instanceId, { key, description, state, aiWritableProps })

Prompt:
  ChatPanel
    → POST /api/ai/prompt { sessionId, prompt, snapshot: snapshotRegistry.getAll() }
  Server
    → builds manifests from snapshot (description + aiWritableProps + derived JSON Schema)
    → calls sdk.updateFromPrompt(prompt, manifests, snapshot)
  SDK (CombinedSelector)
    → one LLM call → { key, instanceId, patch }
  Server
    → sseManager.send(sessionId, { type: 'patch', key, instanceId, patch })
  Bridge (useAiState / useStateWithAi)
    → applies patch → React setState → re-render
    → snapshotRegistry.set updated state
```
