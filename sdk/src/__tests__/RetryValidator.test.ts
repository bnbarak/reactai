import { describe, it, expect, vi } from 'vitest'
import { RetryValidator } from '../RetryValidator.js'
import type { ComponentManifest } from '../../../core/src/types.js'

describe('RetryValidator', () => {
  describe('validatePatch', () => {
    it('validatePatch_aiWritableProps_returnsValid', () => {
      const validator = TestUtil.createValidator()

      const result = validator.validatePatch(TestUtil.createManifest(), { title: 'Hello' })

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('validatePatch_nonAiWritableProp_returnsInvalid', () => {
      const validator = TestUtil.createValidator()

      const result = validator.validatePatch(TestUtil.createManifest(), { onClick: 'bad' })

      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain("Prop 'onClick'")
    })
  })

  describe('validateWithRetry', () => {
    it('validateWithRetry_validInitialPatch_returnsWithoutRetry', async () => {
      const mockGenerator = TestUtil.createMockGenerator({ title: 'ok' })
      const validator = new RetryValidator(mockGenerator as never)

      const result = await validator.validateWithRetry(
        'prompt',
        TestUtil.createManifest(),
        {},
        { title: 'Valid' },
      )

      expect(result.errors).toHaveLength(0)
      expect(result.patch).toEqual({ title: 'Valid' })
      expect(mockGenerator.generate).not.toHaveBeenCalled()
    })

    it('validateWithRetry_invalidPatchFixedOnRetry_returnsFixed', async () => {
      const mockGenerator = TestUtil.createMockGenerator({ title: 'Fixed' })
      const validator = new RetryValidator(mockGenerator as never)

      const result = await validator.validateWithRetry(
        'prompt',
        TestUtil.createManifest(),
        {},
        { onClick: 'invalid' },
      )

      expect(result.errors).toHaveLength(0)
      expect(result.patch).toEqual({ title: 'Fixed' })
      expect(mockGenerator.generate).toHaveBeenCalledOnce()
    })

    it('validateWithRetry_alwaysInvalid_returnsErrors', async () => {
      const mockGenerator = TestUtil.createMockGenerator({ onClick: 'still-invalid' })
      const validator = new RetryValidator(mockGenerator as never)

      const result = await validator.validateWithRetry(
        'prompt',
        TestUtil.createManifest(),
        {},
        { onClick: 'invalid' },
      )

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.patch).toEqual({})
    })
  })
})

const TestUtil = {
  createManifest: (): ComponentManifest => ({
    key: 'demo-card',
    description: 'A demo card',
    filePath: '/fake/DemoCard.tsx',
    aiWritableProps: ['title', 'body'],
    propsJsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
  }),

  createValidator: (): RetryValidator => new RetryValidator({ generate: vi.fn() } as never),

  createMockGenerator: (patch: Record<string, unknown>) => ({
    generate: vi.fn().mockResolvedValue(patch),
  }),
}
