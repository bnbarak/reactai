import { describe, it, expect } from 'vitest';
import { InMemorySessionStore } from '../SessionStore.js';

describe('InMemorySessionStore', () => {
  describe('createSession', () => {
    it('createSession_called_returnsUniqueId', () => {
      const store = new InMemorySessionStore();

      const id1 = store.createSession();
      const id2 = store.createSession();

      expect(id1).not.toBe(id2);
    });

    it('createSession_called_sessionExists', () => {
      const store = new InMemorySessionStore();

      const id = store.createSession();

      expect(store.hasSession(id)).toBe(true);
    });
  });

  describe('hasSession', () => {
    it('hasSession_unknownId_returnsFalse', () => {
      const store = new InMemorySessionStore();

      expect(store.hasSession('unknown')).toBe(false);
    });
  });
});
