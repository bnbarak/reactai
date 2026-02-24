# Scanner

The scanner is a build-time CLI that reads your TypeScript source, finds annotated component interfaces, and writes a `registry.json` file. The server loads this file at startup to know which components exist and what the AI is allowed to change.

## When you need it

Only when using the `reactAI()` HOC pattern. Components that use `useStateWithAi()` are self-describing at runtime — they send their own description, writable props, and current state with every prompt.

| Pattern | Scanner needed? |
|---------|-----------------|
| `useStateWithAi()` | No — self-describing at runtime |
| `reactAI()` HOC | Yes — prop metadata comes from `registry.json` |

---

## How it works

The scanner uses [ts-morph](https://ts-morph.com/) to traverse the TypeScript AST. For every interface it finds, it checks for a `@reactAi` JSDoc tag. If present, it extracts the key, description, and per-prop annotations to build a `ComponentManifest`.

```
Source files (.ts, .tsx)
  → AST traversal (ts-morph)
    → find interfaces with @reactAi tag
      → extract @key, @description, @contextSummary
        → per-prop: collect @reactAi and type info
          → derive JSON Schema from TypeScript types
            → write registry.json
```

The scanner does not import or execute your code. It reads the AST statically — no JSX runtime, no React, no bundler needed.

---

## Annotating a component

Add JSDoc tags to the props interface. The component implementation is untouched.

```tsx
/**
 * @reactAi
 * @key product-card
 * @description A product card showing a title, price, and availability status.
 * @contextSummary Rendered in the main product grid. Price is in USD.
 */
interface ProductCardProps {
  /** @reactAi Headline text for the product */
  title: string
  /** @reactAi Price in USD */
  price: number
  /** @reactAi Availability status */
  status: 'in-stock' | 'low-stock' | 'out-of-stock'
  /** @reactAi Whether to show the sale badge */
  onSale?: boolean
  /** Internal click handler — never AI-writable */
  onAddToCart: () => void
}
```

**Interface-level tags**

| Tag | Required | Description |
|-----|----------|-------------|
| `@reactAi` | ✓ | Marks the interface for scanning |
| `@key` | ✓ | Stable identifier used in patches and SSE events. Use kebab-case. |
| `@description` | ✓ | What this component represents. The AI reads this when deciding which component to update. |
| `@contextSummary` | — | Extra context injected into the LLM prompt. Use for placement, constraints, or units. |

**Prop-level tags**

| Tag | Description |
|-----|-------------|
| `@reactAi <label>` | Marks the prop as AI-writable. The label is informational. |
| `@noAI` | Explicitly excludes the prop. Optional — unannotated props are already excluded. |

**Function props are always excluded**, even if annotated with `@reactAi`. The scanner ignores any prop whose type text contains `=>` or `Function`.

---

## Supported TypeScript types

The scanner derives a JSON Schema from each prop's TypeScript type.

| TypeScript | JSON Schema |
|------------|-------------|
| `string` | `{ "type": "string" }` |
| `number` | `{ "type": "number" }` |
| `boolean` | `{ "type": "boolean" }` |
| `'a' \| 'b' \| 'c'` | `{ "type": "string", "enum": ["a", "b", "c"] }` |
| `string[]` | `{ "type": "array", "items": { "type": "string" } }` |
| `number[]` | `{ "type": "array", "items": { "type": "number" } }` |
| anything else | `{ "type": "string" }` (safe fallback) |

Required vs optional follows the TypeScript `?` token — optional props are excluded from the `required` array.

---

## CLI

```bash
npx react-ai-scan <srcDir> <outDir>
```

| Argument | Description |
|----------|-------------|
| `srcDir` | Directory to scan recursively. Picks up `**/*.ts` and `**/*.tsx`. |
| `outDir` | Directory where `registry.json` is written. Created if it doesn't exist. |

**Add to `package.json`:**

```json
{
  "scripts": {
    "scan": "react-ai-scan src/ ./registry"
  }
}
```

```bash
npm run scan
# Scanned 4 component(s) → ./registry/registry.json
```

!!! tip "Run before the server"
    `createReactAiRouter({ registryPath })` throws immediately at startup if the file is missing. Add `scan` as a prerequisite of your server start script:
    ```json
    "dev:server": "npm run scan && tsx server/src/index.ts"
    ```

---

## Output: `registry.json`

An array of `ComponentManifest` objects, one per annotated interface.

```json
[
  {
    "key": "product-card",
    "description": "A product card showing a title, price, and availability status.",
    "filePath": "/Users/you/project/src/components/ProductCard.tsx",
    "aiWritableProps": ["title", "price", "status", "onSale"],
    "propsJsonSchema": {
      "type": "object",
      "properties": {
        "title":  { "type": "string" },
        "price":  { "type": "number" },
        "status": { "type": "string", "enum": ["in-stock", "low-stock", "out-of-stock"] },
        "onSale": { "type": "boolean" }
      },
      "required": ["title", "price", "status"],
      "additionalProperties": false
    },
    "contextSummary": "Rendered in the main product grid. Price is in USD."
  }
]
```

---

## Programmatic API

The scanner exports three classes from `@bnbarak/reactai/scanner` for use in build tools, custom scripts, or testing.

### `ComponentScanner`

```ts
import { ComponentScanner } from '@bnbarak/reactai/scanner'

const scanner = new ComponentScanner()
const manifests = scanner.scan('./src')
// → ComponentManifest[]
```

**`scan(srcDir: string): ComponentManifest[]`**

Scans all `.ts` and `.tsx` files under `srcDir` recursively. Returns one manifest per annotated interface. Throws if an annotated interface is missing `@key` or `@description`.

---

### `ManifestWriter`

```ts
import { ManifestWriter } from '@bnbarak/reactai/scanner'

const writer = new ManifestWriter()
writer.write(manifests, './dist/registry')
// → writes ./dist/registry/registry.json
```

**`write(manifests: ComponentManifest[], outDir: string): void`**

Writes `registry.json` to `outDir`. Creates the directory (including nested paths) if it doesn't exist. Overwrites any existing file.

---

### `SchemaGenerator`

```ts
import { SchemaGenerator } from '@bnbarak/reactai/scanner'

const generator = new SchemaGenerator()
const schema = generator.generate(props, aiWritableProps)
// → JsonSchema
```

**`generate(props: PropSpec[], aiWritableProps: string[]): JsonSchema`**

Converts an array of `PropSpec` objects into a JSON Schema. Only props listed in `aiWritableProps` are included. Useful if you're building a custom scanner or test fixture.

```ts
interface PropSpec {
  name: string
  typeText: string   // raw TypeScript type string, e.g. "'light' | 'dark'"
  isOptional: boolean
}
```

---

## Error handling

The scanner throws on malformed annotations — it does not silently skip them.

| Condition | Error |
|-----------|-------|
| `@reactAi` interface missing `@key` | `Interface MyProps missing @key tag` |
| `@reactAi` interface missing `@description` | `Interface MyProps missing @description tag` |

This ensures bad annotations are caught at build time, not discovered at runtime when the AI can't find a component.
