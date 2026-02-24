# Quickstart

reactAI connects your React components directly to AI agents. Instead of an agent clicking through your UI like a user, it reads your component state and patches it directly — the same way React does.

You describe what a component represents. The agent figures out which component to update, what values to set, and applies it. Your component re-renders. No DOM interaction, no fragile selectors, no simulated clicks.

Get up and running in 5 minutes.

## Prerequisites

- Node.js 18+
- An existing Express + React app
- Anthropic API key

## 1. Install packages

```bash
npm install @bnbarak/reactai
```

That's it — one package. Use subpath imports to pull in only what you need:

| Subpath | Who uses it |
|---|---|
| `@bnbarak/reactai/react` | Your React app |
| `@bnbarak/reactai/server` | Your Express server |
| `@bnbarak/reactai/scanner` | Build step (CLI) |

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

## 4. Wrap your React app with SessionProvider

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

## 5. Make a component AI-controllable

**Option A — hook (no scanner needed):**

```tsx
import { useStateWithAi } from '@bnbarak/reactai/react'

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
import { reactAI } from '@bnbarak/reactai/react'

/**
 * @reactAi
 * @key my-card
 * @description A card component
 */
interface MyCardProps {
  /** @reactAi Headline text */
  title: string
}

export const AiMyCard = reactAI(MyCard, { key: 'my-card', description: 'A card component' })
```

## 6. Rendering lists of AI-controllable components

The two patterns handle multiple instances differently.

**Hook (`useStateWithAi`) — singleton per description.**
All mounts sharing the same description are treated as one logical unit. If you render the same component twice with the same description, the AI sees a single entry and updates both simultaneously. Use this for components that represent a single piece of global or page-level state.

**HOC (`reactAI()`) — independent per mount.**
Each rendered instance gets its own stable ID. Render 10 cards in a list and the AI sees 10 independent entries — it can update any one specifically.

```tsx
// Each card is independently AI-controllable
export const AiProductCard = reactAI(ProductCard, {
  key: 'product-card',
  description: 'A product card',
})

// In your list — no extra setup needed
export const ProductList = ({ products }: { products: Product[] }) => (
  <div>
    {products.map(p => (
      <AiProductCard key={p.id} title={p.title} price={p.price} />
    ))}
  </div>
)
```

The AI can now respond to prompts like "mark the second card as out of stock" or "update the price on the laptop card" — it resolves which instance to patch from the snapshot context.

## 7. Tell the agent where it is

Use `useAiMarker` to give the agent ambient context — what page is active, what mode the app is in, anything that helps it reason about the current state.

```tsx
import { useAiMarker } from '@bnbarak/reactai/react'

export const AppLayout = ({ page }: { page: string }) => {
  useAiMarker('activePage', page)

  return <div>...</div>
}
```

This is how prompts like `"Go to the Kanban tab and move Alice's tasks to Bob"` work — the agent sees `activePage: 'kanban'` in its context and knows which components are relevant.

## 8. Send a prompt

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

- [Use Cases](use-cases.md) — what AI-first component control unlocks
- [Architecture](guides/architecture.md) — full API reference for bridge, server, scanner, and SDK
