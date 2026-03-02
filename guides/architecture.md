# Architecture

reactAI is a closed-loop system: React state → prompt → LLM → patch → React state.

## How it works

A user types a prompt. The bridge collects a snapshot of all currently mounted AI-controllable components and posts it to the server. The server makes a single LLM call that selects the target component and produces the patch. The patch is broadcast via SSE. The matching component merges it into React state and re-renders.

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
The server throws on startup if `registryPath` is given but the file doesn't exist. Patches that reference non-AI-writable props are rejected with 422. There is no silent fallback.

## Packages

| Package | What it does | Who uses it |
|---------|-------------|-------------|
| `server` | Express router — sessions, SSE, patch validation, AI prompt | Your backend |
| `bridge` | React hooks + HOC + SSE client | Your React app |
| `scanner` | Build-time CLI — AST scan → `registry.json` | Your CI / build step |
| `sdk` | LLM orchestration (Anthropic) | Passed into `server` |
| `core` | Shared TypeScript types | All packages |

`demo/server` and `demo/webapp` are not published — they're the development sandbox.

## Two component patterns

| Pattern | When to use | Scanner needed? |
|---------|-------------|-----------------|
| `useStateWithAi()` | State owned by the component (form fields, toggles, display values) | No |
| `reactAI()` HOC | Prop-based components from a design system or library | Yes |

Prefer `useStateWithAi` for new components. Use the HOC when you can't modify the component's internals.

---

## Bridge (React)

The bridge is how your React components become AI-controllable. It handles session management, state registration, and applying AI patches — so your components just render normally.

### `SessionProvider`

Wrap your app once at the root. It creates a server session on mount and makes `sessionId` and `serverUrl` available throughout the tree.

```tsx
import { SessionProvider } from '@bnbarak/reactai/react'

export default function App() {
  return (
    <SessionProvider serverUrl="http://localhost:3001/api">
      <YourApp />
    </SessionProvider>
  )
}
```

| Prop | Type | Description |
|------|------|-------------|
| `serverUrl` | `string` | Full URL including the mount path. Defaults to `http://localhost:3001/api`. |
| `children` | `ReactNode` | Your app. |

!!! tip "Same-origin deployment"
    When your React app and server are on the same domain, use a relative URL:
    ```tsx
    <SessionProvider serverUrl="/api">
    ```

### `useStateWithAi`

Drop-in replacement for `useState`. Give your state a description — the AI uses it to understand what this state represents.

```tsx
import { useStateWithAi } from '@bnbarak/reactai/react'

export const ProfileForm = () => {
  const [state, setState, aiRef] = useStateWithAi(
    'User profile settings',
    { username: 'barak', language: 'English' },
    { language: ['English', 'Hebrew', 'Spanish'] },  // context: enum options
  )

  return (
    <div ref={aiRef}>
      <input
        value={state.username}
        onChange={e => setState({ ...state, username: e.target.value })}
      />
      <select
        value={state.language}
        onChange={e => setState({ ...state, language: e.target.value })}
      >
        {['English', 'Hebrew', 'Spanish'].map(l => <option key={l}>{l}</option>)}
      </select>
    </div>
  )
}
```

**Key derivation:** The description is slugified to become the component key.
`"User profile settings"` → `"user-profile-settings"`

**`aiRef`:** Attach to your root DOM element. The bridge uses it to set `data-ai-id` for the accessibility tree snapshot.

**`context`:** Optional third argument. Pass arrays of valid options for enum-like props. The AI receives these as allowed values.

**Singleton behaviour:** Two components with the same description share the same AI key. This is intentional — if you have a `username` field in a header and a settings form, describing both as `'User profile settings'` means the AI treats them as the same logical unit.

### `reactAI()` HOC

Wraps a prop-based component. The HOC applies AI patches on top of whatever props you pass in.

```tsx
import { reactAI } from '@bnbarak/reactai/react'

// Wrap once, use everywhere
export const AiCard = reactAI(DemoCard, {
  key: 'demo-card',
  description: 'A product card showing a title and call-to-action',
})

// Use like the original component
<AiCard title="Hello" body="World" onButtonClick={handleClick} />
```

The base props are always passed through. The AI can only override props listed in `aiWritableProps` (set by the scanner annotation). Non-AI-writable props like `onButtonClick` are never touched.

Each `<AiCard />` mount gets a random stable `instanceId`, so multiple cards on screen are independently controllable.

!!! note "Requires scanner"
    The HOC pattern requires the component's props interface to be annotated with `@reactAi` and scanned into `registry.json`. See the [Scanner](#scanner) section below.

### `useAiMarker`

Register a named value the AI can see in its context snapshot. Use it to tell the AI what page or region is currently active.

```tsx
import { useAiMarker } from '@bnbarak/reactai/react'

export const AppLayout = ({ page }: { page: string }) => {
  useAiMarker('activePage', page)

  return <div>...</div>
}
```

The marker is registered on mount and removed on unmount. Pass any serialisable value — strings, numbers, or objects.

---

## Server

The server package is a single Express router. Mount it anywhere in your existing Express app — it doesn't dictate your app structure.

```ts
import express from 'express'
import { createReactAiRouter } from '@bnbarak/reactai/server'
import { ReactAiSdk } from '@bnbarak/reactai/sdk'
import Anthropic from '@anthropic-ai/sdk'

const app = express()

const sdk = new ReactAiSdk(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

app.use('/api', createReactAiRouter({
  registryPath: './registry.json',
  sdk,
}))

app.listen(3001)
```

Mount at whatever path you like. The bridge's `SessionProvider` takes the matching `serverUrl`.

### Options

| Option | Type | Description |
|--------|------|-------------|
| `registryPath` | `string` | Path to `registry.json`. Loaded synchronously at startup — throws if file is missing. |
| `manifests` | `ComponentManifest[]` | Pass pre-loaded manifests directly instead of a file path. |
| `sdk` | `AiSdkLike` | The LLM SDK instance. Required for `/ai/prompt`. Omit to disable that route. |

!!! tip "No SDK, no AI route"
    You can run the server without an SDK — sessions, SSE, and direct patch routes still work. Useful for testing the bridge in isolation.

### Routes

```
POST   /sessions              → { sessionId }
GET    /registry              → ComponentManifest[]
GET    /registry/:key         → ComponentManifest
POST   /patches               → validate + SSE broadcast
GET    /sse/:sessionId        → SSE stream
POST   /ai/prompt             → LLM call + SSE broadcast  (requires sdk)
```

**`POST /patches`** — Apply a patch directly without the LLM. Useful for testing or deterministic updates from your own code.

```json
// Request
{ "sessionId": "...", "key": "demo-card", "instanceId": "inst-1", "patch": { "title": "New Title" } }
// Response
{ "applied": true }
```

Returns `422` if any key in `patch` is not listed in the component's `aiWritableProps`.

**`POST /ai/prompt`** — Main AI entry point. Accepts a prompt and a full component snapshot.

```json
{
  "sessionId": "...",
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
  ]
}
```

The server merges `snapshot` with `registry.json` (snapshot entries take priority), calls the SDK, then broadcasts the patch via SSE.

### `AiSdkLike` interface

The server depends on a single interface — not on the Anthropic SDK directly. You can pass any object that satisfies it:

```ts
interface AiSdkLike {
  updateFromPrompt(
    prompt: string,
    manifests: ComponentManifest[],
    mountedSnapshot: MountedInstance[],
    accessibilityTree?: string,
    markers?: Record<string, unknown>,
    currentUrl?: string,
  ): Promise<{
    target: { key: string; instanceId: string } | null
    patch: Record<string, unknown> | null
    applied: boolean
    errors?: string[]
    isDone?: boolean
  }>
}
```

This makes the server testable with mock SDKs and lets you swap LLM providers without touching the server.

---

## Scanner

The scanner reads your TypeScript source at build time and extracts component metadata into `registry.json`. The server and SDK use this file to understand what components exist and what the AI is allowed to change.

**You only need the scanner if you're using the `reactAI()` HOC pattern.** Components using `useStateWithAi()` describe themselves at runtime.

### Annotating a component

Add a `@reactAi` JSDoc tag to the props interface:

```tsx
/**
 * @reactAi
 * @key demo-card
 * @description A product card showing a title and CTA button.
 */
interface DemoCardProps {
  /** @reactAi Headline text */
  title: string
  /** @reactAi Supporting body copy */
  body?: string
  /** @noAI Internal click handler */
  onButtonClick: () => void
}
```

| Tag | Where | Meaning |
|-----|-------|---------|
| `@reactAi` | Interface | Marks it for scanning |
| `@key` | Interface | Stable identifier used in patches and SSE events |
| `@description` | Interface | What the AI sees when deciding which component to update |
| `@reactAi` | Prop | Marks it as AI-writable |
| `@noAI` | Prop | Explicitly excludes it (optional, self-documenting) |

Function props (`() => void`) are **never** AI-writable, even if annotated.

### Running the scanner

```bash
npx react-ai-scan <srcDir> <outDir>
```

```json
{
  "scripts": {
    "scan": "react-ai-scan src/ ./registry.json"
  }
}
```

!!! tip "Run before the server"
    The server throws if `registryPath` points to a missing file. Make `scan` a prerequisite of your server start script.

### Output: `registry.json`

```json
[
  {
    "key": "demo-card",
    "description": "A product card showing a title and CTA button.",
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

The JSON Schema is derived from your TypeScript types. `string`, `number`, `boolean`, and union string literals are all supported.

---

## SDK

The SDK is the LLM layer. It takes a prompt and a component snapshot, and returns a validated patch for the most relevant component.

A single Anthropic API call does everything: selects the target component *and* generates the patch. A two-step "select then generate" flow would double the latency and split the context, making it harder for the model to reason about prop values while selecting.

The model used is `claude-haiku-4-5-20251001` — optimised for fast, structured output tasks.

```ts
import { ReactAiSdk } from '@bnbarak/reactai/sdk'
import Anthropic from '@anthropic-ai/sdk'

const sdk = new ReactAiSdk(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

app.use('/api', createReactAiRouter({ registryPath: './registry.json', sdk }))
```

### What happens inside

```
updateFromPrompt(prompt, manifests, mountedSnapshot)
  → CombinedSelector.select(prompt, manifests, snapshot)
      → one LLM call with tool_use
      → returns { key, instanceId, patch }
  → RetryValidator.validateWithRetry(key, patch, manifest)
      → validates patch keys against aiWritableProps
      → if invalid: retry with error feedback (max 2 retries)
  → returns { target, patch, applied, isDone }
```

**`isDone`:** The SDK returns `isDone: true` when the task is complete after the current turn, `false` when it wants the client to send another turn (multi-step navigation). The bridge loops until `isDone` is true or max turns is reached.

### Bring your own model

The server depends on `AiSdkLike` — not the Anthropic SDK directly. Implement your own to swap providers:

```ts
import type { AiSdkLike } from '@bnbarak/reactai/server'

class MyCustomSdk implements AiSdkLike {
  async updateFromPrompt(prompt, manifests, mountedSnapshot) {
    // your LLM call here
    return { target: { key: '...', instanceId: '...' }, patch: { ... }, applied: true }
  }
}
```

### Debugging prompts

Set `DEBUG=true` in your `.env` to log all LLM prompts to `prompts.txt`.

```bash
DEBUG=true npm run demo:server
```

---

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
