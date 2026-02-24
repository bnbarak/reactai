# API Reference

## Client — `@bnbarak/reactai/react`

---

### `<SessionProvider>`

Wrap your app once at the root. Creates a session with the server on mount, opens the SSE connection, and makes `sessionId` and `serverUrl` available to all hooks below it.

```tsx
import { SessionProvider } from '@bnbarak/reactai/react'

<SessionProvider serverUrl="http://localhost:3001/api">
  <App />
</SessionProvider>
```

**Props**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `serverUrl` | `string` | `"http://localhost:3001/api"` | Base URL of the reactAI router mount path |
| `children` | `ReactNode` | — | |

**Behaviour**

- On mount: `POST /sessions` → receives `sessionId` → opens `GET /sse/:sessionId`
- Retries session creation up to 10 times with 1.5s backoff if the server is unavailable
- On unmount: closes the SSE connection

---

### `useStateWithAi(description, initialState, context?)`

Drop-in replacement for `useState`. The component registers itself as AI-controllable and subscribes to patches from the server.

```tsx
const [state, setState, aiRef] = useStateWithAi(
  'User profile settings',
  { username: 'barak', language: 'English' },
  { language: ['English', 'Hebrew', 'Spanish'] },
)
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `description` | `string` | Human-readable description of what this component represents. Becomes the component key. |
| `initialState` | `T extends Record<string, unknown>` | Initial state values. All top-level keys are automatically AI-writable. |
| `context` | `Record<string, unknown>` | Optional. Enum options, ranges, or labels for props. Passed to the AI as allowed values. |

**Returns** `[T, Dispatch<SetStateAction<T>>, RefObject<HTMLElement | null>]`

| | Type | Description |
|-|------|-------------|
| `state` | `T` | Current state, identical to `useState` |
| `setState` | `Dispatch<SetStateAction<T>>` | Standard React state setter |
| `aiRef` | `RefObject<HTMLElement>` | Attach to your root element. Sets `data-ai-id` for the accessibility tree snapshot. |

**Key derivation**

The description is slugified to produce a stable key:

```
"User profile settings" → "user-profile-settings"
```

This key identifies the component in patches and SSE events.

**Singleton behaviour**

Two components with the same description share one AI key. All instances update simultaneously when a patch arrives for that key. Use this intentionally when multiple parts of the UI represent the same logical state (e.g. a username in a header and in a settings form).

**What is AI-writable**

All keys present in `initialState` are AI-writable. There is no annotation step — the hook derives `aiWritableProps` from `Object.keys(initialState)` at mount time.

!!! note "No scanner required"
    `useStateWithAi` is fully self-describing. It sends its own description, writable props, current state, and context with every prompt. No `registry.json` needed.

---

### `reactAI(Component, options)`

Higher-order component that makes a prop-based component AI-controllable. The AI can override specific props independently per mounted instance.

```tsx
import { reactAI } from '@bnbarak/reactai/react'

export const AiCard = reactAI(DemoCard, {
  key: 'demo-card',
  description: 'A product card showing a title and CTA',
})

// Use exactly like the original component
<AiCard title="Hello" onButtonClick={handleClick} />
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `Component` | `React.ComponentType<P>` | The component to wrap |
| `options.key` | `string` | Stable identifier. Must match the `@key` annotation in the props interface. |
| `options.description` | `string` | What this component represents. Sent to the AI for targeting. |

**Returns** `React.ComponentType<P>`

The returned component behaves identically to the original. Base props are always passed through. The AI can only override props listed in `aiWritableProps` from `registry.json` — function props are never included.

**Per-instance identity**

Each mount of the wrapped component gets a random stable `instanceId` via `crypto.randomUUID()`. Multiple cards in a list are independently addressable — the AI can target "the second card" or "the card with title X".

**DOM wrapper**

The HOC renders a `display: contents` `<div>` with `data-ai-id` and `data-ai-key` attributes around the inner component. This wrapper is invisible to layout.

**Requires scanner**

The HOC reads `aiWritableProps` from `registry.json` at runtime. The component's props interface must be annotated with `@reactAi` and scanned before the server starts. See [Architecture → Scanner](guides/architecture.md#scanner).

---

### `useAiMarker(name, value)`

Registers a named ambient value in the marker registry. The AI receives all current markers with every prompt — use this to tell the agent what page, mode, or context is active.

```tsx
import { useAiMarker } from '@bnbarak/reactai/react'

export const AppLayout = ({ page }: { page: string }) => {
  useAiMarker('activePage', page)
  return <div>...</div>
}
```

**Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Marker key |
| `value` | `unknown` | Any serialisable value — string, number, object |

The marker is registered on mount and removed on unmount. Updates when `value` changes.

**Why this matters**

Without markers, the AI only sees the components currently on screen. Markers let you inject context that isn't tied to any specific component:

```tsx
useAiMarker('activePage', 'kanban')
useAiMarker('userRole', 'admin')
useAiMarker('featureFlags', { darkMode: true, betaCheckout: false })
```

The AI can then reason: "the user asked to update the kanban board — I can see `activePage: kanban`, so I'll target the kanban components."

---

### `useSession()`

Returns the current session context. Use this to read `sessionId` and `serverUrl` when building a custom prompt sender.

```tsx
import { useSession } from '@bnbarak/reactai/react'

const { sessionId, serverUrl } = useSession()

await fetch(`${serverUrl}/ai/prompt`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, prompt, snapshot }),
})
```

**Returns**

| | Type | Description |
|-|------|-------------|
| `sessionId` | `string \| null` | `null` until the session is created (async on mount) |
| `serverUrl` | `string` | The URL passed to `SessionProvider` |

---

### `snapshotRegistry`

Module singleton. Holds the current state of all mounted AI-controllable components. Call `getAll()` to build the `snapshot` payload for a prompt request.

```tsx
import { snapshotRegistry } from '@bnbarak/reactai/react'

const snapshot = snapshotRegistry.getAll()

await fetch(`${serverUrl}/ai/prompt`, {
  method: 'POST',
  body: JSON.stringify({ sessionId, prompt, snapshot }),
})
```

**Methods**

| Method | Signature | Description |
|--------|-----------|-------------|
| `getAll()` | `() => MountedInstance[]` | Returns all currently mounted AI-controllable instances |
| `set()` | `(instanceId, entry) => void` | Called internally by hooks — do not call directly |
| `remove()` | `(instanceId) => void` | Called internally on unmount — do not call directly |

---

## Server — `@bnbarak/reactai/server`

---

### `createReactAiRouter(options?)`

Creates an Express router with all reactAI routes. Mount it at any path in your existing app.

```ts
import { createReactAiRouter } from '@bnbarak/reactai/server'

app.use('/api', createReactAiRouter({
  registryPath: './registry.json',
  sdk,
}))
```

**Options**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `registryPath` | `string` | — | Path to `registry.json`. Loaded synchronously at startup. Throws if the file is missing. |
| `manifests` | `ComponentManifest[]` | — | Provide pre-loaded manifests directly instead of a file path. Takes precedence over `registryPath`. |
| `sdk` | `AiSdkLike` | — | LLM SDK instance. If omitted, the `POST /ai/prompt` route is not registered. |

!!! warning "Fail-fast on missing registry"
    If `registryPath` is set and the file doesn't exist, `createReactAiRouter` throws immediately at startup. Run `npm run scan` before starting the server.

---

### Routes

All paths are relative to the router mount point.

---

#### `POST /sessions`

Creates a new session. Called automatically by `SessionProvider` on mount.

**Response — 201**
```json
{ "sessionId": "550e8400-e29b-41d4-a716-446655440000" }
```

---

#### `GET /sse/:sessionId`

Opens a long-lived SSE stream for the given session. Called automatically by the bridge after session creation.

The bridge reconnects automatically on connection loss (1s backoff).

**Events** — newline-delimited JSON:

```
data: {"type":"patch","key":"demo-card","instanceId":"abc123","patch":{"title":"New title"}}

data: {"type":"snapshot","key":"user-profile","instanceId":"user-profile","state":{"username":"alice"}}

data: {"type":"error","message":"Patch validation failed"}

data: {"type":"ack","requestId":"req-1","applied":true}
```

**`SseEvent` union**

| `type` | Fields | Description |
|--------|--------|-------------|
| `patch` | `key`, `instanceId`, `patch` | Merge patch into component state |
| `snapshot` | `key`, `instanceId`, `state` | Replace component state entirely |
| `error` | `message` | Server-side error |
| `ack` | `requestId`, `applied` | Confirmation of a direct patch |

---

#### `GET /registry`

Returns all component manifests from `registry.json`.

**Response — 200**
```json
[
  {
    "key": "demo-card",
    "description": "A product card showing a title and CTA",
    "filePath": "src/components/DemoCard.tsx",
    "aiWritableProps": ["title", "body"],
    "propsJsonSchema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "body": { "type": "string" }
      },
      "required": ["title"]
    }
  }
]
```

---

#### `GET /registry/:key`

Returns the manifest for a single component.

**Response — 404** if the key is not found:
```json
{ "error": "Component 'unknown-key' not found" }
```

---

#### `POST /patches`

Applies a patch directly — no LLM involved. Validates the patch against `aiWritableProps`, then broadcasts via SSE.

**Request**
```json
{
  "sessionId": "550e8400-...",
  "key": "demo-card",
  "instanceId": "abc123",
  "patch": { "title": "Direct update" }
}
```

**Response — 200**
```json
{ "applied": true }
```

**Response — 422** if any patch key is not in `aiWritableProps`:
```json
{
  "applied": false,
  "errors": ["Prop 'onButtonClick' is not AI-writable for component 'demo-card'"]
}
```

**Response — 404** if `sessionId` is unknown.

---

#### `POST /ai/prompt`

Main AI entry point. Accepts a natural language prompt and a snapshot of all currently mounted components. Returns the patch that was applied.

**Request**
```json
{
  "sessionId": "550e8400-...",
  "prompt": "Change the username to alice",
  "snapshot": [
    {
      "key": "user-profile-settings",
      "instanceId": "user-profile-settings",
      "description": "User profile settings",
      "aiWritableProps": ["username", "language"],
      "currentProps": { "username": "barak", "language": "English" },
      "context": { "language": ["English", "Hebrew", "Spanish"] }
    }
  ],
  "accessibilityTree": "...",
  "markers": { "activePage": "settings" },
  "currentUrl": "/settings"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `sessionId` | ✓ | Active session from `POST /sessions` |
| `prompt` | ✓ | Natural language instruction |
| `snapshot` | ✓ | `MountedInstance[]` from `snapshotRegistry.getAll()` |
| `accessibilityTree` | — | Serialised accessibility tree of the current page. Provides visual context. |
| `markers` | — | Key/value context from `useAiMarker` calls |
| `currentUrl` | — | Current browser URL |

**Response — 200**
```json
{
  "target": { "key": "user-profile-settings", "instanceId": "user-profile-settings" },
  "patch": { "username": "alice" },
  "applied": true,
  "isDone": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `{ key, instanceId } \| null` | The component that was updated |
| `patch` | `Record<string, unknown> \| null` | The values that were set |
| `applied` | `boolean` | Whether the patch was broadcast via SSE |
| `isDone` | `boolean` | `false` signals the client to send another turn (multi-step task) |
| `errors` | `string[]` | Present when `applied` is false |

When `applied` is `true`, the patch is immediately broadcast to the session's SSE stream before the response is sent.

---

## Types — `react-ai-core`

---

### `ComponentManifest`

Static description of a component, produced by the scanner and loaded by the server.

```ts
interface ComponentManifest {
  key: string                    // stable identifier, e.g. "demo-card"
  description: string            // what the AI sees when selecting a target
  filePath: string               // source file (informational)
  aiWritableProps: string[]      // props the AI is allowed to set
  propsJsonSchema: JsonSchema    // JSON Schema derived from the TypeScript interface
  contextSummary?: string        // optional extra context injected into the prompt
}
```

---

### `MountedInstance`

Live snapshot of one mounted component instance, collected by the bridge and sent with every prompt.

```ts
interface MountedInstance {
  key: string                         // matches ComponentManifest.key
  instanceId: string                  // stable per mount (slugified key or UUID)
  currentProps?: Record<string, unknown>  // current state values
  description?: string                // self-describing (useStateWithAi only)
  aiWritableProps?: string[]          // self-describing (useStateWithAi only)
  context?: Record<string, unknown>   // enum options, ranges, etc.
}
```

For `useStateWithAi`, `description` and `aiWritableProps` are set by the hook. For `reactAI()` HOC, they come from `registry.json`.

---

### `SseEvent`

Union type for all events broadcast over the SSE stream.

```ts
type SseEvent =
  | { type: 'patch';    key: string; instanceId: string; patch: Record<string, unknown> }
  | { type: 'snapshot'; key: string; instanceId: string; state: Record<string, unknown> }
  | { type: 'error';    message: string }
  | { type: 'ack';      requestId: string; applied: boolean }
```

---

### `SdkResult`

Return type of `AiSdkLike.updateFromPrompt`. Also the response shape of `POST /ai/prompt`.

```ts
interface SdkResult {
  target:  { key: string; instanceId: string } | null
  patch:   Record<string, unknown> | null
  applied: boolean
  errors?: string[]
  isDone?: boolean
}
```

---

### `AiSdkLike`

Interface the server depends on. Implement this to use any LLM provider.

```ts
interface AiSdkLike {
  updateFromPrompt(
    prompt: string,
    manifests: ComponentManifest[],
    mountedSnapshot: MountedInstance[],
    accessibilityTree?: string,
    markers?: Record<string, unknown>,
    currentUrl?: string,
  ): Promise<SdkResult>
}
```
