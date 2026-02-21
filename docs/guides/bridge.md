# Bridge (React)

The bridge is how your React components become AI-controllable. It handles session management, state registration, and applying AI patches — so your components just render normally.

## When to use each API

**Use `useStateWithAi` when** the component owns its own state — form fields, display toggles, text labels, selected values. This is the most common pattern.

**Use `reactAI()` HOC when** you have a prop-based component (from a design system, a library, or a legacy codebase) that you can't or don't want to modify internally.

---

## `SessionProvider`

Wrap your app once at the root. It creates a server session on mount and makes `sessionId` and `serverUrl` available throughout the tree.

```tsx
import { SessionProvider } from 'bridge'

export default function App() {
  return (
    <SessionProvider serverUrl="http://localhost:3001/api">
      <YourApp />
    </SessionProvider>
  )
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `serverUrl` | `string` | `http://localhost:3001/api` | Full URL including the mount path |
| `children` | `ReactNode` | — | Your app |

!!! tip "Same-origin deployment"
    When your React app and server are on the same domain, use a relative URL:
    ```tsx
    <SessionProvider serverUrl="/api">
    ```

---

## `useStateWithAi`

Drop-in replacement for `useState`. Give your state a description — the AI uses it to understand what this state represents.

```tsx
import { useStateWithAi } from 'bridge'

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

### Singleton behaviour

Two components with the same description share the same AI key. This is intentional — if you have a `username` field in a header and a settings form, describing both as `'User profile settings'` means the AI treats them as the same logical unit.

---

## `reactAI()` HOC

Wraps a prop-based component. The HOC applies AI patches on top of whatever props you pass in.

```tsx
import { reactAI } from 'bridge'

// Wrap once, use everywhere
export const AiCard = reactAI(DemoCard, {
  key: 'demo-card',
  description: 'A product card showing a title and call-to-action',
})

// Use like the original component
<AiCard title="Hello" body="World" onButtonClick={handleClick} />
```

The base props (`title`, `body`, `onButtonClick`) are always passed through. The AI can only override props listed in `aiWritableProps` (set by the scanner annotation). Non-AI-writable props like `onButtonClick` are never touched.

Each `<AiCard />` mount gets a random stable `instanceId`, so multiple cards on screen are independently controllable.

!!! note "Requires scanner"
    The HOC pattern requires the component's props interface to be annotated with `@reactAi` and scanned into `registry.json`. See the [Scanner guide](scanner.md).

---

## `useAiMarker`

Mark a region of the DOM with a logical name. The AI sees these markers in the accessibility tree snapshot, giving it orientation about the current page layout.

```tsx
import { useAiMarker } from 'bridge'

export const SettingsPage = () => {
  const ref = useAiMarker('settings-page')

  return <div ref={ref}>...</div>
}
```

Use markers on page containers, modal dialogs, or any region that helps the AI understand where it is in the app.

---

## Key files

| File | Role |
|------|------|
| `src/SessionContext.tsx` | `SessionProvider` + `useSession` — session creation and context |
| `src/useStateWithAi.ts` | Hook: description → key, SnapshotRegistry + SSE subscription |
| `src/reactAI.tsx` | HOC: wraps component, random instanceId, SnapshotRegistry + useAiState |
| `src/useAiState.ts` | SSE subscription filtered by `(key, instanceId)` |
| `src/SnapshotRegistry.ts` | Module singleton — all current AI-controllable state |
| `src/SseClient.ts` | `EventSource` wrapper with automatic reconnect |
