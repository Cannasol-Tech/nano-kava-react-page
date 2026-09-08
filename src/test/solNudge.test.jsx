/**
 * @file: src/test/solNudge.test.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The section nudge end to end inside ChatWidget: it waits for real dwell, it opens the
 *     panel with the question already asked, and a single wave-off silences it for the session.
 *
 * @See Also:
 *     src/components/chat/ChatWidget.jsx
 *     src/components/chat/engagement/sectionPrompts.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { promptForSection } from '../components/chat/engagement/sectionPrompts';

/** Read the chip text from the ladder itself, so rewording a label cannot fail these tests. */
const labelFor = (section) => promptForSection(section).label;

const SLOW = 20_000;
const FAKE = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date', 'performance'];

/** Captures observer callbacks so a test can say "they settled on #process". */
function installObserver() {
  const instances = [];
  class ControllableObserver {
    constructor(cb) { this.cb = cb; this.targets = []; instances.push(this); }
    observe(el) { this.targets.push(el); }
    unobserve() {}
    disconnect() { this.targets = []; }
    takeRecords() { return []; }
  }
  vi.stubGlobal('IntersectionObserver', ControllableObserver);
  return {
    settleOn(id) {
      const target = document.getElementById(id);
      instances.forEach((inst) => {
        if (inst.targets.includes(target)) inst.cb([{ target, isIntersecting: true }]);
      });
    },
  };
}

function paintSections() {
  ['benefits', 'process', 'proof', 'contact'].forEach((id) => {
    const el = document.createElement('section');
    el.id = id;
    document.body.appendChild(el);
  });
}

async function setup() {
  vi.resetModules();
  window.sessionStorage.clear();
  window.__PRERENDER__ = false;
  window.matchMedia = vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} }));
  paintSections();
  const observer = installObserver();
  const [ChatWidget, { ThemeProvider }, { DWELL_MS }] = await Promise.all([
    import('../components/chat/ChatWidget').then((m) => m.default),
    import('../context/ThemeContext'),
    import('../components/chat/engagement/sectionPrompts'),
  ]);
  render(
    <MemoryRouter><ThemeProvider><ChatWidget /></ThemeProvider></MemoryRouter>
  );
  return { observer, DWELL_MS };
}

const dwell = (observer, id, DWELL_MS) => {
  act(() => { observer.settleOn(id); });
  act(() => { vi.advanceTimersByTime(DWELL_MS + 50); });
};

describe('Sol section nudges', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: FAKE }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('says nothing until the visitor actually settles on a section', async () => {
    const { observer, DWELL_MS } = await setup();
    expect(screen.queryByText(labelFor('process'))).toBeNull();

    act(() => { observer.settleOn('process'); });
    act(() => { vi.advanceTimersByTime(DWELL_MS - 200); });
    expect(screen.queryByText(labelFor('process'))).toBeNull();

    act(() => { vi.advanceTimersByTime(400); });
    expect(screen.getByText(labelFor('process'))).toBeInTheDocument();
  }, SLOW);

  it('matches the prompt to the section they are reading', async () => {
    const { observer, DWELL_MS } = await setup();
    dwell(observer, 'benefits', DWELL_MS);
    expect(screen.getByText(labelFor('benefits'))).toBeInTheDocument();
  }, SLOW);

  it('opens the panel when accepted', async () => {
    const { observer, DWELL_MS } = await setup();
    dwell(observer, 'process', DWELL_MS);

    act(() => { fireEvent.click(screen.getByText(labelFor('process'))); });
    expect(screen.getByRole('button', { name: /chat with sol/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByText(labelFor('process'))).toBeNull();
  }, SLOW);

  it('goes quiet for the whole session after one wave-off', async () => {
    const { observer, DWELL_MS } = await setup();
    dwell(observer, 'process', DWELL_MS);

    act(() => { fireEvent.click(screen.getByRole('button', { name: /dismiss sol/i })); });
    expect(screen.queryByText(labelFor('process'))).toBeNull();

    dwell(observer, 'proof', DWELL_MS);
    expect(screen.queryByText(labelFor('proof'))).toBeNull();
    expect(window.sessionStorage.getItem('sol:nudge-dismissed')).toBe('1');
  }, SLOW);

  it('stops selling to a visitor who already converted', async () => {
    window.sessionStorage.setItem('sol:converted', '1');
    const { observer, DWELL_MS } = await setup();
    window.sessionStorage.setItem('sol:converted', '1');

    dwell(observer, 'process', DWELL_MS);
    expect(screen.queryByText(labelFor('process'))).toBeNull();
  }, SLOW);

  it('caps the session at two nudges', async () => {
    const { observer, DWELL_MS } = await setup();
    dwell(observer, 'benefits', DWELL_MS);
    act(() => { vi.advanceTimersByTime(30_000); });
    dwell(observer, 'process', DWELL_MS);
    act(() => { vi.advanceTimersByTime(30_000); });
    dwell(observer, 'proof', DWELL_MS);

    expect(screen.queryByText(labelFor('proof'))).toBeNull();
  }, SLOW);
});
