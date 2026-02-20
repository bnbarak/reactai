# Scanner

Build-time AST tool that reads annotated TypeScript/React source files and emits a component registry.

## What it does

1. Traverses all `.tsx` / `.ts` files in the source directory
2. Finds interfaces annotated with `@reactAi` JSDoc tag
3. Extracts per-prop annotations (`@reactAi` = AI-writable, `@noAI` = read-only)
4. Generates a JSON Schema for the AI-writable props
5. Writes `registry.json` and Zod schema files to the output directory

## Annotation format

```tsx
/**
 * @reactAi
 * @key demo-card
 * @description A card component showing a title and CTA button.
 * @contextSummary Renders in the main content area.
 */
interface DemoCardProps {
  /** @reactAi Headline text */
  title: string
  /** @reactAi Body paragraph */
  body?: string
  /** @noAI Internal click handler — never writable by AI */
  onButtonClick: () => void
}
```

## Output

### `core/src/generated/registry.json`

```json
[
  {
    "key": "demo-card",
    "description": "A card component showing a title and CTA button.",
    "filePath": "webapp/src/components/DemoCard.tsx",
    "aiWritableProps": ["title", "body"],
    "propsJsonSchema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "body": { "type": "string" }
      },
      "required": ["title"]
    },
    "contextSummary": "Renders in the main content area."
  }
]
```

## Running

```bash
npm run scan
# or manually:
tsx scanner/src/index.ts <srcDir> <outDir>
```

## Key files

| File | Role |
|------|------|
| `src/index.ts` | CLI entry — reads args, wires ComponentScanner + ManifestWriter |
| `src/ComponentScanner.ts` | ts-morph AST traversal; extracts manifest data |
| `src/SchemaGenerator.ts` | Converts TypeScript prop types → Zod + JSON Schema |
| `src/ManifestWriter.ts` | Writes `registry.json` and per-component Zod schema files |

## Notes

- Only interfaces with `@reactAi` on the interface JSDoc itself are scanned
- Props without `@reactAi` or `@noAI` are ignored (not AI-writable)
- Function props (`() => void`) are never AI-writable even if annotated
- `useStateWithAi()` components do **not** need scanner annotations — they self-describe at runtime
