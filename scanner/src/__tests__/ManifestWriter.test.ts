import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ManifestWriter } from '../ManifestWriter.js';
import type { ComponentManifest } from 'react-ai-core/src/types.js';

describe('ManifestWriter', () => {
  describe('write', () => {
    it('write_manifests_createsRegistryJsonFile', () => {
      const outDir = TestUtil.createTempDir();
      const writer = TestUtil.createWriter();

      writer.write([TestUtil.createManifest()], outDir);

      expect(fs.existsSync(path.join(outDir, 'registry.json'))).toBe(true);
    });

    it('write_manifests_serialisesManifestArray', () => {
      const outDir = TestUtil.createTempDir();
      const manifest = TestUtil.createManifest();
      const writer = TestUtil.createWriter();

      writer.write([manifest], outDir);

      const written = JSON.parse(fs.readFileSync(path.join(outDir, 'registry.json'), 'utf-8'));
      expect(written).toHaveLength(1);
      expect(written[0].key).toBe(manifest.key);
    });

    it('write_multipleManifests_writesAll', () => {
      const outDir = TestUtil.createTempDir();
      const writer = TestUtil.createWriter();

      writer.write([TestUtil.createManifest('card-a'), TestUtil.createManifest('card-b')], outDir);

      const written = JSON.parse(fs.readFileSync(path.join(outDir, 'registry.json'), 'utf-8'));
      expect(written).toHaveLength(2);
      expect(written.map((m: ComponentManifest) => m.key)).toEqual(['card-a', 'card-b']);
    });

    it('write_nestedOutputDir_createsDirectoryTree', () => {
      const base = TestUtil.createTempDir();
      const outDir = path.join(base, 'deep', 'nested', 'dir');
      const writer = TestUtil.createWriter();

      writer.write([], outDir);

      expect(fs.existsSync(path.join(outDir, 'registry.json'))).toBe(true);
    });

    it('write_emptyManifests_writesEmptyArray', () => {
      const outDir = TestUtil.createTempDir();
      const writer = TestUtil.createWriter();

      writer.write([], outDir);

      const written = JSON.parse(fs.readFileSync(path.join(outDir, 'registry.json'), 'utf-8'));
      expect(written).toEqual([]);
    });

    it('write_manifest_preservesAiWritableProps', () => {
      const outDir = TestUtil.createTempDir();
      const manifest = TestUtil.createManifest('hero', ['headline', 'theme']);
      const writer = TestUtil.createWriter();

      writer.write([manifest], outDir);

      const written = JSON.parse(fs.readFileSync(path.join(outDir, 'registry.json'), 'utf-8'));
      expect(written[0].aiWritableProps).toEqual(['headline', 'theme']);
    });
  });
});

const TEMP_DIRS: string[] = [];

afterEach(() => {
  for (const dir of TEMP_DIRS.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

const TestUtil = {
  createWriter: (): ManifestWriter => new ManifestWriter(),

  createTempDir: (): string => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-writer-test-'));
    TEMP_DIRS.push(dir);
    return dir;
  },

  createManifest: (key = 'sample-card', aiWritableProps = ['title']): ComponentManifest => ({
    key,
    description: 'A test component.',
    filePath: '/src/components/Sample.tsx',
    aiWritableProps,
    propsJsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
  }),
};
