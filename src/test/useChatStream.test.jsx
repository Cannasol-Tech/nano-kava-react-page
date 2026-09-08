/**
 * @file: src/test/useChatStream.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Transport-level tests for the SSE frames the chat function emits, in particular that a
 *     nano_explainer frame reaches the explainer callback — the join between Sol deciding to
 *     demonstrate scale and the modal actually rising.
 *
 * @See Also:
 *     src/components/chat/transport/useChatStream.js
 *     functions/lib/chat.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatStream } from '../components/chat/transport/useChatStream';
import { chatSessionId, resetChatSession } from '../components/chat/transport/chatSession';

/** Minimal stand-in for the streaming Response the chat function returns. */
function mockSse(events) {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
  const chunks = [new TextEncoder().encode(body)];
  let i = 0;
  return {
    ok: true,
    status: 200,
    body: {
      getReader: () => ({
        read: async () => (i < chunks.length ? { value: chunks[i++], done: false } : { done: true }),
      }),
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('useChatStream frames', () => {
  it('raises the explainer when the model calls the tool', async () => {
    const onExplain = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([
      { type: 'nano_explainer' },
      { type: 'text', delta: 'Eighteen nanometres is very small.' },
      { type: 'done' },
    ])));

    const { result } = renderHook(() => useChatStream({ onExplain }));
    await act(async () => { result.current.send('how small is nano?'); });

    await waitFor(() => expect(onExplain).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(result.current.messages.some((m) => m.text.includes('Eighteen nanometres'))).toBe(true));
  });

  it('does not raise it for an ordinary turn', async () => {
    const onExplain = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([
      { type: 'text', delta: 'MOQs are negotiated per customer.' },
      { type: 'done' },
    ])));

    const { result } = renderHook(() => useChatStream({ onExplain }));
    await act(async () => { result.current.send('what is your MOQ?'); });

    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    expect(onExplain).not.toHaveBeenCalled();
  });

  it('opens the three-tap picker when the model calls that tool', async () => {
    const onQuiz = vi.fn();
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([
      { type: 'sample_quiz' },
      { type: 'text', delta: 'Tap through those three and I will fill the rest in.' },
      { type: 'done' },
    ])));

    const { result } = renderHook(() => useChatStream({ onQuiz }));
    await act(async () => { result.current.send("I'm building a kava seltzer"); });

    await waitFor(() => expect(onQuiz).toHaveBeenCalledTimes(1));
  });

  it('tells the visitor and the model when the picker refused to open', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([
      { type: 'sample_quiz' },
      { type: 'text', delta: 'Tap through those three and I will fill the rest in.' },
      { type: 'done' },
    ])));

    const { result } = renderHook(() => useChatStream({ onQuiz: () => false }));
    await act(async () => { result.current.send("I'm building a kava seltzer"); });

    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    const note = result.current.messages.find((m) => m.role === 'system');
    expect(note.text).toMatch(/picker didn't open/i);
    expect(note.toModel).toMatch(/do not mention it/i);
  });

  it('stays silent when the picker did open', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([{ type: 'sample_quiz' }, { type: 'done' }])));

    const { result } = renderHook(() => useChatStream({ onQuiz: () => true }));
    await act(async () => { result.current.send("I'm building a kava seltzer"); });

    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    expect(result.current.messages.some((m) => m.role === 'system')).toBe(false);
  });

  it('still surfaces a lead card alongside an explainer frame', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([
      { type: 'nano_explainer' },
      { type: 'lead_proposed', fields: { interest: 'nano kava', conversation_summary: 'seltzer' } },
      { type: 'done' },
    ])));

    const { result } = renderHook(() => useChatStream({ onExplain: () => {} }));
    await act(async () => { result.current.send('tell me about nano and send me samples'); });

    await waitFor(() =>
      expect(result.current.messages.some((m) => m.role === 'lead')).toBe(true));
  });
});

describe('useChatStream session id', () => {
  const bodyOf = (fetchMock) => JSON.parse(fetchMock.mock.calls[0][1].body);

  it('files every turn against one session so the server can append rather than fork', async () => {
    const fetchMock = vi.fn(async () => mockSse([{ type: 'text', delta: 'sure' }, { type: 'done' }]));
    vi.stubGlobal('fetch', fetchMock);
    resetChatSession();

    const { result } = renderHook(() => useChatStream());
    await act(async () => { result.current.send('first'); });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    await act(async () => { result.current.send('second'); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const first = JSON.parse(fetchMock.mock.calls[0][1].body).sessionId;
    const second = JSON.parse(fetchMock.mock.calls[1][1].body).sessionId;
    expect(first).toBe(chatSessionId());
    expect(second).toBe(first);
  });

  it('tells the server which page the conversation started on', async () => {
    const fetchMock = vi.fn(async () => mockSse([{ type: 'text', delta: 'sure' }, { type: 'done' }]));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useChatStream());
    await act(async () => { result.current.send('hello'); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(bodyOf(fetchMock).page).toBe(window.location.pathname);
  });

  /**
   * Regression, 2026-08-26: a quiz finished in ~660ms, before Sol's sentence had finished
   * streaming, and the answers were dropped by the `streamingRef` guard with no way to retry.
   */
  it('queues a turn sent mid-stream instead of dropping it', async () => {
    const fetchMock = vi.fn(async () => mockSse([{ type: 'text', delta: 'one moment' }, { type: 'done' }]));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useChatStream());
    let accepted;
    await act(async () => {
      result.current.send('hello');
      accepted = result.current.send("I'm building a seltzer, 10k+ units, this quarter.");
    });

    expect(accepted).toBe(true);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const second = JSON.parse(fetchMock.mock.calls[1][1].body).messages;
    expect(second.at(-1).text).toMatch(/10k\+ units/);
  });

  it('carries a picker refusal to the model as a turn it can actually read', async () => {
    const fetchMock = vi.fn(async () => mockSse([{ type: 'text', delta: 'sure' }, { type: 'done' }]));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useChatStream());
    await act(async () => { result.current.send('hello'); });
    await waitFor(() => expect(result.current.isStreaming).toBe(false));

    act(() => { result.current.appendNote({ text: 'Sample picker closed.', toModel: '[System note: closed.]' }); });
    await act(async () => { result.current.send('what next?'); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const sent = JSON.parse(fetchMock.mock.calls[1][1].body).messages;
    // The server accepts no role but user/model, so a note has to ride as a user turn.
    expect(sent).toContainEqual({ role: 'user', text: '[System note: closed.]' });
    expect(sent.every((m) => m.role === 'user' || m.role === 'model')).toBe(true);
  });

  it('still sends the capped history the wire contract already promised', async () => {
    const fetchMock = vi.fn(async () => mockSse([{ type: 'text', delta: 'sure' }, { type: 'done' }]));
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(() => useChatStream());
    await act(async () => { result.current.send('hello'); });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(bodyOf(fetchMock).messages).toEqual([{ role: 'user', text: 'hello' }]);
  });
});
