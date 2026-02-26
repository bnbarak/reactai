import { generateText, tool, jsonSchema } from 'ai';
import type { LanguageModel } from 'ai';
import type { ComponentManifest } from 'react-ai-core';
import { logPrompt } from './PromptLogger.js';

export class PatchGenerator {
  constructor(private model: LanguageModel) {}

  async generate(
    prompt: string,
    manifest: ComponentManifest,
    currentState: Record<string, unknown>,
    validationError?: string,
  ): Promise<Record<string, unknown>> {
    const errorSection = validationError
      ? `\n\nPrevious patch was invalid: ${validationError}\nPlease fix the issues.`
      : '';

    const userMessage = `User prompt: "${prompt}"

Component: ${manifest.key}
Description: ${manifest.description}
Current state: ${JSON.stringify(currentState)}
AI-writable props: ${manifest.aiWritableProps.join(', ')}${errorSection}

Generate a patch object with only AI-writable props that satisfies the user's request.`;

    logPrompt(`PatchGenerator — generate_patch (${manifest.key})`, userMessage);

    const { toolCalls } = await generateText({
      model: this.model,
      maxTokens: 1024,
      tools: {
        generate_patch: tool({
          description: `Generate a props patch for the "${manifest.key}" component. Only include AI-writable props: ${manifest.aiWritableProps.join(', ')}.`,
          parameters: jsonSchema<Record<string, unknown>>(manifest.propsJsonSchema),
        }),
      },
      toolChoice: { type: 'tool', toolName: 'generate_patch' },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolCall = toolCalls[0];
    if (!toolCall) {
      throw new Error('LLM did not return a tool_use block for patch generation');
    }

    return toolCall.args as Record<string, unknown>;
  }
}
