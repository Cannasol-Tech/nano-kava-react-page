/**
 * @file: src/test/sectionPrompts.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The nudge policy is the difference between a helpful prompt and a popup, so every rule
 *     that holds Sol back is asserted here: the session cap, the cooldown, the hard stop on
 *     dismissal, and silence while the panel is open or the visitor has already converted.
 *
 * @See Also:
 *     src/components/chat/engagement/sectionPrompts.js
 *     src/components/chat/engagement/SolNudge.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import {
  SECTION_PROMPTS,
  nextPrompt,
  promptForSection,
  MAX_NUDGES_PER_SESSION,
  COOLDOWN_MS,
} from '../components/chat/engagement/sectionPrompts';

describe('the prompt ladder', () => {
  it('covers every section of the landing page', () => {
    expect(SECTION_PROMPTS.map((p) => p.section)).toEqual(['benefits', 'process', 'proof', 'dosing', 'contact']);
  });

  it('escalates from educating to closing as the visitor reads further', () => {
    expect(SECTION_PROMPTS.map((p) => p.intent)).toEqual(['educate', 'sample', 'proof', 'cost', 'close']);
  });

  it('sends a question the visitor could plausibly have typed', () => {
    SECTION_PROMPTS.forEach((prompt) => {
      expect(prompt.question.length).toBeGreaterThan(25);
      expect(prompt.label.length).toBeLessThan(40);
    });
  });

  it('labels the chip as the visitor asking, not as Sol addressing them', () => {
    SECTION_PROMPTS.forEach((prompt) => {
      expect(prompt.label).not.toMatch(/\byou\b|\byour\b|\byou're\b/i);
    });
  });

  it('phrases every chip as a question, since tapping one asks it', () => {
    SECTION_PROMPTS.forEach((prompt) => {
      expect(prompt.label.trim().endsWith('?')).toBe(true);
    });
  });

  it('names the sample on the chip wherever the question asks for one', () => {
    SECTION_PROMPTS
      .filter((prompt) => prompt.intent === 'sample' || prompt.intent === 'close')
      .forEach((prompt) => expect(prompt.label).toMatch(/sample/i));
  });

  it('routes at least three of the five straight at a sample', () => {
    const sampleSeeking = SECTION_PROMPTS.filter((p) => /sample/i.test(p.question));
    expect(sampleSeeking.length).toBeGreaterThanOrEqual(3);
  });

  it('returns null for a section with no prompt', () => {
    expect(promptForSection('nope')).toBeNull();
  });
});

describe('nextPrompt restraint', () => {
  const base = { sectionId: 'process', shownIds: [], now: 100_000, lastShownAt: null };

  it('raises the matching prompt when nothing holds it back', () => {
    expect(nextPrompt(base)?.section).toBe('process');
  });

  it('still produces a prompt when the panel is open — presentation decides, not the policy', () => {
    // Changed 2026-08-25: open used to mean silent. It now means "render as a chip instead".
    expect(nextPrompt({ ...base, panelOpen: true })?.section).toBe('process');
  });

  it('stops for the session once a nudge is waved away', () => {
    expect(nextPrompt({ ...base, dismissed: true })).toBeNull();
  });

  it('stops selling to someone who already converted', () => {
    expect(nextPrompt({ ...base, converted: true })).toBeNull();
  });

  it('never repeats a section', () => {
    expect(nextPrompt({ ...base, shownIds: ['process'] })).toBeNull();
  });

  it('caps the session', () => {
    expect(nextPrompt({ ...base, shownIds: ['benefits', 'proof'] })).toBeNull();
    expect(MAX_NUDGES_PER_SESSION).toBe(2);
  });

  it('holds off during the cooldown, then allows the next one', () => {
    const justShown = { ...base, shownIds: ['benefits'], lastShownAt: 100_000 };
    expect(nextPrompt(justShown)).toBeNull();
    expect(nextPrompt({ ...justShown, now: 100_000 + COOLDOWN_MS + 1 })?.section).toBe('process');
  });
});
