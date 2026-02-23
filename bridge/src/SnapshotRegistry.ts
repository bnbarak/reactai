import type { MountedInstance } from 'react-ai-core/src/types.js';

interface SnapshotEntry {
  key: string;
  state: Record<string, unknown>;
  description?: string;
  aiWritableProps?: string[];
  context?: Record<string, unknown>;
}

class SnapshotRegistry {
  private entries = new Map<string, SnapshotEntry>();

  set(instanceId: string, entry: SnapshotEntry): void {
    this.entries.set(instanceId, entry);
  }

  remove(instanceId: string): void {
    this.entries.delete(instanceId);
  }

  getAll(): MountedInstance[] {
    return Array.from(this.entries.entries()).map(([instanceId, e]) => ({
      key: e.key,
      instanceId,
      currentProps: e.state,
      description: e.description,
      aiWritableProps: e.aiWritableProps,
      context: e.context,
    }));
  }
}

export const snapshotRegistry = new SnapshotRegistry();
