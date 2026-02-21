# reactai

AI-controlled React components — closed-loop prop patching via LLM.

Send a plain-English prompt. The AI finds the right component, generates a validated patch, and React re-renders. No glue code.

```bash
npm install reactai
```

## How it works

```
User prompt → LLM selects component + generates patch → validated → SSE → React re-renders
```

1. **Bridge** — React hooks and HOC that register components and apply SSE patches
2. **Server** — Express router that handles sessions, SSE, patch validation, and AI prompts
3. **Scanner** — Build-time AST scanner that extracts component metadata into `registry.json`
4. **SDK** — LLM orchestration via Anthropic API

## Quickstart

### 1. Install

```bash
npm install reactai
```

### 2. Scan your components (build step)

```bash
npx react-ai-scan src/ ./registry.json
```

### 3. Mount the router on your Express server

```ts
import express from 'express'
import { createReactAiRouter } from 'reactai/server'
import { ReactAiSdk } from 'reactai/sdk'
import Anthropic from '@anthropic-ai/sdk'

const app = express()

const sdk = new ReactAiSdk(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

app.use('/api', createReactAiRouter({
  registryPath: './registry.json',
  sdk,
}))

app.listen(3001)
```

### 4. Wrap your React app

```tsx
import { SessionProvider } from 'reactai/react'

export default function App() {
  return (
    <SessionProvider serverUrl="http://localhost:3001/api">
      <YourApp />
    </SessionProvider>
  )
}
```

### 5. Make a component AI-controllable

```tsx
import { useStateWithAi } from 'reactai/react'

export const ProfileForm = () => {
  const [state, setState, aiRef] = useStateWithAi(
    'User profile settings',
    { username: 'barak', language: 'English' }
  )

  return (
    <div ref={aiRef}>
      <input value={state.username} onChange={e => setState({ ...state, username: e.target.value })} />
    </div>
  )
}
```

### 6. Send a prompt

```ts
await fetch('/api/ai/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, prompt: 'Change the username to alice', snapshot }),
})
```

The component re-renders automatically.

## Subpath imports

| Import | Contents |
|--------|----------|
| `reactai/react` | `SessionProvider`, `useStateWithAi`, `useSession`, `reactAI` HOC |
| `reactai/server` | `createReactAiRouter`, `ReactAiRouterOptions`, `AiSdkLike` |
| `reactai/scanner` | `ComponentScanner`, `ManifestWriter` |
| `reactai/sdk` | `ReactAiSdk` |

## License

MIT
