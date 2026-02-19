import { describe, it, expect, vi } from 'vitest'
import { ComponentSelector } from '../ComponentSelector.js'
import type { ComponentManifest, MountedInstance } from '../../../core/src/types.js'

describe('ComponentSelector', () => {
  describe('select', () => {
    it('select_singleInstance_returnsKeyAndInstanceId', async () => {
      const client = TestUtil.createMockClient({ key: 'demo-card', instanceId: 'inst-1' })
      const selector = new ComponentSelector(client as never)

      const result = await selector.select(
        'Update the card',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.key).toBe('demo-card')
      expect(result.instanceId).toBe('inst-1')
    })

    it('select_noToolUseInResponse_throwsError', async () => {
      const client = TestUtil.createMockClientNoToolUse()
      const selector = new ComponentSelector(client as never)

      await expect(
        selector.select('Update', [TestUtil.createManifest()], [TestUtil.createInstance('demo-card', 'inst-1')]),
      ).rejects.toThrow('LLM did not return a tool_use block')
    })

    it('select_called_usesHaikuModel', async () => {
      const client = TestUtil.createMockClient({ key: 'demo-card', instanceId: 'inst-1' })
      const selector = new ComponentSelector(client as never)

      await selector.select('test', [TestUtil.createManifest()], [TestUtil.createInstance('demo-card', 'inst-1')])

      expect(client.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
      )
    })
  })
})

const TestUtil = {
  createManifest: (): ComponentManifest => ({
    key: 'demo-card',
    description: 'A demo card component',
    filePath: '/fake/DemoCard.tsx',
    aiWritableProps: ['title', 'body'],
    propsJsonSchema: { type: 'object', properties: { title: { type: 'string' } } },
  }),

  createInstance: (key: string, instanceId: string): MountedInstance => ({
    key,
    instanceId,
    currentProps: { title: 'Current' },
  }),

  createMockClient: (selection: { key: string; instanceId: string }) => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'tool_use', name: 'select_component', input: selection }],
      }),
    },
  }),

  createMockClientNoToolUse: () => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'I cannot select' }],
      }),
    },
  }),
}
