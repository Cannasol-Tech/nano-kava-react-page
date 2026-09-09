/**
 * @file: functions/test/chatRequest.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The chat request gained a `sessionId` so turns can be filed against one transcript. It is
 *     deliberately optional: persistence is telemetry and must never be able to refuse a visitor
 *     an answer. These tests pin that asymmetry.
 *
 * @See Also:
 *     functions/lib/chat.js
 *     functions/lib/chatStore.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { validateChatRequest } from '../lib/chat.js';

const body = (extra = {}) => ({ messages: [{ role: 'user', text: 'hi' }], ...extra });

describe('validateChatRequest sessionId', () => {
  it('passes a well-formed session id through for the store to file against', () => {
    const result = validateChatRequest(body({ sessionId: '7f3a9c21-4b1e-4a77-9d0c-2b8e5f6a1d34' }));
    expect(result.ok).toBe(true);
    expect(result.sessionId).toBe('7f3a9c21-4b1e-4a77-9d0c-2b8e5f6a1d34');
  });

  it('still answers a client that sends none — an old cached bundle must keep working', () => {
    const result = validateChatRequest(body());
    expect(result.ok).toBe(true);
    expect(result.sessionId).toBeNull();
  });

  it('drops a malformed session id instead of rejecting the conversation', () => {
    for (const bad of ['../../admin', 'short', 'x'.repeat(200), 42, { }]) {
      const result = validateChatRequest(body({ sessionId: bad }));
      expect(result.ok).toBe(true);
      expect(result.sessionId).toBeNull();
    }
  });

  it('passes the originating page through, clipped', () => {
    expect(validateChatRequest(body({ page: '/mushrooms' })).page).toBe('/mushrooms');
    expect(validateChatRequest(body({ page: 'x'.repeat(500) })).page).toHaveLength(200);
    expect(validateChatRequest(body()).page).toBe('');
  });

  it('leaves the existing message guards exactly as they were', () => {
    expect(validateChatRequest({ messages: [] }).ok).toBe(false);
    expect(validateChatRequest({ messages: [{ role: 'wrong', text: 'x' }] }).ok).toBe(false);
    expect(validateChatRequest({ messages: [{ role: 'user', text: 1 }] }).ok).toBe(false);
    expect(validateChatRequest({ messages: Array.from({ length: 40 }, () => ({ role: 'user', text: 'x' })) }).ok).toBe(false);
  });
});

/**
 * The 2026-09-08 report: a visitor answered the picker, and Sol called the tool again to raise
 * questions they had just answered. The client knows they answered; a tool that cannot work is
 * withheld rather than offered and refused. See functions/lib/CLAUDE.md § The picker is offered once.
 */
describe('withholding the picker once it has been answered', () => {
  it('carries the client flag through, defaulting to offering the tool', () => {
    expect(validateChatRequest(body({ quizAnswered: true })).quizAnswered).toBe(true);
    expect(validateChatRequest(body({ quizAnswered: 'yes' })).quizAnswered).toBe(false);
    expect(validateChatRequest(body()).quizAnswered).toBe(false);
  });

  it('drops open_sample_quiz from the tools the model is offered', async () => {
    const { toolsFor } = await import('../lib/chat.js');
    const names = (tools) => tools[0].functionDeclarations.map((d) => d.name);

    expect(names(toolsFor({ quizAnswered: false }))).toContain('open_sample_quiz');
    expect(names(toolsFor({ quizAnswered: true }))).not.toContain('open_sample_quiz');
    // Every other tool survives; the visitor still wants a sample card.
    expect(names(toolsFor({ quizAnswered: true }))).toContain('send_lead_to_josh');
  });
});
