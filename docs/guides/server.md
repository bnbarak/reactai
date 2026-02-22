# Server

The server package is a single Express router. Mount it anywhere in your existing Express app — it doesn't dictate your app structure.

## Why a router, not a standalone server

Your app already has an Express server. The reactAI server is a guest, not a host. Shipping it as a router means you control CORS, auth middleware, logging, and the mount path. reactAI handles only what it owns: sessions, SSE, patch validation, and AI prompt routing.

## Setup

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

## `ReactAiRouterOptions`

| Option | Type | Description |
|--------|------|-------------|
| `registryPath` | `string` | Path to `registry.json`. Loaded synchronously at startup — throws if file is missing. |
| `manifests` | `ComponentManifest[]` | Pass pre-loaded manifests directly instead of a file path. |
| `sdk` | `AiSdkLike` | The LLM SDK instance. Required for AI prompt handling. Omit to disable the `/ai/prompt` route. |

!!! note "Registry is required to start"
    If you pass `registryPath` and the file doesn't exist, `createReactAiRouter` throws immediately. Run `npm run scan` before starting the server.

!!! tip "No SDK, no AI route"
    You can run the server without an SDK — sessions, SSE, and direct patch routes still work. Useful for testing the bridge in isolation.

## Routes

All routes are relative to the mount path.

```
POST   /sessions              → { sessionId }
GET    /registry              → ComponentManifest[]
GET    /registry/:key         → ComponentManifest
POST   /patches               → validate + SSE broadcast
GET    /sse/:sessionId        → SSE stream
POST   /ai/prompt             → LLM call + SSE broadcast  (requires sdk)
```

### `POST /sessions`

Creates a session. Called once by `SessionProvider` on mount.

```json
// Response — 201 Created
{ "sessionId": "550e8400-e29b-..." }
```

### `POST /patches`

Apply a patch directly — no LLM involved. Useful for testing or deterministic updates from your own code.

```json
// Request
{
  "sessionId": "...",
  "key": "demo-card",
  "instanceId": "inst-1",
  "patch": { "title": "New Title" }
}
// Response
{ "applied": true }
```

Returns `422` if any key in `patch` is not listed in the component's `aiWritableProps`.

### `POST /ai/prompt`

Main AI entry point. The bridge's `ChatPanel` calls this.

```json
// Request
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

### `GET /sse/:sessionId`

Long-lived SSE connection. The bridge opens this automatically after session creation.

Events are newline-delimited JSON:

```
data: {"type":"patch","key":"demo-card","instanceId":"...","patch":{"title":"AI Title"}}
```

## `AiSdkLike` interface

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

## Key files

| File | Role |
|------|------|
| `src/router.ts` | `createReactAiRouter()` — wires services and sub-routers |
| `src/types.ts` | `ReactAiRouterOptions`, `AiSdkLike` |
| `src/SessionStore.ts` | In-memory session set |
| `src/SseManager.ts` | Fan-out SSE broadcast per session |
| `src/PatchValidator.ts` | Validates patch keys against `aiWritableProps` |
| `src/routes/` | Individual Express sub-routers |
