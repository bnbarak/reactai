import type Anthropic from '@anthropic-ai/sdk'
import type { ComponentManifest } from '../../core/src/types.js'

export class PatchGenerator {
  constructor(private client: Anthropic) {}

  async generate(
    prompt: string,
    manifest: ComponentManifest,
    currentState: Record<string, unknown>,
    validationError?: string,
  ): Promise<Record<string, unknown>> {
    const errorSection = validationError
      ? `\n\nPrevious patch was invalid: ${validationError}\nPlease fix the issues.`
      : ''

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: [
        {
          name: 'generate_patch',
          description: `Generate a props patch for the "${manifest.key}" component. Only include AI-writable props: ${manifest.aiWritableProps.join(', ')}.`,
          input_schema: manifest.propsJsonSchema as Anthropic.Tool['input_schema'],
        },
      ],
      tool_choice: { type: 'tool', name: 'generate_patch' },
      messages: [
        {
          role: 'user',
          content: `User prompt: "${prompt}"

Component: ${manifest.key}
Description: ${manifest.description}
Current state: ${JSON.stringify(currentState)}
AI-writable props: ${manifest.aiWritableProps.join(', ')}${errorSection}

Generate a patch object with only AI-writable props that satisfies the user's request.`,
        },
      ],
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('LLM did not return a tool_use block for patch generation')
    }

    return toolUse.input as Record<string, unknown>
  }
}
