import { describe, it, expect, beforeEach } from 'vitest';
import { markerRegistry } from '../MarkerRegistry.js';

describe('MarkerRegistry', () => {
  beforeEach(() => {
    Object.keys(markerRegistry.getAll()).forEach((k) => markerRegistry.remove(k));
  });

  describe('set / getAll', () => {
    it('set_newKey_appearsInGetAll', () => {
      markerRegistry.set('page', 'portfolio');

      expect(markerRegistry.getAll()).toEqual({ page: 'portfolio' });
    });

    it('set_sameKeyTwice_overwritesValue', () => {
      markerRegistry.set('page', 'portfolio');
      markerRegistry.set('page', 'settings');

      expect(markerRegistry.getAll().page).toBe('settings');
    });

    it('set_multipleKeys_allAppearInGetAll', () => {
      markerRegistry.set('page', 'portfolio');
      markerRegistry.set('user', 'alice');

      const all = markerRegistry.getAll();
      expect(all.page).toBe('portfolio');
      expect(all.user).toBe('alice');
    });
  });

  describe('remove', () => {
    it('remove_existingKey_absentFromGetAll', () => {
      markerRegistry.set('page', 'portfolio');

      markerRegistry.remove('page');

      expect(markerRegistry.getAll()).not.toHaveProperty('page');
    });

    it('remove_nonExistentKey_doesNotThrow', () => {
      expect(() => markerRegistry.remove('ghost')).not.toThrow();
    });

    it('remove_oneOfManyKeys_othersUnaffected', () => {
      markerRegistry.set('a', 1);
      markerRegistry.set('b', 2);

      markerRegistry.remove('a');

      expect(markerRegistry.getAll()).toEqual({ b: 2 });
    });
  });

  describe('getAll', () => {
    it('getAll_empty_returnsEmptyObject', () => {
      expect(markerRegistry.getAll()).toEqual({});
    });

    it('getAll_mutatingReturnedObject_doesNotCorruptRegistry', () => {
      markerRegistry.set('page', 'portfolio');

      const snapshot = markerRegistry.getAll();
      snapshot['injected'] = 'evil';

      expect(markerRegistry.getAll()).not.toHaveProperty('injected');
    });
  });
});
