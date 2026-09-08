/**
 * @file: src/test/toolNarration.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     A successful tool call must never claim something was sent. Regression cover for the
 *     "Sent to Josh ✓" line that every tool used to print, including the quiz picker.
 *
 * @See Also:
 *     src/components/chat/transport/useChatStream.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatStream } from '../components/chat/transport/useChatStream';

function mockSse(events) {
  const chunk = new TextEncoder().encode(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''));
  let sent = false;
  return {
    ok: true,
    status: 200,
    body: { getReader: () => ({ read: async () => (sent ? { done: true } : (sent = true, { value: chunk, done: false })) }) },
  };
}

const systemText = (result) => result.current.messages
  .filter((m) => m.role === 'system').map((m) => m.text).join(' | ');

afterEach(() => vi.unstubAllGlobals());

describe('tool narration', () => {
  it.each([
    ['open_sample_quiz', 'shown'],
    ['show_nano_explainer', 'shown'],
    ['send_lead_to_josh', 'awaiting_user_confirmation'],
  ])('says nothing was sent after %s', async (name, status) => {
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([
      { type: 'tool', name, status },
      { type: 'done' },
    ])));

    const { result } = renderHook(() => useChatStream({}));
    await act(async () => { result.current.send('hello'); });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    expect(systemText(result)).not.toMatch(/sent to josh/i);
    expect(systemText(result)).toBe('');
  });

  it('still reports a genuine failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([
      { type: 'tool', name: 'send_lead_to_josh', status: 'failed' },
      { type: 'done' },
    ])));

    const { result } = renderHook(() => useChatStream({}));
    await act(async () => { result.current.send('samples please'); });

    await waitFor(() => expect(systemText(result)).toMatch(/didn't work/i));
  });
});
