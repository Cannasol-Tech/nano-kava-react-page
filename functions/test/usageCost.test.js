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
  RATES_PER_MILLION, ratesOn, EMPTY_USAGE, usageFrom, costOf, addUsage, formatUsd,
} from '../lib/usageCost.js';

const TODAY = new Date('2026-09-09T12:00:00Z');

/** A real turn, copied from a production log line on 2026-09-09. */
const REAL_TURN = {
  promptTokenCount: 11159,
  candidatesTokenCount: 102,
  totalTokenCount: 11261,
  cachedContentTokenCount: 8148,
};

describe('the published rates', () => {
  it('are the gemini-3.8-flash launch prices per million tokens', () => {
    expect(ratesOn(TODAY)).toMatchObject({ input: 0.75, output: 3.75, cached: 0.075 });
  });

  /**
   * 3.8's launch pricing is promotional and doubles on 2027-01-01. A flat constant would report
   * half the real cost from New Year's Day onward, and nothing would flag it.
   */
  it('doubles on 2027-01-01, when the launch promotion ends', () => {
    expect(ratesOn(new Date('2026-12-31T23:59:59Z'))).toMatchObject({ input: 0.75, output: 3.75 });
    expect(ratesOn(new Date('2027-01-01T00:00:00Z'))).toMatchObject({ input: 1.50, output: 7.50, cached: 0.15 });
  });

  it('exposes the current rates for callers that just want to read them', () => {
    expect(RATES_PER_MILLION).toMatchObject(ratesOn());
  });
});

describe('costing one turn', () => {
  /** Cached tokens are a SUBSET of promptTokenCount — billing the full prompt double-counts. */
  it('bills the cached share at the cached rate and only the remainder at full price', () => {
    const cost = costOf(REAL_TURN, TODAY);
    const expected = ((11159 - 8148) * 0.75 + 8148 * 0.075 + 102 * 3.75) / 1e6;

    expect(cost).toBeCloseTo(expected, 10);
    expect(cost).toBeCloseTo(0.0032518, 7);   // ~$0.0033 a turn, which is the number that matters
  });

  it('costs a cache miss at the full input rate', () => {
    const cost = costOf({ promptTokenCount: 10000, candidatesTokenCount: 100, cachedContentTokenCount: 0 }, TODAY);
    expect(cost).toBeCloseTo((10000 * 0.75 + 100 * 3.75) / 1e6, 10);
  });

  it('costs a turn at the rates in force when it happened, not when it is read', () => {
    expect(costOf(REAL_TURN, new Date('2027-06-01'))).toBeCloseTo(costOf(REAL_TURN, TODAY) * 2, 9);
  });

  it('treats a missing or malformed usage block as free rather than throwing', () => {
    for (const bad of [null, undefined, {}, { promptTokenCount: 'x' }]) expect(costOf(bad)).toBe(0);
  });
});

describe('normalising usage for storage', () => {
  it('keeps the three counts that cost money, plus the dollars', () => {
    expect(usageFrom(REAL_TURN, TODAY)).toEqual({
      promptTokens: 11159,
      cachedTokens: 8148,
      outputTokens: 102,
      costUsd: costOf(REAL_TURN, TODAY),
      turns: 1,
    });
  });

  it('normalises an absent usage block to zeroes, so a stored total is never NaN', () => {
    expect(usageFrom(undefined)).toEqual({ ...EMPTY_USAGE, turns: 0 });
  });

  it('adds a turn onto a running total', () => {
    const total = addUsage(usageFrom(REAL_TURN, TODAY), usageFrom(REAL_TURN, TODAY));

    expect(total.promptTokens).toBe(22318);
    expect(total.cachedTokens).toBe(16296);
    expect(total.outputTokens).toBe(204);
    expect(total.turns).toBe(2);
    expect(total.costUsd).toBeCloseTo(costOf(REAL_TURN, TODAY) * 2, 10);
  });

  it('adds onto a document that predates cost tracking', () => {
    const total = addUsage(undefined, usageFrom(REAL_TURN, TODAY));
    expect(total).toEqual(usageFrom(REAL_TURN, TODAY));
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
