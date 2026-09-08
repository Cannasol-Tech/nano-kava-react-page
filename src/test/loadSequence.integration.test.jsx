/**
 * @file: src/test/loadSequence.integration.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Behavioural tests for the two DOM consumers of the load sequence: the ultrasonic
 *     pulse mounts on its mark and removes itself afterwards, and Sol's launcher waits
 *     for its mark before arriving. Both must render settled when the sequence is off.
 *
 * @See Also:
 *     src/components/LoadPulse.jsx
 *     src/components/chat/ChatWidget.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'];

async function setup({ reduceMotion = false, dismissed = false, keepStorage = false } = {}) {
  vi.resetModules();
  window.__PRERENDER__ = false;
  window.matchMedia = vi.fn(() => ({ matches: reduceMotion, addListener() {}, removeListener() {} }));
  if (!keepStorage) window.sessionStorage.clear();
  if (dismissed) window.sessionStorage.setItem('sol:dismissed', '1');
  // Every import must come from the post-reset graph: a statically imported ThemeProvider
  // would hand ChatWidget a different ThemeContext instance and read as a missing provider.
  const [{ SEQUENCE }, LoadPulse, ChatWidget, { ThemeProvider }] = await Promise.all([
    import('../utils/loadSequence'),
    import('../components/LoadPulse').then((m) => m.default),
    import('../components/chat/ChatWidget').then((m) => m.default),
    import('../context/ThemeContext'),
  ]);
  return { SEQUENCE, LoadPulse, ChatWidget, ThemeProvider };
}

const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });

// React rendering under fake timers runs slow on a loaded machine; the 5s default flakes.
const SLOW = 20_000;

describe('LoadPulse', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: FAKE }));
  afterEach(() => vi.useRealTimers());

  it('stays out of the DOM until its mark, then removes itself', async () => {
    const { SEQUENCE, LoadPulse } = await setup();
    const { container } = render(<LoadPulse />);
    expect(container.querySelector('.nano-pulse')).toBeNull();

    advance(SEQUENCE.pulseAtMs + 10);
    expect(container.querySelector('.nano-pulse')).not.toBeNull();

    advance(SEQUENCE.pulseMs + 50);
    expect(container.querySelector('.nano-pulse')).toBeNull();
  }, SLOW);

  it('never mounts under reduced motion', async () => {
    const { SEQUENCE, LoadPulse } = await setup({ reduceMotion: true });
    const { container } = render(<LoadPulse />);
    advance(SEQUENCE.pulseAtMs + SEQUENCE.pulseMs + 100);
    expect(container.querySelector('.nano-pulse')).toBeNull();
  }, SLOW);
});

describe("Sol's arrival", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: FAKE }));
  afterEach(() => vi.useRealTimers());

  it('holds the launcher back, then plays it in exactly once', async () => {
    const { SEQUENCE, ChatWidget, ThemeProvider } = await setup();
    render(
    <MemoryRouter><ThemeProvider><ChatWidget /></ThemeProvider></MemoryRouter>
  );

    const launcher = screen.getByRole('button', { name: /chat with sol/i });
    expect(launcher.className).toContain('sol-launcher--pending');
    expect(launcher.querySelector('.sol-launcher-pulse')).toBeNull();

    advance(SEQUENCE.solAtMs + 10);
    expect(launcher.className).toContain('sol-launcher--arriving');
    expect(launcher.className).not.toContain('sol-launcher--pending');

    act(() => { launcher.dispatchEvent(new Event('animationend', { bubbles: true })); });
    expect(launcher.className).not.toContain('sol-launcher--arriving');
    expect(launcher.querySelector('.sol-launcher-pulse')).not.toBeNull();
  }, SLOW);

  it('opens itself with a greeting once Sol has settled', async () => {
    const { SEQUENCE, ChatWidget, ThemeProvider } = await setup();
    render(
    <MemoryRouter><ThemeProvider><ChatWidget /></ThemeProvider></MemoryRouter>
  );
    const launcher = screen.getByRole('button', { name: /chat with sol/i });

    advance(SEQUENCE.solAtMs + 100);
    expect(launcher).toHaveAttribute('aria-expanded', 'false');

    advance(SEQUENCE.greetAtMs - SEQUENCE.solAtMs);
    expect(launcher).toHaveAttribute('aria-expanded', 'true');
  }, SLOW);

  it('stays shut when the visitor already dismissed Sol this session', async () => {
    const { SEQUENCE, ChatWidget, ThemeProvider } = await setup({ dismissed: true });
    render(
    <MemoryRouter><ThemeProvider><ChatWidget /></ThemeProvider></MemoryRouter>
  );
    const launcher = screen.getByRole('button', { name: /chat with sol/i });

    advance(SEQUENCE.greetAtMs + 200);
    expect(launcher).toHaveAttribute('aria-expanded', 'false');
  }, SLOW);

  it('greets again on a reload — only an explicit dismissal silences it', async () => {
    // Regression: SHOWN_KEY from an earlier load in the same tab used to suppress the greeting.
    window.sessionStorage.clear();
    window.sessionStorage.setItem('sol:proactive-shown', '1');
    const { SEQUENCE, ChatWidget, ThemeProvider } = await setup({ keepStorage: true });
    render(
    <MemoryRouter><ThemeProvider><ChatWidget /></ThemeProvider></MemoryRouter>
  );
    const launcher = screen.getByRole('button', { name: /chat with sol/i });

    advance(SEQUENCE.greetAtMs + 200);
    expect(launcher).toHaveAttribute('aria-expanded', 'true');
  }, SLOW);

  it('renders settled immediately under reduced motion', async () => {
    const { ChatWidget, ThemeProvider } = await setup({ reduceMotion: true });
    render(
    <MemoryRouter><ThemeProvider><ChatWidget /></ThemeProvider></MemoryRouter>
  );

    const launcher = screen.getByRole('button', { name: /chat with sol/i });
    expect(launcher.className).not.toContain('sol-launcher--pending');
    expect(launcher.querySelector('.sol-launcher-pulse')).not.toBeNull();
  }, SLOW);
});
