# reactAI

Let an AI model update React component state at runtime via natural language prompts — no rebuilds, no manual wiring.

## How it works

A user types a prompt. The AI selects the most relevant mounted component and patches its state. The component re-renders. That's it.

```
User: "Change the username to alice"
       ↓
Bridge sends { sessionId, prompt, snapshot }
       ↓
Server merges registry + live snapshot → calls LLM
       ↓
LLM returns { key: "user-profile-settings", patch: { username: "alice" } }
       ↓
SSE event → React state update → re-render
```

## Packages

| Package | Role |
|---------|------|
| `server` | Express router — mount in any Express app |
| `bridge` | React HOC + hooks + SSE client |
| `scanner` | Build-time CLI — scans annotated components → `registry.json` |
| `sdk` | LLM orchestration via Anthropic API |
| `core` | Shared TypeScript types |

## Two ways to make a component AI-controllable

### Hook — state inside a component

No annotation or scanner needed. Just describe the state.

```tsx
const [profile, setProfile, aiRef] = useStateWithAi(
  'User profile settings',
  { username: 'barak', language: 'English' }
)
```

### HOC — wrap an existing component

Add a JSDoc annotation, run the scanner once, wrap the component.

```tsx
/**
 * @reactAi
 * @key demo-card
 * @description A product card with a title and CTA.
 */
interface DemoCardProps {
  /** @reactAi Headline text */
  title: string
  onButtonClick: () => void  // never AI-writable
}

export const AiCard = reactAI(DemoCard, { key: 'demo-card', description: 'A product card' })
```

## Get started

[Quickstart →](quickstart.md) — up and running in 5 minutes.
