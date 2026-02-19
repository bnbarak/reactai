import type Anthropic from '@anthropic-ai/sdk'
import type { ComponentManifest, MountedInstance, SdkResult } from '../../core/src/types.js'
import { ComponentSelector } from './ComponentSelector.js'
import { PatchGenerator } from './PatchGenerator.js'
import { RetryValidator } from './RetryValidator.js'

export class ReactAiSdk {
  private selector: ComponentSelector
  private generator: PatchGenerator
  private retryValidator: RetryValidator

  constructor(client: Anthropic) {
    this.selector = new ComponentSelector(client)
    this.generator = new PatchGenerator(client)
    this.retryValidator = new RetryValidator(this.generator)
  }

  async updateFromPrompt(
    prompt: string,
    manifests: ComponentManifest[],
    mountedSnapshot: MountedInstance[],
  ): Promise<SdkResult> {
    const target = await this.selector.select(prompt, manifests, mountedSnapshot)

    const manifest = manifests.find((m) => m.key === target.key)
    if (!manifest) {
      return {
        target: null,
        patch: null,
        applied: false,
        errors: [`Unknown component key: ${target.key}`],
      }
    }

    const mountedInstance = mountedSnapshot.find((i) => i.instanceId === target.instanceId)
    const currentState = mountedInstance?.currentProps ?? {}

    const initialPatch = await this.generator.generate(prompt, manifest, currentState)
    const { patch, errors } = await this.retryValidator.validateWithRetry(
      prompt,
      manifest,
      currentState,
      initialPatch,
    )

    if (errors.length > 0) {
      return { target, patch: null, applied: false, errors }
    }

    return { target, patch, applied: true }
  }
}
