/**
 * @file: src/test/quizToolPath.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     End-to-end cover for the path Stephen saw misbehave: Sol calls open_sample_quiz, the frame
 *     crosses the transport, and the picker either raises itself or is refused by the policy.
 *     Exercises one module graph, the way a production bundle resolves it.
 *
 * @See Also:
 *     src/utils/quiz.js
 *     src/components/chat/engagement/sampleQuiz.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

const SLOW = 20_000;

/** One frame, then end — the shape functions/lib/chat.js emits for the quiz tool. */
function mockSse(events) {
  const chunk = new TextEncoder().encode(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(''));
  let sent = false;
  return {
    ok: true,
    status: 200,
    body: { getReader: () => ({ read: async () => (sent ? { done: true } : (sent = true, { value: chunk, done: false })) }) },
  };
}

async function mountBoth() {
  vi.resetModules();
  const [ChatPanel, SampleQuiz, { ThemeProvider }] = await Promise.all([
    import('../components/chat/panel/ChatPanel').then((m) => m.default),
    import('../components/SampleQuiz').then((m) => m.default),
    import('../context/ThemeContext'),
  ]);
  return render(
    <HelmetProvider context={{}}>
      <MemoryRouter>
        <ThemeProvider>
          <ChatPanel onClose={() => {}} />
          <SampleQuiz />
        </ThemeProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

const askSol = async () => {
  const field = screen.getByPlaceholderText(/ask about dosing/i);
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.change(field, { target: { value: "I'm building a kava seltzer" } });
  fireEvent.keyDown(field, { key: 'Enter' });
};

describe('the open_sample_quiz tool path', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => mockSse([{ type: 'sample_quiz' }, { type: 'done' }])));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('raises the picker when Sol calls it', async () => {
    await mountBoth();
    await askSol();

    // ChatPanel is itself role="dialog", so the picker is identified by its own first question.
    await waitFor(() => expect(screen.getByText(/what are you building/i)).toBeInTheDocument());
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  }, SLOW);

  it('is refused once it has already interrupted this session', async () => {
    window.sessionStorage.setItem('sol:quiz-uninvited', '1');
    await mountBoth();
    await askSol();

    // Give the frame time to arrive and be rejected.
    await waitFor(() => expect(screen.getByText(/kava seltzer/i)).toBeInTheDocument());
    expect(screen.queryByText(/what are you building/i)).toBeNull();
  }, SLOW);

  /**
   * The bug Stephen reported: the tool reported success, nothing rendered, and Sol went on
   * describing a picker. A refusal now has to be visible in the transcript.
   */
  it('says the picker did not open rather than leaving Sol describing one', async () => {
    window.sessionStorage.setItem('sol:quiz-uninvited', '1');
    await mountBoth();
    await askSol();

    await waitFor(() => expect(screen.getByText(/sample picker didn't open/i)).toBeInTheDocument());
  }, SLOW);

  it('is refused for a visitor who already converted', async () => {
    window.sessionStorage.setItem('sol:converted', '1');
    await mountBoth();
    await askSol();

    await waitFor(() => expect(screen.getByText(/kava seltzer/i)).toBeInTheDocument());
    expect(screen.queryByText(/what are you building/i)).toBeNull();
  }, SLOW);
});
