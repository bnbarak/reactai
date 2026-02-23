import { describe, it, expect } from 'vitest';
import { SchemaGenerator, type PropSpec } from '../SchemaGenerator.js';

describe('SchemaGenerator', () => {
  describe('generate', () => {
    it('generate_stringProp_returnsStringSchema', () => {
      const generator = TestUtil.createGenerator();
      const props = TestUtil.createStringProp('title');

      const schema = generator.generate(props, ['title']);

      expect((schema.properties as Record<string, unknown>)['title']).toEqual({ type: 'string' });
    });

    it('generate_numberProp_returnsNumberSchema', () => {
      const generator = TestUtil.createGenerator();
      const props = TestUtil.createProp('count', 'number', false);

      const schema = generator.generate(props, ['count']);

      expect((schema.properties as Record<string, unknown>)['count']).toEqual({ type: 'number' });
    });

    it('generate_booleanProp_returnsBooleanSchema', () => {
      const generator = TestUtil.createGenerator();
      const props = TestUtil.createProp('visible', 'boolean', false);

      const schema = generator.generate(props, ['visible']);

      expect((schema.properties as Record<string, unknown>)['visible']).toEqual({
        type: 'boolean',
      });
    });

    it('generate_unionStringProp_returnsEnumSchema', () => {
      const generator = TestUtil.createGenerator();
      const props = TestUtil.createProp('theme', "'light' | 'dark'", false);

      const schema = generator.generate(props, ['theme']);

      expect((schema.properties as Record<string, unknown>)['theme']).toEqual({
        type: 'string',
        enum: ['light', 'dark'],
      });
    });

    it('generate_requiredProp_includesInRequired', () => {
      const generator = TestUtil.createGenerator();
      const props = TestUtil.createProp('title', 'string', false);

      const schema = generator.generate(props, ['title']);

      expect(schema.required).toContain('title');
    });

    it('generate_optionalProp_excludesFromRequired', () => {
      const generator = TestUtil.createGenerator();
      const props = TestUtil.createProp('body', 'string', true);

      const schema = generator.generate(props, ['body']);

      expect(schema.required).toBeUndefined();
    });

    it('generate_stringArrayProp_returnsArraySchema', () => {
      const generator = TestUtil.createGenerator();
      const props = TestUtil.createProp('board', 'string[]', false);

      const schema = generator.generate(props, ['board']);

      expect((schema.properties as Record<string, unknown>)['board']).toEqual({
        type: 'array',
        items: { type: 'string' },
      });
    });

    it('generate_nonAiProp_excludesFromProperties', () => {
      const generator = TestUtil.createGenerator();
      const props = [
        ...TestUtil.createStringProp('title'),
        ...TestUtil.createProp('onClick', 'function', false),
      ];

      const schema = generator.generate(props, ['title']);

      expect(Object.keys(schema.properties as Record<string, unknown>)).not.toContain('onClick');
    });
  });
});

const TestUtil = {
  createGenerator: (): SchemaGenerator => new SchemaGenerator(),

  createStringProp: (name: string): PropSpec[] => [{ name, typeText: 'string', isOptional: false }],

  createProp: (name: string, typeText: string, isOptional: boolean): PropSpec[] => [
    { name, typeText, isOptional },
  ],
};
