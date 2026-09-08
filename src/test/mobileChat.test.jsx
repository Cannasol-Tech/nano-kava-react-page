/**
 * @file: src/test/mobileChat.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Sol behaves differently on a phone: he never opens himself over the page and introduces
 *     himself with a tappable bubble instead. The sample picker is not part of that gating —
 *     it may raise itself on a phone. Desktop behaviour is asserted alongside so nothing leaks.
 *
 * @See Also:
 *     src/components/chat/ChatWidget.jsx
 *     src/utils/viewport.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';

const SLOW = 20_000;
const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'];

async function setup({ mobile }) {
  vi.resetModules();
  window.sessionStorage.clear();
  window.__PRERENDER__ = false;
  window.matchMedia = vi.fn(() => ({ matches: false, addListener() {}, removeListener() {} }));
  vi.doMock('../utils/viewport', () => ({
    MOBILE_QUERY: '(max-width: 767px)',
    isMobileViewport: () => mobile,
    subscribeViewport: () => () => {},
  }));

  const [{ SEQUENCE }, ChatWidget, { ThemeProvider }] = await Promise.all([
    import('../utils/loadSequence'),
    import('../components/chat/ChatWidget').then((m) => m.default),
    import('../context/ThemeContext'),
  ]);
  render(
    <MemoryRouter initialEntries={['/']}>
      <ThemeProvider>
        <GoTo />
        <ChatWidget />
      </ThemeProvider>
    </MemoryRouter>
  );
  return SEQUENCE;
}

/** Lets a test navigate the way Sol's in-panel link does. */
function GoTo() {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate('/contact')}>go-to-contact</button>;
}

const launcher = () => screen.getByRole('button', { name: /chat with sol/i });
const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });

describe('Sol on a phone', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: FAKE }));
  afterEach(() => { vi.useRealTimers(); vi.doUnmock('../utils/viewport'); });

  it('never opens itself over the page', async () => {
    const SEQUENCE = await setup({ mobile: true });
    advance(SEQUENCE.greetAtMs + 500);
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
  }, SLOW);

  it('introduces itself with a tappable bubble instead', async () => {
    const SEQUENCE = await setup({ mobile: true });
    advance(SEQUENCE.greetAtMs + 500);

    const bubble = screen.getByRole('button', { name: /i'm sol/i });
    expect(bubble).toBeInTheDocument();
    expect(bubble.textContent.length).toBeLessThan(70);
  }, SLOW);

  it('opens only when the bubble is tapped', async () => {
    const SEQUENCE = await setup({ mobile: true });
    advance(SEQUENCE.greetAtMs + 500);

    act(() => { fireEvent.click(screen.getByRole('button', { name: /i'm sol/i })); });
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');
  }, SLOW);

  it('stays quiet once the bubble is waved away', async () => {
    const SEQUENCE = await setup({ mobile: true });
    advance(SEQUENCE.greetAtMs + 500);

    act(() => { fireEvent.click(screen.getByRole('button', { name: /dismiss sol/i })); });
    advance(60_000);
    expect(screen.queryByRole('button', { name: /i'm sol/i })).toBeNull();
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
  }, SLOW);
});

describe('leaving the page while Sol is open', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: FAKE }));
  afterEach(() => { vi.useRealTimers(); vi.doUnmock('../utils/viewport'); });

  it('closes on a phone, because the panel covers the page it just navigated to', async () => {
    await setup({ mobile: true });
    act(() => { fireEvent.click(launcher()); });
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');

    act(() => { fireEvent.click(screen.getByText('go-to-contact')); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(launcher()).toHaveAttribute('aria-expanded', 'false');
  }, SLOW);

  it('stays open on a desktop, where it occupies a corner', async () => {
    await setup({ mobile: false });
    act(() => { fireEvent.click(launcher()); });
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');

    act(() => { fireEvent.click(screen.getByText('go-to-contact')); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');
  }, SLOW);
});

describe('Sol on a desktop is unchanged', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: FAKE }));
  afterEach(() => { vi.useRealTimers(); vi.doUnmock('../utils/viewport'); });

  it('still opens itself with the greeting', async () => {
    const SEQUENCE = await setup({ mobile: false });
    advance(SEQUENCE.greetAtMs + 500);
    expect(launcher()).toHaveAttribute('aria-expanded', 'true');
  }, SLOW);

  it('shows no greeting bubble, because the panel is already open', async () => {
    const SEQUENCE = await setup({ mobile: false });
    advance(SEQUENCE.greetAtMs + 500);
    expect(screen.queryByRole('button', { name: /i'm sol/i })).toBeNull();
  }, SLOW);
});

describe('the sample picker on a phone', () => {
  afterEach(() => vi.doUnmock('../utils/viewport'));

  /** Fresh modules per test, because the policy reads sessionStorage at call time. */
  async function loadOnPhone({ converted = false } = {}) {
    vi.resetModules();
    window.sessionStorage.clear();
    if (converted) window.sessionStorage.setItem('sol:converted', '1');
    vi.doMock('../utils/viewport', () => ({
      MOBILE_QUERY: '(max-width: 767px)',
      isMobileViewport: () => true,
      subscribeViewport: () => () => {},
    }));
    return import('../utils/quiz');
  }

  it('raises itself on a phone, so Sol never describes a picker that is not there', async () => {
    const { openQuiz } = await loadOnPhone();
    expect(openQuiz()).toBe(true);
  });

  it('interrupts a phone visitor once a session and no more', async () => {
    const { openQuiz } = await loadOnPhone();
    expect(openQuiz()).toBe(true);
    expect(openQuiz()).toBe(false);
  });

  it('never interrupts a phone visitor who already converted', async () => {
    const { openQuiz } = await loadOnPhone({ converted: true });
    expect(openQuiz()).toBe(false);
  });

  it('still honours a phone visitor who taps the chip', async () => {
    const { openQuiz } = await loadOnPhone();
    expect(openQuiz({ force: true })).toBe(true);
  });
});
