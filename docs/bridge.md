# Bridge

The React-side package. Provides two ways to make components AI-controllable, plus the SSE client and snapshot registry that power them.

## Two APIs

### `useStateWithAi(description, initialState)` — for state

Drop-in replacement for `useState` that makes state AI-controllable. No scanner annotation needed.

```tsx
const [profile, setProfile] = useStateWithAi('User profile settings', { username: 'barak' })
// key is auto-derived: "user-profile-settings"
```

The key is derived by slugifying the description:
`"User profile settings"` → `"user-profile-settings"`

**Singleton behaviour**: two components with the same description share the same state. Duplicate descriptions are the same logical state unit by design.

The hook:
1. Derives `key` from description (slugified); `instanceId = key` (stable, deterministic)
2. Registers current state in `SnapshotRegistry` on mount and after every state change
3. Subscribes to SSE events for this `(key, instanceId)` pair
4. Applies `patch` (shallow merge) or `snapshot` (full replace) events from the AI

---

### `reactAI(Component, options)` HOC — for prop-based components

Wraps an existing component and applies AI patches on top of base props.

```tsx
const AiCard = reactAI(Card, { key: 'demo-card', description: 'A product card' })
<AiCard title="Hello" body="World" />
```

The HOC:
1. Generates a random `instanceId` on mount (stable via `useRef`)
2. Registers `{ key, state: { ...baseProps, ...aiPatch } }` in `SnapshotRegistry`
3. Calls `useAiState(key, instanceId)` to get AI-applied patches
4. Returns `<Card {...baseProps} {...aiPatch} />` — base props always present, AI can override AI-writable ones

**Requires** the component's props interface to be annotated with `@reactAi` and scanned.

---

## SnapshotRegistry

Module-level singleton Map that holds the current state of all mounted AI-controllable components. Lives outside the React tree so `ChatPanel` can read it without prop drilling.

```typescript
snapshotRegistry.set(instanceId, { key, description, state, aiWritableProps })
snapshotRegistry.remove(instanceId)
snapshotRegistry.getAll()  // → MountedInstance[] sent with every prompt
```

---

## SseClient

Singleton `EventSource` per session. Opens `GET /api/sse/:sessionId` on connect. Other bridge hooks/HOCs subscribe by calling `sseClient.subscribe(sessionId, handler)`.

Reconnects automatically on disconnect.

---

## SessionProvider

Wrap your app with `SessionProvider` to create a session on mount and make `sessionId` available throughout the component tree.

```tsx
<SessionProvider serverUrl="http://localhost:3001">
  <App />
</SessionProvider>
```

---

## Key files

| File | Role |
|------|------|
| `src/useStateWithAi.ts` | Hook: description → key, SnapshotRegistry + SSE subscription |
| `src/reactAI.tsx` | HOC: wraps component, random instanceId, SnapshotRegistry + useAiState |
| `src/useAiState.ts` | Hook: SSE subscription filtered by (key, instanceId) |
| `src/SnapshotRegistry.ts` | Module singleton: all current AI-controllable state |
| `src/SseClient.ts` | EventSource wrapper with reconnect |
| `src/SessionContext.tsx` | React context: sessionId from POST /api/sessions |
