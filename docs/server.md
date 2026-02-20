# Server

Express HTTP server that acts as the control plane between the React client and the LLM SDK.

## Design

The server is **stateless** — it does not track component state between requests. All state lives on the client in `SnapshotRegistry`. Each prompt submission includes a full snapshot of current component state.

## API

```
POST   /api/sessions                              → { sessionId }
GET    /api/registry                              → ComponentManifest[]
GET    /api/registry/:key                         → ComponentManifest
POST   /api/patches                               → apply validated patch + SSE broadcast
POST   /api/ai/prompt                             → run LLM → apply result + SSE broadcast
GET    /api/sse/:sessionId                        → SSE stream for this session
```

## POST /api/sessions

Creates a new client session. The client calls this once on mount (`SessionProvider`).

```json
// Response
{ "sessionId": "uuid" }
```

## POST /api/patches

Directly applies a patch without LLM involvement. Useful for testing or deterministic updates.

```json
// Request
{
  "sessionId": "...",
  "key": "demo-card",
  "instanceId": "...",
  "patch": { "title": "New Title" },
  "source": "direct"
}
// Response
{ "applied": true, "source": "direct" }
```

Patch is validated against the component's `aiWritableProps` from `registry.json`.
Returns `422` if a non-AI-writable prop is included.

## POST /api/ai/prompt

Main entry point for AI-driven updates.

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
      "aiWritableProps": ["username"],
      "currentProps": { "username": "barak" }
    }
  ]
}
```

The server:
1. Builds manifests from `snapshot` entries (self-describing hook components)
2. Merges with scanner registry (HOC components), hook entries take priority
3. Calls `sdk.updateFromPrompt(prompt, manifests, snapshot)`
4. Broadcasts the resulting patch via SSE
5. Returns the SDK result

## GET /api/sse/:sessionId

Long-lived SSE connection. The client (`SseClient`) opens this on mount.
Events are newline-delimited JSON:

```
data: {"type":"patch","key":"demo-card","instanceId":"...","patch":{"title":"AI Title"}}

data: {"type":"error","message":"..."}
```

## Key files

| File | Role |
|------|------|
| `src/index.ts` | App bootstrap; loads registry.json and wires SDK |
| `src/SessionStore.ts` | In-memory `Set<sessionId>` — session existence only |
| `src/SseManager.ts` | `Map<sessionId, Response[]>` — fan-out SSE broadcasts |
| `src/PatchValidator.ts` | Validates patch keys against `aiWritableProps` from manifests |
| `src/routes/registry.ts` | Serves registry.json |
| `src/routes/sessions.ts` | Session creation |
| `src/routes/patches.ts` | Patch validation + SSE publish |
| `src/routes/ai.ts` | LLM prompt → patch → SSE publish |
| `src/routes/sse.ts` | SSE stream endpoint |

## Running

```bash
npm run dev:server
# requires ANTHROPIC_API_KEY in .env
```
