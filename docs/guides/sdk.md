# SDK

The SDK is the LLM layer. It takes a prompt and a component snapshot, and returns a validated patch for the most relevant component.

## Design

A single LLM call does everything: selects the target component *and* generates the patch. This is a deliberate choice — a two-step "select then generate" flow would double the latency and split the context, making it harder for the model to reason about prop values while selecting.

The SDK is built on the [Vercel AI SDK](https://sdk.vercel.ai) (`ai` package), which provides a unified interface across providers. Pass any `LanguageModel` — Anthropic, OpenAI, or any other supported provider.

## Usage

### Anthropic (default)

```ts
import { ReactAiSdk } from '@bnbarak/reactai/sdk'
import { anthropic } from '@ai-sdk/anthropic'

const sdk = new ReactAiSdk(anthropic('claude-haiku-4-5-20251001'))

app.use('/api', createReactAiRouter({ registryPath: './registry.json', sdk }))
```

Requires `ANTHROPIC_API_KEY` in the environment. The `@ai-sdk/anthropic` provider reads it automatically.

### OpenAI

```ts
import { ReactAiSdk } from '@bnbarak/reactai/sdk'
import { openai } from '@ai-sdk/openai'

const sdk = new ReactAiSdk(openai('gpt-4o-mini'))

app.use('/api', createReactAiRouter({ registryPath: './registry.json', sdk }))
```

Requires `OPENAI_API_KEY` in the environment.

### Switching via environment variable

The demo server reads `AI_PROVIDER` at startup:

```bash
# Anthropic (default)
ANTHROPIC_API_KEY=sk-ant-... npm run demo:server

# OpenAI
AI_PROVIDER=openai OPENAI_API_KEY=sk-... npm run demo:server
```

## What happens inside

```
updateFromPrompt(prompt, manifests, mountedSnapshot)
  → CombinedSelector.select(prompt, manifests, snapshot)
      → generateText() with forced tool call
      → returns { key, instanceId, patch }
  → RetryValidator.validateWithRetry(key, patch, manifest)
      → validates patch keys against aiWritableProps
      → if invalid: retry with error feedback (max 2 retries)
  → returns { target, patch, applied, isDone }
```

### `isDone`

The SDK returns `isDone: true` when the task is complete after the current turn, `false` when it wants the client to send another prompt turn (multi-step navigation). The bridge's `ChatPanel` loops until `isDone` is true or max turns is reached.

## Bring your own model

The server depends on `AiSdkLike` — not the SDK directly. You can implement your own:

```ts
import type { AiSdkLike } from '@bnbarak/reactai/server'

class MyCustomSdk implements AiSdkLike {
  async updateFromPrompt(prompt, manifests, mountedSnapshot) {
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
