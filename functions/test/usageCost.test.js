/**
 * @file: functions/test/usageCost.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Turning Gemini's usageMetadata into dollars. The rates are the whole point of the module,
 *     so they are asserted literally — a silent edit to one is a silently wrong cost report.
 *
 * @See Also:
 *     functions/lib/usageCost.js
 *     functions/lib/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import {
  RATES_PER_MILLION, EMPTY_USAGE, usageFrom, costOf, addUsage, formatUsd,
} from '../lib/usageCost.js';

/** A real turn, copied from a production log line on 2026-09-09. */
const REAL_TURN = {
  promptTokenCount: 11159,
  candidatesTokenCount: 102,
  totalTokenCount: 11261,
  cachedContentTokenCount: 8148,
};

describe('the published rates', () => {
  it('are the gemini-3.5-flash paid-tier prices per million tokens', () => {
    expect(RATES_PER_MILLION).toEqual({ input: 1.50, output: 9.00, cached: 0.15 });
  });
});

describe('costing one turn', () => {
  /** Cached tokens are a SUBSET of promptTokenCount — billing the full prompt double-counts. */
  it('bills the cached share at the cached rate and only the remainder at full price', () => {
    const cost = costOf(REAL_TURN);
    const expected = ((11159 - 8148) * 1.50 + 8148 * 0.15 + 102 * 9.00) / 1e6;

    expect(cost).toBeCloseTo(expected, 10);
    expect(cost).toBeCloseTo(0.0066567, 7);   // ~$0.0067 a turn, which is the number that matters
  });

  it('costs a cache miss at the full input rate', () => {
    const cost = costOf({ promptTokenCount: 10000, candidatesTokenCount: 100, cachedContentTokenCount: 0 });
    expect(cost).toBeCloseTo((10000 * 1.50 + 100 * 9.00) / 1e6, 10);
  });

  it('treats a missing or malformed usage block as free rather than throwing', () => {
    for (const bad of [null, undefined, {}, { promptTokenCount: 'x' }]) expect(costOf(bad)).toBe(0);
  });
});

describe('normalising usage for storage', () => {
  it('keeps the three counts that cost money, plus the dollars', () => {
    expect(usageFrom(REAL_TURN)).toEqual({
      promptTokens: 11159,
      cachedTokens: 8148,
      outputTokens: 102,
      costUsd: costOf(REAL_TURN),
      turns: 1,
    });
  });

  it('normalises an absent usage block to zeroes, so a stored total is never NaN', () => {
    expect(usageFrom(undefined)).toEqual({ ...EMPTY_USAGE, turns: 0 });
  });

  it('adds a turn onto a running total', () => {
    const total = addUsage(usageFrom(REAL_TURN), usageFrom(REAL_TURN));

    expect(total.promptTokens).toBe(22318);
    expect(total.cachedTokens).toBe(16296);
    expect(total.outputTokens).toBe(204);
    expect(total.turns).toBe(2);
    expect(total.costUsd).toBeCloseTo(costOf(REAL_TURN) * 2, 10);
  });

  it('adds onto a document that predates cost tracking', () => {
    const total = addUsage(undefined, usageFrom(REAL_TURN));
    expect(total).toEqual(usageFrom(REAL_TURN));
  });
});

describe('formatting money for a report anyone reads', () => {
  it('shows cents for a real total and does not round a small one to zero', () => {
    expect(formatUsd(1.234)).toBe('$1.23');
    expect(formatUsd(0.061)).toBe('$0.06');
    expect(formatUsd(0.004)).toBe('$0.004');
    expect(formatUsd(0.0004)).toBe('<$0.001');
    expect(formatUsd(0)).toBe('$0.00');
  });
});
