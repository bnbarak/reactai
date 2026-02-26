import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LanguageModel } from 'ai';
import { PatchGenerator } from '../PatchGenerator.js';
import { TestUtil } from './TestUtil.js';

const mockGenerateText = vi.hoisted(() => vi.fn());

vi.mock('ai', () => ({
  generateText: mockGenerateText,
  tool: vi.fn().mockImplementation((t) => t),
  jsonSchema: vi.fn().mockImplementation((s) => s),
}));

beforeEach(() => {
  mockGenerateText.mockReset();
});

describe('PatchGenerator', () => {
  describe('generate', () => {
    it('generate_validPrompt_returnsPatch', async () => {
      mockGenerateText.mockResolvedValue({
        toolCalls: [{ toolName: 'generate_patch', args: { title: 'AI Title', body: 'AI Body' } }],
      });
      const generator = new PatchGenerator({} as unknown as LanguageModel);

      const result = await generator.generate('Make it exciting', TestUtil.createManifest(), {
        title: 'Original',
      });

      expect(result).toEqual({ title: 'AI Title', body: 'AI Body' });
    });

    it('generate_withValidationError_includesErrorInPrompt', async () => {
      mockGenerateText.mockResolvedValue({
        toolCalls: [{ toolName: 'generate_patch', args: { title: 'Fixed' } }],
      });
      const generator = new PatchGenerator({} as unknown as LanguageModel);

      await generator.generate(
        'Update',
        TestUtil.createManifest(),
        {},
        'onClick is not AI-writable',
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('onClick is not AI-writable');
    });

    it('generate_noToolCallInResponse_throwsError', async () => {
      mockGenerateText.mockResolvedValue({ toolCalls: [] });
      const generator = new PatchGenerator({} as unknown as LanguageModel);

      await expect(generator.generate('Update', TestUtil.createManifest(), {})).rejects.toThrow(
        'LLM did not return a tool_use block',
      );
    });

    it('generate_called_passesModelToGenerateText', async () => {
      mockGenerateText.mockResolvedValue({
        toolCalls: [{ toolName: 'generate_patch', args: { title: 'x' } }],
      });
      const fakeModel = { fake: true } as unknown as LanguageModel;
      const generator = new PatchGenerator(fakeModel);

      await generator.generate('test', TestUtil.createManifest(), {});

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ model: fakeModel }),
      );
    });
  });
});
