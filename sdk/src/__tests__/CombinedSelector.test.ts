import { describe, it, expect, vi } from 'vitest'
import { CombinedSelector } from '../CombinedSelector.js'
import { TestUtil } from './TestUtil.js'

describe('CombinedSelector', () => {
  describe('select', () => {
    it('select_singleInstance_returnsKeyInstanceIdAndPatch', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: { title: 'New' }, done: true })
      const selector = new CombinedSelector(client as never)

      const result = await selector.select(
        'Update the card title',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.key).toBe('demo-card')
      expect(result.instanceId).toBe('inst-1')
      expect(result.patch).toEqual({ title: 'New' })
      expect(result.done).toBe(true)
    })

    it('select_multipleInstances_returnsSpecificInstance', async () => {
      const client = createMockClient({ key: 'stock-position', instanceId: 'inst-2', patch: { currentPrice: 210 }, done: true })
      const selector = new CombinedSelector(client as never)

      const result = await selector.select(
        'Change AAPL price to 210',
        [TestUtil.createManifest('stock-position')],
        [
          TestUtil.createInstance('stock-position', 'inst-1'),
          TestUtil.createInstance('stock-position', 'inst-2'),
        ],
      )

      expect(result.instanceId).toBe('inst-2')
    })

    it('select_noToolUseInResponse_throwsError', async () => {
      const selector = new CombinedSelector(TestUtil.createMockClientNoToolUse() as never)

      await expect(
        selector.select('Update', [TestUtil.createManifest()], [TestUtil.createInstance('demo-card', 'inst-1')]),
      ).rejects.toThrow('LLM did not return a tool_use block')
    })

    it('select_called_usesHaikuModel', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select('test', [TestUtil.createManifest()], [TestUtil.createInstance('demo-card', 'inst-1')])

      expect(client.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-haiku-4-5-20251001' }),
      )
    })

    it('select_called_includesMountedInstancesInPrompt', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-abc', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-abc')],
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('inst-abc')
    })

    it('select_instanceWithCurrentProps_includesCurrentStateInPrompt', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1', { title: 'Current Title' })],
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('Current Title')
    })

    it('select_instanceWithContext_includesOptionsInPrompt', async () => {
      const client = createMockClient({ key: 'theme-selector', instanceId: 'theme-selector', patch: { selected: 'dark' }, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select(
        'Switch to dark mode',
        [TestUtil.createManifest('theme-selector')],
        [TestUtil.createInstance('theme-selector', 'theme-selector', { selected: 'light' }, { selected: ['light', 'dark', 'system'] })],
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('light')
      expect(callArg.messages[0].content).toContain('dark')
      expect(callArg.messages[0].content).toContain('system')
    })

    it('select_called_includesKeyEnumInToolSchema', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card'), TestUtil.createManifest('demo-banner')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      const schema = callArg.tools[0].input_schema
      expect(schema.properties.key.enum).toContain('demo-card')
      expect(schema.properties.key.enum).toContain('demo-banner')
    })

    it('select_called_includesDoneInToolSchema', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select('Update it', [TestUtil.createManifest()], [TestUtil.createInstance('demo-card', 'inst-1')])

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      const schema = callArg.tools[0].input_schema
      expect(schema.properties.done.type).toBe('boolean')
      expect(schema.required).toContain('done')
    })

    it('select_withAccessibilityTree_includesTreeInPrompt', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)
      const tree = 'main\n  h2 "My Portfolio"\n  div [ai:user-profile-settings] (user-profile-settings)'

      await selector.select(
        'Change username',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        tree,
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('Page structure')
      expect(callArg.messages[0].content).toContain('[ai:user-profile-settings]')
    })

    it('select_withoutAccessibilityTree_omitsTreeSection', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).not.toContain('Page structure')
    })

    it('select_withMarkers_includesMarkersInPrompt', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        undefined,
        { activePage: 'portfolio' },
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('Active markers')
      expect(callArg.messages[0].content).toContain('activePage')
      expect(callArg.messages[0].content).toContain('portfolio')
    })

    it('select_withEmptyMarkers_omitsMarkersSection', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        undefined,
        {},
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).not.toContain('Active markers')
    })

    it('select_withCurrentUrl_includesUrlInPrompt', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        undefined,
        undefined,
        'http://localhost:5173/',
      )

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('Current URL: http://localhost:5173/')
    })

    it('select_withoutCurrentUrl_showsUnknown', async () => {
      const client = createMockClient({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true })
      const selector = new CombinedSelector(client as never)

      await selector.select('Update it', [TestUtil.createManifest()], [TestUtil.createInstance('demo-card', 'inst-1')])

      const callArg = (client.messages.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(callArg.messages[0].content).toContain('Current URL: (unknown)')
    })
  })
})

const createMockClient = (result: { key: string; instanceId: string; patch: Record<string, unknown>; done: boolean }) => ({
  messages: {
    create: vi.fn().mockResolvedValue({
      content: [{ type: 'tool_use', name: 'select_and_patch', input: result }],
    }),
  },
})
