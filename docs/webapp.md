# Webapp

Vite/React demo app that showcases the reactAI system end-to-end.

## Pages

| Page | Route | AI-controllable state |
|------|-------|-----------------------|
| Portfolio | default | Stock positions (HOC), portfolio header (HOC) |
| Settings | settings | Username via `useStateWithAi` |
| TicTacToe | tictactoe | Board state (HOC) |

## ChatPanel

Persistent chat UI in the bottom-right corner. On submit:

1. Reads `snapshotRegistry.getAll()` — full current state of all mounted AI-controllable components
2. Posts `{ sessionId, prompt, snapshot }` to `POST /api/ai/prompt`
3. The server runs the LLM and broadcasts an SSE patch
4. The target component re-renders automatically

No manual wiring required — any component registered in `SnapshotRegistry` is automatically included in the snapshot.

## HOC components (require scanner annotation)

These use `reactAI()` and require `@reactAi` JSDoc annotations on their props interface:

- `DemoCard` — title, body, buttonLabel
- `DemoBanner` — headline, theme
- `PortfolioChart` — chartTitle
- `PortfolioHeader` — title, subtitle
- `StockPosition` — ticker, shares, price, changePercent
- `TicTacToeBoard` — board (3×3 array), currentPlayer, winner

## Hook components (no scanner needed)

These use `useStateWithAi()` directly:

- `SettingsPage` — `useStateWithAi('User profile settings', { username: 'barak' })`

## Adding a new AI-controllable component

### Option A: HOC (existing component)

1. Add `@reactAi` JSDoc to the props interface in the component file
2. Run `npm run scan`
3. Wrap with `reactAI()`:
   ```tsx
   export const AiMyComponent = reactAI(MyComponent, { key: 'my-component', description: '...' })
   ```
4. Use `<AiMyComponent>` in your app

### Option B: Hook (state in component)

```tsx
function MyComponent() {
  const [state, setState] = useStateWithAi('My component description', { value: 'default' })
  return <div>{state.value}</div>
}
```

No scanner or annotation required.

## Running

```bash
npm run dev
# starts scanner, server, and Vite in parallel
```

Requires `ANTHROPIC_API_KEY` in `.env`.
