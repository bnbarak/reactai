import type { ComponentManifest } from 'react-ai-core/src/types.js';
import type { PatchGenerator } from './PatchGenerator.js';

const MAX_RETRIES = 2;

export interface RetryResult {
  patch: Record<string, unknown>;
  errors: string[];
}

export class RetryValidator {
  constructor(private patchGenerator: PatchGenerator) {}

  async validateWithRetry(
    prompt: string,
    manifest: ComponentManifest,
    currentState: Record<string, unknown>,
    initialPatch: Record<string, unknown>,
  ): Promise<RetryResult> {
    let patch = initialPatch;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const result = this.validatePatch(manifest, patch);
      if (result.valid) return { patch, errors: [] };

      const errorMsg = result.errors.join('; ');
      patch = await this.patchGenerator.generate(prompt, manifest, currentState, errorMsg);
    }

    const finalResult = this.validatePatch(manifest, patch);
    if (finalResult.valid) return { patch, errors: [] };

    return { patch: {}, errors: finalResult.errors };
  }

  validatePatch(
    manifest: ComponentManifest,
    patch: Record<string, unknown>,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const key of Object.keys(patch)) {
      if (!manifest.aiWritableProps.includes(key)) {
        errors.push(`Prop '${key}' is not AI-writable for component '${manifest.key}'`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
