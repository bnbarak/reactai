import type { ComponentManifest, MountedInstance } from 'react-ai-core';

export interface AiSdkLike {
  updateFromPrompt(
    prompt: string,
    manifests: ComponentManifest[],
    mountedSnapshot: MountedInstance[],
    accessibilityTree?: string,
    markers?: Record<string, unknown>,
    currentUrl?: string,
  ): Promise<{
    target: { key: string; instanceId: string } | null;
    patch: Record<string, unknown> | null;
    applied: boolean;
    errors?: string[];
    isDone?: boolean;
  }>;
}

export interface ReactAiRouterOptions {
  registryPath?: string;
  manifests?: ComponentManifest[];
  sdk?: AiSdkLike;
}
