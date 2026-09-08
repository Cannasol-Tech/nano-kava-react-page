/**
 * @file: src/test/sampleQuizFlow.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The quiz end to end: three taps, a progress indicator, and a completion signal carrying
 *     a lead that is already valid — the point being that nobody types before Josh has a brief.
 *
 * @See Also:
 *     src/components/SampleQuiz.jsx
 *     src/utils/quiz.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SELECT_FEEDBACK_MS } from '../components/chat/engagement/sampleQuiz';

const SLOW = 20_000;

async function setup() {
  vi.resetModules();
  window.sessionStorage.clear();
  const [SampleQuiz, quiz, { ThemeProvider }] = await Promise.all([
    import('../components/SampleQuiz').then((m) => m.default),
    import('../utils/quiz'),
    import('../context/ThemeContext'),
  ]);
  render(<ThemeProvider><SampleQuiz /></ThemeProvider>);
  return quiz;
}

/** Tap, then let the selection feedback settle — choosing is no longer instantaneous. */
const tap = (name) => {
  act(() => { fireEvent.click(screen.getByRole('button', { name })); });
  act(() => { vi.advanceTimersByTime(SELECT_FEEDBACK_MS + 20); });
};

describe('when the picker may raise itself', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('opens once when the model asks', async () => {
    const { openQuiz } = await setup();
    let opened;
    act(() => { opened = openQuiz(); });
    expect(opened).toBe(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  }, SLOW);

  it('refuses a second uninvited open in the same session', async () => {
    const { openQuiz } = await setup();
    let first;
    let second;
    act(() => { first = openQuiz(); });
    act(() => { second = openQuiz(); });
    expect(first).toBe(true);
    expect(second).toBe(false);
  }, SLOW);

  it('refuses to interrupt a visitor who already converted', async () => {
    window.sessionStorage.setItem('sol:converted', '1');
    vi.resetModules();
    const [SampleQuiz, quiz, { ThemeProvider }] = await Promise.all([
      import('../components/SampleQuiz').then((m) => m.default),
      import('../utils/quiz'),
      import('../context/ThemeContext'),
    ]);
    render(<ThemeProvider><SampleQuiz /></ThemeProvider>);

    let opened;
    act(() => { opened = quiz.openQuiz(); });
    expect(opened).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  }, SLOW);

  /**
   * Regression, 2026-08-26: the forced path wrote the same session flag, so a visitor who tapped
   * the chip permanently disabled every later model-initiated open — which still reported true.
   */
  it('does not let a chip tap spend the model\'s one uninvited open', async () => {
    const { openQuiz } = await setup();
    act(() => { openQuiz({ force: true }); });
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    act(() => { vi.advanceTimersByTime(400); });

    let opened;
    act(() => { opened = openQuiz(); });
    expect(opened).toBe(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  }, SLOW);

  it('opens even when the signal lands before the picker has mounted', async () => {
    vi.resetModules();
    window.sessionStorage.clear();
    const [SampleQuiz, quiz, { ThemeProvider }] = await Promise.all([
      import('../components/SampleQuiz').then((m) => m.default),
      import('../utils/quiz'),
      import('../context/ThemeContext'),
    ]);

    let opened;
    act(() => { opened = quiz.openQuiz(); });
    expect(opened).toBe(true);

    render(<ThemeProvider><SampleQuiz /></ThemeProvider>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  }, SLOW);

  it('refuses to raise itself underneath another modal', async () => {
    vi.resetModules();
    window.sessionStorage.clear();
    const [SampleQuiz, quiz, explainer, { ThemeProvider }] = await Promise.all([
      import('../components/SampleQuiz').then((m) => m.default),
      import('../utils/quiz'),
      import('../utils/explainer'),
      import('../context/ThemeContext'),
    ]);
    render(<ThemeProvider><SampleQuiz /></ThemeProvider>);

    expect(explainer.openExplainer()).toBe(true);
    let opened;
    act(() => { opened = quiz.openQuiz(); });
    expect(opened).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  }, SLOW);

  it('holds the modal slot while it is up, so Escape reaches only the picker', async () => {
    vi.resetModules();
    window.sessionStorage.clear();
    const [SampleQuiz, quiz, { isModalOpen }, { ThemeProvider }] = await Promise.all([
      import('../components/SampleQuiz').then((m) => m.default),
      import('../utils/quiz'),
      import('../utils/signal'),
      import('../context/ThemeContext'),
    ]);
    render(<ThemeProvider><SampleQuiz /></ThemeProvider>);

    act(() => { quiz.openQuiz(); });
    expect(isModalOpen()).toBe(true);

    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(isModalOpen()).toBe(false);
  }, SLOW);

  it('always honours a visitor who tapped the chip themselves', async () => {
    const { openQuiz } = await setup();
    act(() => { openQuiz(); });
    // Asking for something is not the same as being interrupted by it.
    let opened;
    act(() => { opened = openQuiz({ force: true }); });
    expect(opened).toBe(true);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  }, SLOW);
});

describe('tap feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it('marks the tapped option selected before moving on', async () => {
    const { openQuiz } = await setup();
    act(() => { openQuiz(); });

    const option = screen.getByRole('button', { name: /seltzer/i });
    act(() => { fireEvent.click(option); });

    // The confirmation has to be visible on the option the finger actually touched.
    expect(option).toHaveAttribute('aria-pressed', 'true');
    expect(option.className).toMatch(/sample-quiz__option--chosen/);
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  }, SLOW);

  it('advances only after the choice has been seen', async () => {
    const { openQuiz } = await setup();
    act(() => { openQuiz(); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: /seltzer/i })); });

    act(() => { vi.advanceTimersByTime(SELECT_FEEDBACK_MS + 20); });
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
  }, SLOW);

  it('starts the next question with nothing selected', async () => {
    const { openQuiz } = await setup();
    act(() => { openQuiz(); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: /seltzer/i })); });
    act(() => { vi.advanceTimersByTime(SELECT_FEEDBACK_MS + 20); });

    // Regression: the tapped position used to carry a stuck :hover into the next step,
    // which read as the next answer being pre-selected.
    screen.getAllByRole('button', { name: /pilot|units|not sure/i })
      .forEach((b) => expect(b).toHaveAttribute('aria-pressed', 'false'));
  }, SLOW);

  it('ignores a second tap while the choice is settling', async () => {
    const { openQuiz } = await setup();
    act(() => { openQuiz(); });

    act(() => { fireEvent.click(screen.getByRole('button', { name: /seltzer/i })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: /^shot$/i })); });
    act(() => { vi.advanceTimersByTime(SELECT_FEEDBACK_MS + 20); });

    // A double-tap must not skip a question.
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
  }, SLOW);
});

describe('the three-tap quiz', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }));
  afterEach(() => vi.useRealTimers());

  it('stays closed until asked for', async () => {
    await setup();
    expect(screen.queryByRole('dialog')).toBeNull();
  }, SLOW);

  it('walks three questions and reports progress', async () => {
    const { openQuiz } = await setup();
    act(() => { openQuiz(); });

    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');

    tap(/seltzer/i);
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();

    tap(/10k\+ units/i);
    expect(screen.getByText(/step 3 of 3/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  }, SLOW);

  it('hands over the answers as a sentence, and closes itself', async () => {
    const { openQuiz, subscribeQuizComplete } = await setup();
    const results = [];
    subscribeQuizComplete((r) => results.push(r));

    act(() => { openQuiz(); });
    tap(/seltzer/i);
    tap(/10k\+ units/i);
    tap(/this quarter/i);

    expect(results).toHaveLength(1);
    // A sentence for Sol to answer, not a pre-filled card that would hide the conversation.
    expect(results[0].message).toBe("I'm building a seltzer or RTD, 10k+ units, this quarter.");

    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.queryByRole('dialog')).toBeNull();
  }, SLOW);

  it('can be abandoned without emitting a lead', async () => {
    const { openQuiz, subscribeQuizComplete } = await setup();
    const results = [];
    subscribeQuizComplete((r) => results.push(r));

    act(() => { openQuiz(); });
    tap(/seltzer/i);
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    act(() => { vi.advanceTimersByTime(400); });

    expect(results).toHaveLength(0);
    expect(screen.queryByRole('dialog')).toBeNull();
  }, SLOW);

  it('tells Sol when it was closed unfinished, and stays quiet when it was completed', async () => {
    const { openQuiz, subscribeQuizNotice } = await setup();
    const notices = [];
    subscribeQuizNotice((note) => notices.push(note));

    act(() => { openQuiz(); });
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(notices).toHaveLength(1);
    expect(notices[0].toModel).toMatch(/do not raise it or refer to it again/i);

    act(() => { openQuiz({ force: true }); });
    tap(/seltzer/i);
    tap(/10k\+ units/i);
    tap(/this quarter/i);
    act(() => { vi.advanceTimersByTime(400); });
    // Finishing is not a dismissal; Sol has the answers and needs no correction.
    expect(notices).toHaveLength(1);
  }, SLOW);

  it('starts clean when reopened', async () => {
    const { openQuiz } = await setup();
    act(() => { openQuiz(); });
    tap(/seltzer/i);
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    act(() => { vi.advanceTimersByTime(400); });

    act(() => { openQuiz({ force: true }); });
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  }, SLOW);
});
