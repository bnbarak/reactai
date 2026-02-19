import type Anthropic from '@anthropic-ai/sdk'
import type { ComponentManifest, MountedInstance } from '../../core/src/types.js'

export interface SelectionResult {
  key: string
  instanceId: string
}

export class ComponentSelector {
  constructor(private client: Anthropic) {}

  async select(
    prompt: string,
    manifests: ComponentManifest[],
    mountedSnapshot: MountedInstance[],
  ): Promise<SelectionResult> {
    const componentList = manifests
      .map((m) => `- key: "${m.key}", description: "${m.description}"`)
      .join('\n')

    const instanceList = mountedSnapshot
      .map((i) => `- key: "${i.key}", instanceId: "${i.instanceId}"`)
      .join('\n')

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      tools: [
        {
          name: 'select_component',
          description: 'Select the component instance to modify based on the user prompt',
          input_schema: {
            type: 'object' as const,
            properties: {
              key: { type: 'string', description: 'Component key' },
              instanceId: { type: 'string', description: 'Instance ID to target' },
            },
            required: ['key', 'instanceId'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'select_component' },
      messages: [
        {
          role: 'user',
          content: `User prompt: "${prompt}"\n\nAvailable components:\n${componentList}\n\nMounted instances:\n${instanceList}\n\nSelect the most appropriate component instance to modify.`,
        },
      ],
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('LLM did not return a tool_use block for component selection')
    }

    return toolUse.input as SelectionResult
  }
}
