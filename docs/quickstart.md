# Quickstart

Get reactAI running in your app in 5 minutes.

## Prerequisites

- Node.js 18+
- An existing Express + React app
- Anthropic API key

## 1. Install packages

```bash
npm install prop-ai
```

That's it — one package. Use subpath imports to pull in only what you need:

| Subpath | Who uses it |
|---|---|
| `prop-ai/react` | Your React app |
| `prop-ai/server` | Your Express server |
| `prop-ai/scanner` | Build step (CLI) |

## 2. Scan your components (build step)

Add the scan script to your `package.json`:

```json
{
  "scripts": {
    "scan": "npx react-ai-scan src/ ./registry.json"
  }
}
```

Run it once to generate `registry.json`:

```bash
npm run scan
```

!!! tip
    Add `scan` as a pre-build step so the registry stays up to date automatically.

## 3. Mount the router on your Express server

```ts
import express from 'express'
import { createReactAiRouter } from 'prop-ai/server'
import { ReactAiSdk } from 'prop-ai/sdk'
import Anthropic from '@anthropic-ai/sdk'

const app = express()

const sdk = new ReactAiSdk(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

app.use('/api', createReactAiRouter({
  registryPath: './registry.json',
  sdk,
}))

app.listen(3001)
```

## 4. Wrap your React app with SessionProvider

```tsx
import { SessionProvider } from 'prop-ai/react'

export default function App() {
  return (
    <SessionProvider serverUrl="http://localhost:3001/api">
      <YourApp />
    </SessionProvider>
  )
}
```

## 5. Make a component AI-controllable

**Option A — hook (no scanner needed):**

```tsx
import { useStateWithAi } from 'prop-ai/react'

export const ProfileForm = () => {
  const [state, setState, aiRef] = useStateWithAi(
    'User profile settings',
    { username: 'barak' }
  )

  return (
    <div ref={aiRef}>
      <input value={state.username} onChange={e => setState({ ...state, username: e.target.value })} />
    </div>
  )
}
```

**Option B — HOC (annotate + scan):**

```tsx
/**
 * @reactAi
 * @key my-card
 * @description A card component
 */
interface MyCardProps {
  /** @reactAi Headline text */
  title: string
}

import { reactAI } from 'prop-ai/react'

export const AiMyCard = reactAI(MyCard, { key: 'my-card', description: 'A card component' })
```

## 6. Send a prompt

From anywhere in your app, post to `/api/ai/prompt`:

```ts
await fetch('/api/ai/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId, prompt: 'Change the username to alice', snapshot }),
})
```

The component re-renders with the AI-applied patch automatically.

## What's next?

- [Bridge guide](guides/bridge.md) — all hooks and HOC options
- [Server guide](guides/server.md) — router options and API reference
- [Scanner guide](guides/scanner.md) — annotation syntax and CLI
