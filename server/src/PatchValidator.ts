import type { ComponentManifest } from 'react-ai-core/src/types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class PatchValidator {
  constructor(private manifests: ComponentManifest[]) {}

  validate(key: string, patch: Record<string, unknown>): ValidationResult {
    const manifest = this.manifests.find((m) => m.key === key);
    if (!manifest) return { valid: false, errors: [`Unknown component key: ${key}`] };

    const errors: string[] = [];
    for (const propKey of Object.keys(patch)) {
      if (!manifest.aiWritableProps.includes(propKey)) {
        errors.push(`Prop '${propKey}' is not AI-writable for component '${key}'`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
