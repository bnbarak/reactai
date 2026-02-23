import React, { useEffect, useRef } from 'react';
import { useAiState } from './useAiState.js';
import { snapshotRegistry } from './SnapshotRegistry.js';

interface ReactAiOptions {
  key: string;
  description: string;
}

export function reactAI<P extends object>(
  InnerComponent: React.ComponentType<P>,
  options: ReactAiOptions,
): React.ComponentType<P> {
  const { key } = options;

  function AiWrappedComponent(baseProps: P) {
    const instanceId = useRef(crypto.randomUUID()).current;
    const aiStatePatch = useAiState(key, instanceId);

    useEffect(() => {
      snapshotRegistry.set(instanceId, {
        key,
        state: { ...baseProps, ...aiStatePatch } as Record<string, unknown>,
      });
      return () => snapshotRegistry.remove(instanceId);
    }, [aiStatePatch]);

    const effectiveProps = { ...baseProps, ...aiStatePatch } as P;
    return (
      <div data-ai-id={instanceId} data-ai-key={key} style={{ display: 'contents' }}>
        <InnerComponent {...effectiveProps} />
      </div>
    );
  }

  AiWrappedComponent.displayName = `reactAI(${InnerComponent.displayName ?? InnerComponent.name})`;
  return AiWrappedComponent;
}
