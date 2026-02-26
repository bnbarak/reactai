import type { ComponentManifest, MountedInstance } from 'react-ai-core';

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
};
