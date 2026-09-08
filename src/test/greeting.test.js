/**
 * @file: src/test/greeting.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Guards Sol's opening line: the rotation is varied and evenly reachable, every variant
 *     introduces him by name and ends on a question, and none of them drifts into the health
 *     or dosing claims functions/lib/persona.js exists to prevent.
 *
 * @See Also:
 *     src/components/chat/transport/useChatStream.js
 *     functions/lib/persona.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import { GREETINGS, pickGreeting } from '../components/chat/transport/useChatStream';

describe('Sol greeting rotation', () => {
  it('offers several distinct, non-empty openers', () => {
    expect(GREETINGS.length).toBeGreaterThanOrEqual(3);
    expect(new Set(GREETINGS).size).toBe(GREETINGS.length);
    GREETINGS.forEach((g) => expect(g.trim().length).toBeGreaterThan(20));
  });

  it('reaches every variant and never falls off the end', () => {
    const seen = GREETINGS.map((_, i) => pickGreeting(() => i / GREETINGS.length));
    expect(seen).toEqual(GREETINGS);
    // Math.random() is [0,1) but a stubbed 1 must not read past the array.
    expect(GREETINGS).toContain(pickGreeting(() => 1));
    expect(GREETINGS).toContain(pickGreeting(() => 0.999999));
  });

  it('keeps the "short for solution" pun in every variant', () => {
    // Rejected 2026-08-25: a variant that opened "I'm Sol, Cannasol's nano kava specialist"
    // dropped the pun and read like a corporate directory entry.
    GREETINGS.forEach((g) => expect(g).toMatch(/short for solution/i));
  });

  it('introduces Sol by name and invites a reply', () => {
    GREETINGS.forEach((g) => {
      expect(g).toMatch(/\bSol\b/);
      expect(g.trim().endsWith('?')).toBe(true);
    });
  });

  it('stays clear of health and dosing claims', () => {
    const banned = /\b(dose|dosage|dosing|mg\b|treat|cure|heal|anxiety|medical|therapeutic|relax)/i;
    GREETINGS.forEach((g) => expect(g).not.toMatch(banned));
  });
});
