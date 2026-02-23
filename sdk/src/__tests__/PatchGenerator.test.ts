import { describe, it, expect, vi } from 'vitest';
import { PatchGenerator } from '../PatchGenerator.js';
import { TestUtil } from './TestUtil.js';

describe('PatchGenerator', () => {
  describe('generate', () => {
    it('generate_validPrompt_returnsPatch', async () => {
      const client = createMockClient({ title: 'AI Title', body: 'AI Body' });
      const generator = new PatchGenerator(client as never);

      const result = await generator.generate('Make it exciting', TestUtil.createManifest(), {
        title: 'Original',
      });

      expect(result).toEqual({ title: 'AI Title', body: 'AI Body' });
    });

    it('generate_withValidationError_includesErrorInPrompt', async () => {
      const client = createMockClient({ title: 'Fixed' });
      const generator = new PatchGenerator(client as never);

      await generator.generate(
        'Update',
        TestUtil.createManifest(),
        {},
        'onClick is not AI-writable',
      );

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('onClick is not AI-writable');
    });

    it('generate_noToolUseResponse_throwsError', async () => {
      const generator = new PatchGenerator(TestUtil.createMockClientNoToolUse() as never);

      await expect(generator.generate('Update', TestUtil.createManifest(), {})).rejects.toThrow(
        'LLM did not return a tool_use block',
      );
    });

    it('generate_called_usesHaikuModel', async () => {
      const client = createMockClient({ title: 'x' });
      const generator = new PatchGenerator(client as never);

      await generator.generate('test', TestUtil.createManifest(), {});

      expect(client.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
      );
    });
  });
});

const createMockClient = (patch: Record<string, unknown>) => ({
  messages: {
    create: vi.fn().mockResolvedValue({
      content: [{ type: 'tool_use', name: 'generate_patch', input: patch }],
    }),
  },
});
