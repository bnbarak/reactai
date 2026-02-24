# Scanner

The scanner reads your TypeScript source at build time and extracts component metadata into `registry.json`. The server and SDK use this file to understand what components exist and what the AI is allowed to change.

## When you need it

You only need the scanner if you're using the `reactAI()` HOC pattern. Components using `useStateWithAi()` describe themselves at runtime — they don't need the scanner.

| Pattern | Scanner needed? |
|---------|-----------------|
| `useStateWithAi()` | No — self-describing at runtime |
| `reactAI()` HOC | Yes — props come from the scanner |

## Annotating a component

Add a `@reactAi` JSDoc tag to the props interface. The scanner will extract it.

```tsx
/**
 * @reactAi
 * @key demo-card
 * @description A product card showing a title and CTA button.
 */
interface DemoCardProps {
  /** @reactAi Headline text */
  title: string
  /** @reactAi Supporting body copy */
  body?: string
  /** @noAI Internal click handler */
  onButtonClick: () => void
}
```

**Rules:**
- `@reactAi` on the interface — marks it for scanning
- `@key` — the stable identifier used in patches and SSE events
- `@description` — what the AI sees when deciding which component to update
- `@reactAi` on a prop — marks it as AI-writable
- `@noAI` on a prop — explicitly excludes it (optional, self-documenting)
- Function props (`() => void`) are **never** AI-writable, even if annotated

## Running the scanner

```bash
npx react-ai-scan <srcDir> <outDir>
```

Add it to your `package.json` scripts:

```json
{
  "scripts": {
    "scan": "react-ai-scan src/ ./registry.json"
  }
}
```

!!! tip "Run before the server"
    The server throws if `registryPath` points to a missing file. Make `scan` a prerequisite of your server start script.

## Output: `registry.json`

```json
[
  {
    "key": "demo-card",
    "description": "A product card showing a title and CTA button.",
    "filePath": "src/components/DemoCard.tsx",
    "aiWritableProps": ["title", "body"],
    "propsJsonSchema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "body": { "type": "string" }
      },
      "required": ["title"]
    }
  }
]
```

The JSON Schema is derived from your TypeScript types. `string`, `number`, `boolean`, and union string literals are supported.

## Programmatic API

The scanner also exports a programmatic API for build tool integration:

```ts
import { ComponentScanner, ManifestWriter } from '@bnbarak/reactai/scanner'

const scanner = new ComponentScanner()
const manifests = scanner.scan('./src')

const writer = new ManifestWriter()
writer.write(manifests, './dist')
```

## Key files

| File | Role |
|------|------|
| `src/cli.ts` | CLI entry — parses args, runs scanner + writer |
| `src/index.ts` | Programmatic exports |
| `src/ComponentScanner.ts` | ts-morph AST traversal — extracts manifest data |
| `src/SchemaGenerator.ts` | TypeScript prop types → JSON Schema |
| `src/ManifestWriter.ts` | Writes `registry.json` |
