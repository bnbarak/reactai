# SDK

The SDK is the LLM layer. It takes a prompt and a component snapshot, and returns a validated patch for the most relevant component.

## Design

A single Anthropic API call does everything: selects the target component *and* generates the patch. This is a deliberate choice — a two-step "select then generate" flow would double the latency and split the context, making it harder for the model to reason about prop values while selecting.

The model used is `claude-haiku-4-5-20251001` — optimised for fast, structured output tasks.

## Usage

```ts
import { ReactAiSdk } from '@reactai/sdk'
import Anthropic from '@anthropic-ai/sdk'

const sdk = new ReactAiSdk(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }))

// Pass to createReactAiRouter
app.use('/api', createReactAiRouter({ registryPath: './registry.json', sdk }))
```

## What happens inside

```
updateFromPrompt(prompt, manifests, snapshot)
  → CombinedSelector.select(prompt, manifests, snapshot)
      → one LLM call with tool_use
      → returns { key, instanceId, patch }
  → RetryValidator.validateWithRetry(key, patch, manifest)
      → validates patch keys against aiWritableProps
      → if invalid: retry with error feedback (max 2 retries)
  → returns { target, patch, applied, isDone }
```

### `isDone`

The SDK returns `isDone: true` when the task is complete after the current turn, `false` when it wants the client to send another prompt turn (multi-step navigation). The bridge's `ChatPanel` loops until `isDone` is true or max turns is reached.

## Bring your own model

The server depends on `AiSdkLike` — not the Anthropic SDK directly. You can implement your own:

```ts
import type { AiSdkLike } from '@reactai/server'

class MyCustomSdk implements AiSdkLike {
  async updateFromPrompt(prompt, manifests, snapshot) {
    // your LLM call here
    return { target: { key: '...', instanceId: '...' }, patch: { ... }, applied: true }
  }
}

app.use('/api', createReactAiRouter({ registryPath: './registry.json', sdk: new MyCustomSdk() }))
```

## Debugging prompts

Set `DEBUG=true` in your `.env` to log all LLM prompts to `prompts.txt`. Useful for understanding model behaviour and tuning descriptions.

```bash
DEBUG=true npm run demo:server
```

## Key files

| File | Role |
|------|------|
| `src/ReactAiSdk.ts` | Main class — `updateFromPrompt()` entry point |
| `src/CombinedSelector.ts` | Single LLM call → `{ key, instanceId, patch }` |
| `src/PatchGenerator.ts` | Standalone patch generation used by retry loop |
| `src/RetryValidator.ts` | Validation + retry loop |
| `src/PromptLogger.ts` | Appends to `prompts.txt` when `DEBUG=true` |

## `SdkResult`

```ts
interface SdkResult {
  target: { key: string; instanceId: string } | null
  patch: Record<string, unknown> | null
  applied: boolean
  errors?: string[]
  isDone?: boolean
}
```
