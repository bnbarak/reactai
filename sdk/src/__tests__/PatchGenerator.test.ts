import { describe, it, expect, vi } from 'vitest'
import { PatchGenerator } from '../PatchGenerator.js'
import type { ComponentManifest } from '../../../core/src/types.js'

describe('PatchGenerator', () => {
  describe('generate', () => {
    it('generate_validPrompt_returnsPatch', async () => {
      const client = TestUtil.createMockClient({ title: 'AI Title', body: 'AI Body' })
      const generator = new PatchGenerator(client as never)

      const result = await generator.generate(
        'Make it exciting',
        TestUtil.createManifest(),
        { title: 'Original' },
      )

      expect(result).toEqual({ title: 'AI Title', body: 'AI Body' })
    })

    it('generate_withValidationError_includesErrorInPrompt', async () => {
      const client = TestUtil.createMockClient({ title: 'Fixed' })
      const generator = new PatchGenerator(client as never)

      await generator.generate(
        'Update',
        TestUtil.createManifest(),
        {},
        'onClick is not AI-writable',
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('onClick is not AI-writable')
    })

    it('generate_noToolUseResponse_throwsError', async () => {
      const client = TestUtil.createMockClientNoToolUse()
      const generator = new PatchGenerator(client as never)

      await expect(
        generator.generate('Update', TestUtil.createManifest(), {}),
      ).rejects.toThrow('LLM did not return a tool_use block')
    })

    it('generate_called_usesSonnetModel', async () => {
      const client = TestUtil.createMockClient({ title: 'x' })
      const generator = new PatchGenerator(client as never)

      await generator.generate('test', TestUtil.createManifest(), {})

      expect(client.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-sonnet-4-6' }),
      )
    })
  })
})

const TestUtil = {
  createManifest: (): ComponentManifest => ({
    key: 'demo-card',
    description: 'A demo card',
    filePath: '/fake/DemoCard.tsx',
    aiWritableProps: ['title', 'body'],
    propsJsonSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        body: { type: 'string' },
      },
    },
  }),

  createMockClient: (patch: Record<string, unknown>) => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'tool_use', name: 'generate_patch', input: patch }],
      }),
    },
  }),

  createMockClientNoToolUse: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'No patch' }],
      }),
    },
  }),
}
