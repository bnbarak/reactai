# SDK

Server-side LLM orchestration. Takes a natural language prompt and mounted component snapshot, and returns a validated patch for the most relevant component instance.

## Design

A single Anthropic API call (via `CombinedSelector`) selects the target component and generates the patch in one step. This minimises latency compared to a two-call select-then-generate flow.

The model used is `claude-haiku-4-5-20251001` — fast and cost-efficient for structured output tasks.

## Main flow

```
updateFromPrompt(prompt, manifests, snapshot)
  → CombinedSelector.select(prompt, manifests, snapshot)
      → one LLM call with tool_use
      → returns { key, instanceId, patch }
  → RetryValidator.validateWithRetry(key, patch, manifest)
      → validates patch keys against aiWritableProps
      → if invalid: retry with error message (max 2 retries)
  → returns SdkResult { target, patch, applied }
```

## CombinedSelector

Sends all manifests (descriptions + JSON Schemas) and the full mounted snapshot (current state) to the LLM. The LLM returns a single tool call with the target component and the patch in one shot.

```typescript
// Tool schema passed to LLM
{
  name: 'select_and_patch',
  input_schema: {
    type: 'object',
    properties: {
      key: { type: 'string', enum: ['demo-card', 'demo-banner', ...] },
      instanceId: { type: 'string' },
      patch: { type: 'object' }  // constrained to aiWritableProps
    }
  }
}
```

## RetryValidator

After the LLM returns a patch, `RetryValidator` validates it:
- All keys must be in `aiWritableProps`
- If validation fails, the error is fed back to the LLM for one retry
- After 2 failed retries, returns `applied: false` with error messages

## Prompt logging

Set `DEBUG=true` in `.env` to log all LLM prompts to `prompts.txt` at the project root. Useful for debugging model behaviour.

## Key files

| File | Role |
|------|------|
| `src/ReactAiSdk.ts` | Main class — `updateFromPrompt()` entry point |
| `src/CombinedSelector.ts` | Single LLM call → `{ key, instanceId, patch }` |
| `src/PatchGenerator.ts` | Standalone patch generation (used by RetryValidator for retries) |
| `src/RetryValidator.ts` | Zod validation + retry loop |
| `src/PromptLogger.ts` | Appends prompts to `prompts.txt` when `DEBUG=true` |

## SdkResult

```typescript
interface SdkResult {
  target: { key: string; instanceId: string } | null
  patch: Record<string, unknown> | null
  applied: boolean
  errors?: string[]
}
```
