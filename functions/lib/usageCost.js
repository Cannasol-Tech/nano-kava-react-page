/**
 * file: functions/lib/usageCost.js
 * author: Stephen Boyett
 *
 * description:
 *     Turns Gemini's usageMetadata into tokens and dollars, and adds turns into a running
 *     total. Kept apart from chat.js because the cost of a conversation is read by the store
 *     and the daily report, neither of which should know how a model bills.
 *     See CLAUDE.md § What a conversation costs.
 *
 * See Also:
 *     functions/lib/chatStore.js
 *     functions/lib/dailyReport.js
 *
 * ---
 * Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

/**
 * gemini-3.8-flash paid tier, USD per million tokens, from ai.google.dev/gemini-api/docs/pricing
 * on 2026-09-09. `cached` is the implicit-cache read rate — 10x cheaper than fresh input, which
 * is why the stable prefix in persona.js earns its keep.
 *
 * Dated, because 3.8's launch pricing is promotional and **doubles on 2027-01-01**. A flat
 * constant would keep reporting half the real cost from New Year's Day with nothing to notice.
 * Newest first; re-check the whole table when MODEL changes.
 */
const RATE_SCHEDULE = [
  { from: Date.UTC(2027, 0, 1), input: 1.50, output: 7.50, cached: 0.15 },
  { from: 0, input: 0.75, output: 3.75, cached: 0.075 },
];

/** The rates in force when the turn happened, not when the report is read. */
function ratesOn(when = new Date()) {
  const at = when instanceof Date ? when.getTime() : Number(when) || Date.now();
  return RATE_SCHEDULE.find((tier) => at >= tier.from) || RATE_SCHEDULE[RATE_SCHEDULE.length - 1];
}

/** Today's rates, for callers that just want to read them. */
const RATES_PER_MILLION = ratesOn();

const EMPTY_USAGE = { promptTokens: 0, cachedTokens: 0, outputTokens: 0, costUsd: 0, turns: 0 };

const count = (value) => (Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0);

/**
 * `cachedContentTokenCount` is a SUBSET of `promptTokenCount`, not an addition — billing the
 * whole prompt at the input rate and the cache on top double-counts every cached token.
 */
function costOf(usage, when = new Date()) {
  const rates = ratesOn(when);
  const prompt = count(usage?.promptTokenCount);
  const cached = Math.min(count(usage?.cachedContentTokenCount), prompt);
  const output = count(usage?.candidatesTokenCount);

  return ((prompt - cached) * rates.input
    + cached * rates.cached
    + output * rates.output) / 1e6;
}

/** One turn, in the shape the session document stores. A turn with no usage block counts zero. */
function usageFrom(usage, when = new Date()) {
  if (!usage) return { ...EMPTY_USAGE, turns: 0 };
  return {
    promptTokens: count(usage.promptTokenCount),
    cachedTokens: Math.min(count(usage.cachedContentTokenCount), count(usage.promptTokenCount)),
    outputTokens: count(usage.candidatesTokenCount),
    costUsd: costOf(usage, when),
    turns: 1,
  };
}

/** Absent `total` is ordinary: every document written before cost tracking has none. */
function addUsage(total, turn) {
  const base = total || EMPTY_USAGE;
  return {
    promptTokens: count(base.promptTokens) + count(turn.promptTokens),
    cachedTokens: count(base.cachedTokens) + count(turn.cachedTokens),
    outputTokens: count(base.outputTokens) + count(turn.outputTokens),
    costUsd: (Number(base.costUsd) || 0) + (Number(turn.costUsd) || 0),
    turns: count(base.turns) + count(turn.turns),
  };
}

/** A tenth of a cent still reads as a number; rounding it to $0.00 hides a real trend. */
function formatUsd(amount) {
  const value = Number(amount) || 0;
  if (value === 0) return '$0.00';
  if (value < 0.001) return '<$0.001';
  return value < 0.01 ? `$${value.toFixed(3)}` : `$${value.toFixed(2)}`;
}

module.exports = {
  RATES_PER_MILLION, RATE_SCHEDULE, ratesOn, EMPTY_USAGE, usageFrom, costOf, addUsage, formatUsd,
};
