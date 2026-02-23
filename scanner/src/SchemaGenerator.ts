import type { JsonSchema } from 'react-ai-core/src/types.js';

export interface PropSpec {
  name: string;
  typeText: string;
  isOptional: boolean;
}

export class SchemaGenerator {
  generate(props: PropSpec[], aiWritableProps: string[]): JsonSchema {
    const properties: Record<string, JsonSchema> = {};
    const required: string[] = [];

    for (const prop of props) {
      if (!aiWritableProps.includes(prop.name)) continue;

      properties[prop.name] = this.typeTextToSchema(prop.typeText);
      if (!prop.isOptional) required.push(prop.name);
    }

    const schema: Record<string, unknown> = {
      type: 'object',
      properties,
      additionalProperties: false,
    };
    if (required.length > 0) schema.required = required;

    return schema;
  }

  private typeTextToSchema(typeText: string): JsonSchema {
    const trimmed = typeText.trim();

    if (trimmed === 'string') return { type: 'string' };
    if (trimmed === 'number') return { type: 'number' };
    if (trimmed === 'boolean') return { type: 'boolean' };

    if (trimmed.endsWith('[]')) {
      const itemType = trimmed.slice(0, -2);
      return { type: 'array', items: this.typeTextToSchema(itemType) };
    }

    if (trimmed.includes('|')) {
      const values = trimmed.split('|').map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
      return { type: 'string', enum: values };
    }

    return { type: 'string' };
  }
}
