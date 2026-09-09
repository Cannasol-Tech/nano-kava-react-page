/**
 * @file: src/test/quizRepeatCompletion.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The session a visitor reported on 2026-09-08: they answered the picker, Sol raised it
 *     again, they answered it identically, and nothing reached him. Covers the whole handoff —
 *     SampleQuiz to ChatWidget to ChatPanel — because the swallow lived between those three.
 *
 * @See Also:
 *     src/components/chat/ChatWidget.jsx
 *     src/utils/quiz.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const SLOW = 30_000;
const ANSWERS = ['Seltzer / RTD', '10k+ units', 'This quarter'];
const COMPOSED = "I'm building a seltzer or RTD, 10k+ units, this quarter.";

// Measured against production on 2026-09-08: 1.6-2.4s to the first frame. Anything above the
// 240ms close animation reproduces a real turn; the race below covers the other side.
const REPLY_MS = 400;

/** The frames functions/lib/chat.js emits when Sol calls open_sample_quiz. */
function quizFrames() {
  const chunk = new TextEncoder().encode(
    [{ type: 'text', delta: 'Three quick questions just came up over the chat.' }, { type: 'sample_quiz' }, { type: 'done' }]
      .map((event) => `data: ${JSON.stringify(event)}\n\n`)
      .join('')
  );
  let sent = false;
  return {
    ok: true,
    status: 200,
    body: { getReader: () => ({ read: async () => (sent ? { done: true } : (sent = true, { value: chunk, done: false })) }) },
  };
}

/** Every message the panel has POSTed, newest turn last. */
const turnsSent = (fetchMock) =>
  fetchMock.mock.calls.map(([, options]) => {
    const { messages } = JSON.parse(options.body);
    return messages[messages.length - 1].text;
  });

async function setup() {
  vi.resetModules();
  window.sessionStorage.clear();
  window.__PRERENDER__ = false;

  const [ChatWidget, SampleQuiz, { ThemeProvider }, quiz] = await Promise.all([
    import('../components/chat/ChatWidget').then((m) => m.default),
    import('../components/SampleQuiz').then((m) => m.default),
    import('../context/ThemeContext'),
    import('../utils/quiz'),
  ]);

  render(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <ChatWidget />
        <SampleQuiz />
      </ThemeProvider>
    </MemoryRouter>
  );

  const launcher = screen.getByRole('button', { name: /chat with sol/i });
  if (launcher.getAttribute('aria-expanded') !== 'true') fireEvent.click(launcher);
  await screen.findByPlaceholderText(/ask about dosing/i);
  return quiz;
}

/** What the "Answer 3 quick questions" chip does. The chip itself only renders on turn one. */
const tapChip = (quiz) => act(() => { quiz.openQuiz({ force: true }); });

/** Three taps, each waiting out the selection feedback the way a finger does. */
async function answerPicker() {
  for (const label of ANSWERS) {
    const option = await screen.findByRole('button', { name: label });
    fireEvent.click(option);
    await waitFor(() => expect(screen.queryByRole('button', { name: label })).toBeNull());
  }
}

describe('answering the picker a second time', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, REPLY_MS));
      return quizFrames();
    });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  /**
   * The reported failure. Identical answers compose an identical string, and the handoff
   * deduplicated on that string — so the second run reached Sol as nothing at all.
   */
  it('sends the answers to Sol even when they match the first run', async () => {
    const quiz = await setup();

    tapChip(quiz);
    await answerPicker();
    await waitFor(() => expect(turnsSent(fetchMock)).toContain(COMPOSED));

    tapChip(quiz);
    await answerPicker();

    await waitFor(
      () => expect(turnsSent(fetchMock).filter((text) => text === COMPOSED)).toHaveLength(2),
      { timeout: 4000 }
    );
  }, SLOW);

  /**
   * Once they have answered, Sol asking for the picker again must not leave an error in the
   * transcript — he is told they already answered, and the visitor is told nothing.
   */
  it('never shows the visitor a failure note for a picker they already answered', async () => {
    const quiz = await setup();

    tapChip(quiz);
    await answerPicker();

    // Sol's reply carries open_sample_quiz: refused, because they just answered it.
    await waitFor(() => expect(turnsSent(fetchMock)).toContain(COMPOSED));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /what are you building/i })).toBeNull());

    expect(screen.queryByText(/sample picker didn't open/i)).toBeNull();

    // Sol is told why, or he goes on describing a picker that is not there. Retried because
    // the composer refuses a turn while the previous one is still streaming.
    const field = screen.getByPlaceholderText(/ask about dosing/i);
    await waitFor(() => {
      fireEvent.change(field, { target: { value: 'ok, proceed' } });
      fireEvent.keyDown(field, { key: 'Enter' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    }, { timeout: 4000 });

    await waitFor(() => {
      const history = JSON.parse(fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1].body).messages;
      expect(history.some((m) => /already answered the three questions/.test(m.text))).toBe(true);
    });
  }, SLOW);

  /**
   * A reply that beats the 240ms close animation used to be killed by the previous run's
   * pending timeout: the picker flashed up and vanished with nothing on screen.
   */
  it('stays open when it is raised again before the close animation has finished', async () => {
    const quiz = await setup();

    tapChip(quiz);
    await answerPicker();

    // Straight back in, inside the 240ms close: the previous run's timer must not shut it.
    tapChip(quiz);
    await screen.findByRole('button', { name: ANSWERS[0] });
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(screen.getByRole('button', { name: ANSWERS[0] })).toBeInTheDocument();
  }, SLOW);
});
