import type { SseEvent } from 'react-ai-core/src/types.js';

export const TestUtil = {
  createPatchEvent: (
    key: string,
    instanceId: string,
    patch: Record<string, unknown>,
  ): SseEvent => ({
    type: 'patch',
    key,
    instanceId,
    patch,
  }),

  createSnapshotEvent: (
    key: string,
    instanceId: string,
    state: Record<string, unknown>,
  ): SseEvent => ({
    type: 'snapshot',
    key,
    instanceId,
    state,
  }),
};
