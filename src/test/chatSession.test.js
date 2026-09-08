/**
 * @file: src/test/chatSession.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The session id is the document key every stored transcript is filed under, so it has to be
 *     stable across a conversation, url-safe enough for the server's guard to accept, and it has
 *     to survive Safari private mode throwing on sessionStorage access.
 *
 * @See Also:
 *     src/components/chat/transport/chatSession.js
 *     functions/lib/chatStore.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SESSION_KEY, chatSessionId, resetChatSession } from '../components/chat/transport/chatSession';
import { isValidSessionId } from '../../functions/lib/chatStore.js';

beforeEach(() => {
  resetChatSession();
  try { window.localStorage.clear(); } catch { /* private mode */ }
});
afterEach(() => vi.restoreAllMocks());

describe('chatSessionId', () => {
  it('mints an id the server will accept', () => {
    expect(isValidSessionId(chatSessionId())).toBe(true);
  });

  it('returns the same id for every turn of a conversation', () => {
    expect(chatSessionId()).toBe(chatSessionId());
  });

  it('survives a reload and a second tab, so a return visit joins one transcript', () => {
    const first = chatSessionId();
    resetChatSession();
    expect(chatSessionId()).toBe(first);
    expect(window.localStorage.getItem(SESSION_KEY)).toBe(first);
  });

  it('replaces a stored value the server would reject', () => {
    window.localStorage.setItem(SESSION_KEY, '../../admin');
    const id = chatSessionId();
    expect(id).not.toBe('../../admin');
    expect(isValidSessionId(id)).toBe(true);
  });

  it('still returns a usable id when storage throws, and keeps it stable', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => { throw new Error('private mode'); });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => { throw new Error('private mode'); });

    const id = chatSessionId();
    expect(isValidSessionId(id)).toBe(true);
    expect(chatSessionId()).toBe(id);
  });

  it('mints a distinct id per visitor rather than a shared constant', () => {
    const first = chatSessionId();
    resetChatSession();
    window.localStorage.clear();
    expect(chatSessionId()).not.toBe(first);
  });

  it('does not depend on crypto.randomUUID being present', () => {
    const original = globalThis.crypto?.randomUUID;
    if (original) vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => { throw new Error('unavailable'); });
    expect(isValidSessionId(chatSessionId())).toBe(true);
  });
});

describe('the client guard agrees with the server', () => {
  it('rejects a Firestore-reserved id, the same way the server does', () => {
    window.localStorage.setItem(SESSION_KEY, '__proto__');
    const minted = chatSessionId();
    expect(minted).not.toBe('__proto__');
    expect(isValidSessionId(minted)).toBe(true);
  });

  it('never mints an id the server would drop, over many draws', () => {
    for (let i = 0; i < 500; i += 1) {
      resetChatSession();
      window.localStorage.clear();
      expect(isValidSessionId(chatSessionId())).toBe(true);
    }
  });

  it('never mints one the server would drop via the non-crypto fallback either', () => {
    for (let i = 0; i < 200; i += 1) {
      resetChatSession();
      window.localStorage.clear();
      vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => { throw new Error('nope'); });
      expect(isValidSessionId(chatSessionId())).toBe(true);
      vi.restoreAllMocks();
    }
  });
});
