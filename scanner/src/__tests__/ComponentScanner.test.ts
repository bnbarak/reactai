import { describe, it, expect } from 'vitest'
import path from 'path'
import { fileURLToPath } from 'url'
import { ComponentScanner } from '../ComponentScanner.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(__dirname, '../../fixtures')

describe('ComponentScanner', () => {
  describe('scan', () => {
    it('scan_annotatedInterface_returnsOneManifest', () => {
      const scanner = TestUtil.createScanner()

      const result = scanner.scan(FIXTURES_DIR)

      expect(result).toHaveLength(1)
    })

    it('scan_annotatedInterface_extractsKey', () => {
      const scanner = TestUtil.createScanner()

      const result = scanner.scan(FIXTURES_DIR)

      expect(result[0].key).toBe('sample-card')
    })

    it('scan_annotatedInterface_extractsDescription', () => {
      const scanner = TestUtil.createScanner()

      const result = scanner.scan(FIXTURES_DIR)

      expect(result[0].description).toBe('A sample card component for testing purposes.')
    })

    it('scan_annotatedInterface_extractsContextSummary', () => {
      const scanner = TestUtil.createScanner()

      const result = scanner.scan(FIXTURES_DIR)

      expect(result[0].contextSummary).toBe('Renders inside the main content area.')
    })

    it('scan_reactAiProps_includesInAiWritable', () => {
      const scanner = TestUtil.createScanner()

      const result = scanner.scan(FIXTURES_DIR)

      expect(result[0].aiWritableProps).toContain('title')
      expect(result[0].aiWritableProps).toContain('body')
      expect(result[0].aiWritableProps).toContain('buttonLabel')
    })

    it('scan_noAIProp_excludesFromAiWritable', () => {
      const scanner = TestUtil.createScanner()

      const result = scanner.scan(FIXTURES_DIR)

      expect(result[0].aiWritableProps).not.toContain('onClick')
    })

    it('scan_manifest_includesJsonSchema', () => {
      const scanner = TestUtil.createScanner()

      const result = scanner.scan(FIXTURES_DIR)

      expect(result[0].propsJsonSchema).toMatchObject({
        type: 'object',
        properties: {
          title: { type: 'string' },
        },
      })
    })
  })
})

const TestUtil = {
  createScanner: (): ComponentScanner => new ComponentScanner(),
}
