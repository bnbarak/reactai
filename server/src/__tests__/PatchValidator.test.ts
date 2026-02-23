import { describe, it, expect } from 'vitest';
import { PatchValidator } from '../PatchValidator.js';
import type { ComponentManifest } from 'react-ai-core/src/types.js';

describe('PatchValidator', () => {
  describe('validate', () => {
    it('validate_aiWritableProp_returnsValid', () => {
      const validator = TestUtil.createValidator();

      const result = validator.validate('demo-card', { title: 'New Title' });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validate_unknownKey_returnsInvalid', () => {
      const validator = TestUtil.createValidator();

      const result = validator.validate('unknown-component', { title: 'x' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown component key: unknown-component');
    });

    it('validate_nonAiWritableProp_returnsInvalid', () => {
      const validator = TestUtil.createValidator();

      const result = validator.validate('demo-card', { onClick: 'handler' });

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Prop 'onClick' is not AI-writable");
    });

    it('validate_mixedProps_reportsOnlyInvalid', () => {
      const validator = TestUtil.createValidator();

      const result = validator.validate('demo-card', { title: 'ok', onClick: 'bad' });

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('onClick');
    });

    it('validate_emptyPatch_returnsValid', () => {
      const validator = TestUtil.createValidator();

      const result = validator.validate('demo-card', {});

      expect(result.valid).toBe(true);
    });
  });
});

const TestUtil = {
  createManifest: (): ComponentManifest => ({
    key: 'demo-card',
    description: 'A demo card',
    filePath: '/fake/path.tsx',
    aiWritableProps: ['title', 'body', 'buttonLabel'],
    propsJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
        buttonLabel: { type: 'string' },
      },
    },
  }),

  createValidator: (): PatchValidator => new PatchValidator([TestUtil.createManifest()]),
};
