# reactAI

Your React components should respond to AI the same way they respond to users — no special wiring, no rebuilds.

## The idea

Your React app's components define its business layer — what data matters, what states are valid, how the product behaves. reactAI embeds AI agents directly into that layer. Instead of an agent running outside your app, guessing at the UI by clicking buttons and reading the screen, it becomes a native participant — driving your components through the interface their author designed.

```tsx
// Without reactAI: custom wiring per component
const res = await myAiEndpoint(prompt)
setUsername(res.username)
setLanguage(res.language)

// With reactAI: describe once, let AI drive
const [state, setState, aiRef] = useStateWithAi('User profile settings', {
  username: 'barak',
  language: 'English',
})
```

## Two ways to make a component AI-controllable

### Hook — state inside a component

The simplest path. Replace `useState` with `useStateWithAi`, give it a description, attach the ref.

```tsx
import { useStateWithAi } from '@bnbarak/reactai/react'

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

No scanner, no annotation. The AI can now update `username` and `language` by natural language.

### HOC — wrap an existing component

For components you can't modify internally — from a design system, a library, or a legacy codebase.
Annotate the props interface, run the scanner once, wrap the component.

```tsx
import { reactAI } from '@bnbarak/reactai/react'

/**
 * @reactAi
 * @key demo-card
 * @description A product card with a title and CTA.
 */
interface DemoCardProps {
  /** @reactAi Headline text */
  title: string
  onButtonClick: () => void  // not annotated — never AI-writable
}

export const AiCard = reactAI(DemoCard, { key: 'demo-card', description: 'A product card' })
```

The AI can update `title`. It can never touch `onButtonClick` — function props are explicitly excluded.

The scanner reads your TypeScript source at build time and extracts the annotation into a `registry.json` file — the server loads it at startup so the AI knows which components exist and what it is allowed to change. See the [Scanner →](scanner.md) for the full annotation syntax and CLI.

## Get started

[Quickstart →](quickstart.md) — up and running in 5 minutes.
