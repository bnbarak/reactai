import fs from 'fs';
import path from 'path';
import type { ComponentManifest } from 'react-ai-core/src/types.js';

export class ManifestWriter {
  write(manifests: ComponentManifest[], outDir: string): void {
    fs.mkdirSync(outDir, { recursive: true });

    const registryPath = path.join(outDir, 'registry.json');
    fs.writeFileSync(registryPath, JSON.stringify(manifests, null, 2));
  }
}
