import { generateText, tool } from 'ai';
import type { LanguageModel } from 'ai';
import { z } from 'zod';
import type { ComponentManifest, MountedInstance } from 'react-ai-core';
import { logPrompt } from './PromptLogger.js';

export interface CombinedResult {
  key: string;
  instanceId: string;
  patch: Record<string, unknown>;
  done: boolean;
  intent?: string;
}

export class CombinedSelector {
  constructor(private model: LanguageModel) {}

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
      .join('\n');

    const instanceList = mountedSnapshot
      .map((i) => {
        let line = `- key: "${i.key}", instanceId: "${i.instanceId}"`;
        if (i.currentProps && Object.keys(i.currentProps).length > 0) {
          line += `\n  current state: ${JSON.stringify(i.currentProps)}`;
        }
        if (i.context && Object.keys(i.context).length > 0) {
          line += `\n  options/constraints: ${JSON.stringify(i.context)}`;
        }
        return line;
      })
      .join('\n');

    const treeSection = accessibilityTree
      ? `\n## Page structure (DOM accessibility tree)\n\`\`\`\n${accessibilityTree}\n\`\`\`\n`
      : '';

    const urlLine = `Current URL: ${currentUrl ?? '(unknown)'}`;

    const markerLines =
      markers && Object.keys(markers).length > 0
        ? `Active markers:\n${Object.entries(markers)
            .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
            .join('\n')}\n`
        : '';

    const userMessage = `User prompt: "${prompt}"

${urlLine}
${markerLines}
Available components:
${componentList}

Mounted instances (you MUST pick an instanceId from this exact list):
${instanceList || '(none registered yet)'}
${treeSection}
Select the most appropriate component instance to modify and generate a patch with only its AI-writable props.`;

    logPrompt('CombinedSelector — select_and_patch', userMessage);

    const availableKeys = manifests.map((m) => m.key).join(', ');

    const { toolCalls } = await generateText({
      model: this.model,
      maxTokens: 1024,
      tools: {
        select_and_patch: tool({
          description:
            'Select the component instance to modify and generate the props patch in one step',
          parameters: z.object({
            key: z
              .string()
              .describe(`Component key to modify — must be one of: ${availableKeys}`),
            instanceId: z
              .string()
              .describe('Instance ID to target — must be from the mounted instances list'),
            patch: z
              .record(z.unknown())
              .describe(
                'Props to update — only include AI-writable props for the selected component',
              ),
            done: z
              .boolean()
              .describe(
                'Set true when this action fully satisfies the user request. Set false if more steps are needed (e.g. navigated to a page but still need to update a component there).',
              ),
            intent: z
              .string()
              .describe(
                'One or two sentences in plain English describing what you are about to do and why. Shown to the user for transparency.',
              ),
          }),
        }),
      },
      toolChoice: { type: 'tool', toolName: 'select_and_patch' },
      messages: [{ role: 'user', content: userMessage }],
    });

    const toolCall = toolCalls[0];
    if (!toolCall) {
      throw new Error('LLM did not return a tool_use block for combined selection');
    }

    return toolCall.args as CombinedResult;
  }
}
