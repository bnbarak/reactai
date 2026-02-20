# Productionize Plan — reactAI npm Library

## Target Package Structure

```
@reactai/bridge    → UI (React HOC + hooks)
@reactai/server    → Backend (Express router)
@reactai/scanner   → CLI + programmatic scanner
@reactai/core      → Shared types (internal, bundled by others or kept lean)
@reactai/sdk       → LLM orchestration (Anthropic)
```

Demo app stays at `demo/` and is NOT published — it's just the dev sandbox.

---

## Phase 1 — Build System (each publishable package)

Add `tsup` to each package. Outputs: ESM + CJS + `.d.ts`.

Per-package `tsup.config.ts`:
```ts
export default { entry: ['src/index.ts'], format: ['esm', 'cjs'], dts: true, clean: true }
```

Per-package `package.json` exports:
```json
{
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  }
}
```

Add `"build": "tsup"` script to each. Root `"build": "npm run build --workspaces --if-present"`.

---

## Phase 2 — Public index.ts per package

Each package needs a clean `src/index.ts` that exports only the public API.

**`@reactai/core`** — already just `types.ts`, export everything.

**`@reactai/bridge`**:
```ts
export { reactAI } from './reactAI.js'
export { SessionProvider, useSession } from './SessionContext.js'
export { useAiState } from './useAiState.js'
export { useAiMarker } from './useAiMarker.js'
export { useStateWithAi } from './useStateWithAi.js'
```

**`@reactai/server`**:
```ts
export { createReactAiRouter } from './router.js'
export type { ReactAiRouterOptions } from './router.js'
```

**`@reactai/scanner`**:
```ts
export { ComponentScanner } from './ComponentScanner.js'
export { ManifestWriter } from './ManifestWriter.js'
// + bin entry
```

**`@reactai/sdk`**:
```ts
export { ReactAiSdk } from './ReactAiSdk.js'
export type { AiSdkLike } from './types.js'  // extract interface
```

---

## Phase 3 — Server: createApp → createReactAiRouter

Change `server` to export a router, not a full Express app.

Current: `createApp(options)` returns `express.Application`
Target: `createReactAiRouter(options)` returns `express.Router`

```ts
// @reactai/server
export function createReactAiRouter(options: ReactAiRouterOptions): express.Router {
  const router = express.Router()
  router.use(createRegistryRouter(manifests))
  router.use(createSessionsRouter(sessionStore))
  // ...
  return router
}

// User's server.ts
import { createReactAiRouter } from '@reactai/server'
app.use('/api', createReactAiRouter({ registryPath: './registry.json', anthropicApiKey: process.env.ANTHROPIC_API_KEY }))
```

`ReactAiRouterOptions`:
```ts
interface ReactAiRouterOptions {
  registryPath?: string        // path to registry.json (loaded at startup)
  manifests?: ComponentManifest[] // or pass pre-loaded array
  anthropicApiKey?: string     // if provided, wires up AI route automatically
  sdk?: AiSdkLike              // or pass custom SDK instance
}
```

The standalone `demo/server/src/index.ts` becomes a thin consumer using `@reactai/server`.

---

## Phase 4 — Scanner: CLI binary

Add `bin` to `scanner/package.json`:
```json
{
  "name": "@reactai/scanner",
  "bin": { "react-ai-scan": "./dist/cli.js" }
}
```

Split `src/index.ts` into:
- `src/cli.ts` — the `process.argv` entrypoint (shebang + bin)
- `src/index.ts` — exports `ComponentScanner`, `ManifestWriter` for programmatic use

User adds to their `package.json`:
```json
"scripts": { "scan": "react-ai-scan src/ ./registry.json" }
```

---

## Phase 5 — Bridge: configurable server URL

Currently the SSE client likely points to `localhost:3001`. Make it configurable via `SessionProvider`:

```tsx
<SessionProvider serverUrl="https://myapp.com/api">
  <App />
</SessionProvider>
```

Default: `/api` (relative, works when UI and server are same origin).

---

## Phase 6 — Package names + peer deps

Rename package names in each `package.json`:
- `"name": "server"` → `"name": "@reactai/server"`
- `"name": "bridge"` → `"name": "@reactai/bridge"`
- etc.

Set correct peer deps:
- `@reactai/bridge`: peerDeps `react`, `react-dom`
- `@reactai/server`: peerDeps `express`; optionalPeerDep `@anthropic-ai/sdk`
- `@reactai/scanner`: dep `ts-morph` (build-time, that's fine)
- `@reactai/sdk`: peerDep `@anthropic-ai/sdk`

---

## Phase 7 — Demo app wires up as consumer

After Phase 3-6, update `demo/server/src/index.ts` and `demo/webapp` to import from the published package names instead of relative paths. This validates the library works as intended.

---

## Execution Order

1. Build system (tsup per package)
2. Public index.ts files
3. Server router refactor
4. Scanner CLI split
5. Bridge serverUrl
6. Rename packages + fix peer deps
7. Demo wires up as consumer
8. Verify `npm run dev` still works end-to-end
