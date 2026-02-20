import { vi } from 'vitest'
import type { ComponentManifest, MountedInstance } from '../../../core/src/types.js'

export const TestUtil = {
  createManifest: (key = 'demo-card'): ComponentManifest => ({
    key,
    description: `A ${key} component`,
    filePath: `/fake/${key}.tsx`,
    aiWritableProps: ['title', 'body'],
    propsJsonSchema: {
      type: 'object',
      properties: { title: { type: 'string' }, body: { type: 'string' } },
    },
  }),

  createInstance: (
    key: string,
    instanceId: string,
    currentProps: Record<string, unknown> = {},
    context?: Record<string, unknown>,
  ): MountedInstance => ({
    key,
    instanceId,
    currentProps,
    context,
  }),

  createMockClientNoToolUse: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'No response' }],
      }),
    },
  }),
}
