import { useEffect } from 'react';
import { markerRegistry } from './MarkerRegistry.js';

export function useAiMarker(name: string, value: unknown): void {
  useEffect(() => {
    markerRegistry.set(name, value);
    return () => markerRegistry.remove(name);
  }, [name, value]);
}
