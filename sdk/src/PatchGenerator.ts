import type Anthropic from '@anthropic-ai/sdk'
import type { ComponentManifest } from '../../core/src/types.js'
import { logPrompt } from './PromptLogger.js'

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

    const userMessage = `User prompt: "${prompt}"

Component: ${manifest.key}
Description: ${manifest.description}
Current state: ${JSON.stringify(currentState)}
AI-writable props: ${manifest.aiWritableProps.join(', ')}${errorSection}

Generate a patch object with only AI-writable props that satisfies the user's request.`

    logPrompt(`PatchGenerator — generate_patch (${manifest.key})`, userMessage)

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
        { role: 'user', content: userMessage },
      ],
    })

    const toolUse = response.content.find((b) => b.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('LLM did not return a tool_use block for patch generation')
    }

    return toolUse.input as Record<string, unknown>
  }
}
