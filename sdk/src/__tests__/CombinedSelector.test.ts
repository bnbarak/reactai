import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LanguageModel } from 'ai';
import { CombinedSelector } from '../CombinedSelector.js';
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

describe('CombinedSelector', () => {
  describe('select', () => {
    it('select_singleInstance_returnsKeyInstanceIdAndPatch', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: { title: 'New' }, done: true });
      const selector = createSelector();

      const result = await selector.select(
        'Update the card title',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      );

      expect(result.key).toBe('demo-card');
      expect(result.instanceId).toBe('inst-1');
      expect(result.patch).toEqual({ title: 'New' });
      expect(result.done).toBe(true);
    });

    it('select_multipleInstances_returnsSpecificInstance', async () => {
      setupMock({ key: 'stock-position', instanceId: 'inst-2', patch: { currentPrice: 210 }, done: true });
      const selector = createSelector();

      const result = await selector.select(
        'Change AAPL price to 210',
        [TestUtil.createManifest('stock-position')],
        [
          TestUtil.createInstance('stock-position', 'inst-1'),
          TestUtil.createInstance('stock-position', 'inst-2'),
        ],
      );

      expect(result.instanceId).toBe('inst-2');
    });

    it('select_noToolCallInResponse_throwsError', async () => {
      mockGenerateText.mockResolvedValue({ toolCalls: [] });
      const selector = createSelector();

      await expect(
        selector.select(
          'Update',
          [TestUtil.createManifest()],
          [TestUtil.createInstance('demo-card', 'inst-1')],
        ),
      ).rejects.toThrow('LLM did not return a tool_use block');
    });

    it('select_called_passesModelToGenerateText', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const fakeModel = { fake: true } as unknown as LanguageModel;
      const selector = new CombinedSelector(fakeModel);

      await selector.select(
        'test',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      );

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ model: fakeModel }),
      );
    });

    it('select_called_includesMountedInstancesInPrompt', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-abc', patch: {}, done: true });
      const selector = createSelector();

      await selector.select(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-abc')],
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('inst-abc');
    });

    it('select_instanceWithCurrentProps_includesCurrentStateInPrompt', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const selector = createSelector();

      await selector.select(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1', { title: 'Current Title' })],
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('Current Title');
    });

    it('select_instanceWithContext_includesOptionsInPrompt', async () => {
      setupMock({ key: 'theme-selector', instanceId: 'theme-selector', patch: { selected: 'dark' }, done: true });
      const selector = createSelector();

      await selector.select(
        'Switch to dark mode',
        [TestUtil.createManifest('theme-selector')],
        [
          TestUtil.createInstance(
            'theme-selector',
            'theme-selector',
            { selected: 'light' },
            { selected: ['light', 'dark', 'system'] },
          ),
        ],
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('light');
      expect(callArg.messages[0].content).toContain('dark');
      expect(callArg.messages[0].content).toContain('system');
    });

    it('select_called_includesAvailableComponentKeysInPrompt', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const selector = createSelector();

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card'), TestUtil.createManifest('demo-banner')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('demo-card');
      expect(callArg.messages[0].content).toContain('demo-banner');
    });

    it('select_called_includesDoneInResult', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: false });
      const selector = createSelector();

      const result = await selector.select(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      );

      expect(result.done).toBe(false);
    });

    it('select_withAccessibilityTree_includesTreeInPrompt', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const selector = createSelector();
      const tree =
        'main\n  h2 "My Portfolio"\n  div [ai:user-profile-settings] (user-profile-settings)';

      await selector.select(
        'Change username',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        tree,
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('Page structure');
      expect(callArg.messages[0].content).toContain('[ai:user-profile-settings]');
    });

    it('select_withoutAccessibilityTree_omitsTreeSection', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const selector = createSelector();

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).not.toContain('Page structure');
    });

    it('select_withMarkers_includesMarkersInPrompt', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const selector = createSelector();

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        undefined,
        { activePage: 'portfolio' },
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('Active markers');
      expect(callArg.messages[0].content).toContain('activePage');
      expect(callArg.messages[0].content).toContain('portfolio');
    });

    it('select_withEmptyMarkers_omitsMarkersSection', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const selector = createSelector();

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        undefined,
        {},
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).not.toContain('Active markers');
    });

    it('select_withCurrentUrl_includesUrlInPrompt', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const selector = createSelector();

      await selector.select(
        'Update it',
        [TestUtil.createManifest('demo-card')],
        [TestUtil.createInstance('demo-card', 'inst-1')],
        undefined,
        undefined,
        'http://localhost:5173/',
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('Current URL: http://localhost:5173/');
    });

    it('select_withoutCurrentUrl_showsUnknown', async () => {
      setupMock({ key: 'demo-card', instanceId: 'inst-1', patch: {}, done: true });
      const selector = createSelector();

      await selector.select(
        'Update it',
        [TestUtil.createManifest()],
        [TestUtil.createInstance('demo-card', 'inst-1')],
      );

      const callArg = mockGenerateText.mock.calls[0][0];
      expect(callArg.messages[0].content).toContain('Current URL: (unknown)');
    });
  });
});

const createSelector = () => new CombinedSelector({} as unknown as LanguageModel);

const setupMock = (result: {
  key: string;
  instanceId: string;
  patch: Record<string, unknown>;
  done: boolean;
  intent?: string;
}) => {
  mockGenerateText.mockResolvedValue({
    toolCalls: [{ toolName: 'select_and_patch', args: result }],
  });
};
