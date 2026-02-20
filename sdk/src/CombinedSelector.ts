import type Anthropic from '@anthropic-ai/sdk'
import type { ComponentManifest, MountedInstance } from '../../core/src/types.js'
import { logPrompt } from './PromptLogger.js'

export interface CombinedResult {
  key: string
  instanceId: string
  patch: Record<string, unknown>
  done: boolean
  intent?: string
}

export class CombinedSelector {
  constructor(private client: Anthropic) {}

  async select(
    prompt: string,
    manifests: ComponentManifest[],
    mountedSnapshot: MountedInstance[],
    accessibilityTree?: string,
    markers?: Record<string, unknown>,
    currentUrl?: string,
  ): Promise<CombinedResult> {
    const componentList = manifests
      .map(
        (m) =>
          `- key: "${m.key}"\n  description: "${m.description}"\n  ai-writable props: ${m.aiWritableProps.join(', ')}`,
      )
      .join('\n')

    const instanceList = mountedSnapshot
      .map((i) => {
        let line = `- key: "${i.key}", instanceId: "${i.instanceId}"`
        if (i.currentProps && Object.keys(i.currentProps).length > 0) {
          line += `\n  current state: ${JSON.stringify(i.currentProps)}`
        }
        if (i.context && Object.keys(i.context).length > 0) {
          line += `\n  options/constraints: ${JSON.stringify(i.context)}`
        }
        return line
      })
      .join('\n')

    const treeSection = accessibilityTree
      ? `\n## Page structure (DOM accessibility tree)\n\`\`\`\n${accessibilityTree}\n\`\`\`\n`
      : ''

    const urlLine = `Current URL: ${currentUrl ?? '(unknown)'}`

    const markerLines =
      markers && Object.keys(markers).length > 0
        ? `Active markers:\n${Object.entries(markers)
            .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
            .join('\n')}\n`
        : ''

    const userMessage = `User prompt: "${prompt}"

${urlLine}
${markerLines}
Available components:
${componentList}

Mounted instances (you MUST pick an instanceId from this exact list):
${instanceList || '(none registered yet)'}
${treeSection}
Select the most appropriate component instance to modify and generate a patch with only its AI-writable props.`

    logPrompt('CombinedSelector — select_and_patch', userMessage)

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [
        {
          name: 'select_and_patch',
          description: 'Select the component instance to modify and generate the props patch in one step',
          input_schema: {
            type: 'object' as const,
            properties: {
              key: {
                type: 'string',
                enum: manifests.map((m) => m.key),
                description: 'Component key to modify',
              },
              instanceId: {
                type: 'string',
                description: 'Instance ID to target — must be from the mounted instances list',
              },
              patch: {
                type: 'object',
                description: 'Props to update — only include AI-writable props for the selected component',
              },
              done: {
                type: 'boolean',
                description:
                  'Set true when this action fully satisfies the user request. Set false if more steps are needed (e.g. navigated to a page but still need to update a component there).',
              },
              intent: {
                type: 'string',
                description:
                  'One or two sentences in plain English describing what you are about to do and why. Shown to the user for transparency.',
              },
            },
            required: ['key', 'instanceId', 'patch', 'done', 'intent'],
          },
        },
      ],
      tool_choice: { type: 'tool', name: 'select_and_patch' },
      messages: [{ role: 'user', content: userMessage }],
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('LLM did not return a tool_use block for combined selection')
    }

    return toolUse.input as CombinedResult
  }
}
