import { describe, it, expect, vi } from 'vitest'
import { ReactAiSdk } from '../ReactAiSdk.js'
import { TestUtil } from './TestUtil.js'

vi.mock('../CombinedSelector.js', () => ({
  CombinedSelector: vi.fn().mockImplementation(() => ({ select: vi.fn() })),
}))

vi.mock('../PatchGenerator.js', () => ({
  PatchGenerator: vi.fn().mockImplementation(() => ({ generate: vi.fn() })),
}))

vi.mock('../RetryValidator.js', () => ({
  RetryValidator: vi.fn().mockImplementation(() => ({ validateWithRetry: vi.fn() })),
}))

describe('ReactAiSdk', () => {
  describe('updateFromPrompt', () => {
    it('updateFromPrompt_validSelection_returnsApplied', async () => {
      const { sdk, combinedSelector, retryValidator } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'inst-1', patch: { title: 'New' }, done: true })
      retryValidator.validateWithRetry.mockResolvedValue({ patch: { title: 'New' }, errors: [] })

      const result = await sdk.updateFromPrompt(
        'Update the card',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.applied).toBe(true)
      expect(result.patch).toEqual({ title: 'New' })
      expect(result.target).toEqual({ key: 'demo-card', instanceId: 'inst-1' })
    })

    it('updateFromPrompt_unknownKey_returnsError', async () => {
      const { sdk, combinedSelector } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'ghost-component', instanceId: 'inst-1', patch: {}, done: true })

      const result = await sdk.updateFromPrompt(
        'Update something',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.applied).toBe(false)
      expect(result.errors?.[0]).toContain('ghost-component')
    })

    it('updateFromPrompt_unknownInstanceId_returnsError', async () => {
      const { sdk, combinedSelector } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'ghost-inst', patch: {}, done: true })

      const result = await sdk.updateFromPrompt(
        'Update the card',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.applied).toBe(false)
      expect(result.errors?.[0]).toContain('ghost-inst')
    })

    it('updateFromPrompt_validationFails_returnsErrors', async () => {
      const { sdk, combinedSelector, retryValidator } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'inst-1', patch: { onClick: 'bad' }, done: true })
      retryValidator.validateWithRetry.mockResolvedValue({ patch: {}, errors: ["Prop 'onClick' is not AI-writable"] })

      const result = await sdk.updateFromPrompt(
        'Update the card',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.applied).toBe(false)
      expect(result.errors?.[0]).toContain('onClick')
    })

    it('updateFromPrompt_withAccessibilityTree_passesTreeToSelector', async () => {
      const { sdk, combinedSelector, retryValidator } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'inst-1', patch: { title: 'New' }, done: true })
      retryValidator.validateWithRetry.mockResolvedValue({ patch: { title: 'New' }, errors: [] })
      const tree = 'main\n  h2 "Test"\n  div [ai:demo-card]'

      await sdk.updateFromPrompt(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        tree,
      )

      expect(combinedSelector.select).toHaveBeenCalledWith(
        'Update it',
        expect.anything(),
        expect.anything(),
        tree,
        undefined,
        undefined,
      )
    })

    it('updateFromPrompt_withMarkersAndUrl_passesToSelector', async () => {
      const { sdk, combinedSelector, retryValidator } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'inst-1', patch: { title: 'New' }, done: true })
      retryValidator.validateWithRetry.mockResolvedValue({ patch: { title: 'New' }, errors: [] })
      const markers = { activePage: 'settings' }
      const url = 'http://localhost:5173/'

      await sdk.updateFromPrompt(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        undefined,
        markers,
        url,
      )

      expect(combinedSelector.select).toHaveBeenCalledWith(
        'Update it',
        expect.anything(),
        expect.anything(),
        undefined,
        markers,
        url,
      )
    })

    it('updateFromPrompt_doneFalse_propagatesIsDoneFalse', async () => {
      const { sdk, combinedSelector, retryValidator } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'inst-1', patch: { title: 'New' }, done: false })
      retryValidator.validateWithRetry.mockResolvedValue({ patch: { title: 'New' }, errors: [] })

      const result = await sdk.updateFromPrompt(
        'Navigate then update',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.isDone).toBe(false)
    })

    it('updateFromPrompt_doneTrue_propagatesIsDoneTrue', async () => {
      const { sdk, combinedSelector, retryValidator } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'inst-1', patch: { title: 'New' }, done: true })
      retryValidator.validateWithRetry.mockResolvedValue({ patch: { title: 'New' }, errors: [] })

      const result = await sdk.updateFromPrompt(
        'Update the card',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.isDone).toBe(true)
    })

    it('updateFromPrompt_unknownKey_isDoneTrue', async () => {
      const { sdk, combinedSelector } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'ghost-component', instanceId: 'inst-1', patch: {}, done: false })

      const result = await sdk.updateFromPrompt(
        'Update something',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.isDone).toBe(true)
    })

    it('updateFromPrompt_unknownInstance_isDoneTrue', async () => {
      const { sdk, combinedSelector } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'ghost-inst', patch: {}, done: false })

      const result = await sdk.updateFromPrompt(
        'Update the card',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.isDone).toBe(true)
    })

    it('updateFromPrompt_validationFails_isDoneTrue', async () => {
      const { sdk, combinedSelector, retryValidator } = createSdk()
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'inst-1', patch: { onClick: 'bad' }, done: false })
      retryValidator.validateWithRetry.mockResolvedValue({ patch: {}, errors: ["Prop 'onClick' is not AI-writable"] })

      const result = await sdk.updateFromPrompt(
        'Update the card',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      )

      expect(result.isDone).toBe(true)
    })

    it('updateFromPrompt_validSelection_passesCurrentStateToValidator', async () => {
      const { sdk, combinedSelector, retryValidator } = createSdk()
      const currentProps = { title: 'Existing Title' }
      combinedSelector.select.mockResolvedValue({ key: 'demo-card', instanceId: 'inst-1', patch: { title: 'New' }, done: true })
      retryValidator.validateWithRetry.mockResolvedValue({ patch: { title: 'New' }, errors: [] })

      await sdk.updateFromPrompt(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1', currentProps)],
      )

      expect(retryValidator.validateWithRetry).toHaveBeenCalledWith(
        'Update it',
        expect.anything(),
        currentProps,
        { title: 'New' },
      )
    })
  })
})

const createSdk = () => {
  const sdk = new ReactAiSdk({} as never)
  const combinedSelector = (sdk as never)['combinedSelector']
  const retryValidator = (sdk as never)['retryValidator']
  return { sdk, combinedSelector, retryValidator }
}
