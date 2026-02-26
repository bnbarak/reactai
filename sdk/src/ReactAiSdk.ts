import type { LanguageModel } from 'ai';
import type { ComponentManifest, MountedInstance, SdkResult } from 'react-ai-core';
import { CombinedSelector } from './CombinedSelector.js';
import { PatchGenerator } from './PatchGenerator.js';
import { RetryValidator } from './RetryValidator.js';

export class ReactAiSdk {
  private combinedSelector: CombinedSelector;
  private generator: PatchGenerator;
  private retryValidator: RetryValidator;

  constructor(model: LanguageModel) {
    this.combinedSelector = new CombinedSelector(model);
    this.generator = new PatchGenerator(model);
    this.retryValidator = new RetryValidator(this.generator);
  }

  async updateFromPrompt(
    prompt: string,
    manifests: ComponentManifest[],
    mountedSnapshot: MountedInstance[],
    accessibilityTree?: string,
    markers?: Record<string, unknown>,
    currentUrl?: string,
  ): Promise<SdkResult> {
    const combined = await this.combinedSelector.select(
      prompt,
      manifests,
      mountedSnapshot,
      accessibilityTree,
      markers,
      currentUrl,
    );

    const manifest = manifests.find((m) => m.key === combined.key);
    if (!manifest) {
      return {
        target: null,
        patch: null,
        applied: false,
        errors: [`Unknown component key: ${combined.key}`],
        isDone: true,
      };
    }

    const mountedInstance = mountedSnapshot.find((i) => i.instanceId === combined.instanceId);
    if (!mountedInstance) {
      return {
        target: null,
        patch: null,
        applied: false,
        errors: [
          `Instance '${combined.instanceId}' not found in session — component may not be mounted yet`,
        ],
        isDone: true,
      };
    }

    const target = { key: combined.key, instanceId: combined.instanceId };
    const currentState = mountedInstance.currentProps ?? {};

    const { patch, errors } = await this.retryValidator.validateWithRetry(
      prompt,
      manifest,
      currentState,
      combined.patch,
    );

    if (errors.length > 0) {
      return { target, patch: null, applied: false, errors, isDone: true };
    }

    return { target, patch, applied: true, isDone: combined.done, reasoning: combined.intent };
  }
}
