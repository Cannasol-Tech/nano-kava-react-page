/**
 * @file: src/components/chat/engagement/sectionPrompts.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The section-aware nudge ladder and the policy that decides whether one may fire. Pure and
 *     dependency-free so the restraint rules are testable — see CLAUDE.md § Section-aware nudges.
 *
 * @See Also:
 *     src/components/chat/engagement/SolNudge.jsx
 *     src/hooks/useSectionDwell.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

/** A section must hold the viewport this long before it counts as interest rather than scrolling. */
export const DWELL_MS = 2500;

/** Two is a nudge, three is nagging. */
export const MAX_NUDGES_PER_SESSION = 2;

/** Breathing room between nudges, so a fast reader is not chased down the page. */
export const COOLDOWN_MS = 25_000;

/**
 * Ordered by depth, and the ask escalates with it: someone at the benefits block is still
 * deciding whether to care, someone at the proof block is comparing suppliers. The question is
 * what gets sent to Sol verbatim, so each one has to read like the visitor typed it.
 *
 * The label is the visitor's own words too. (Changed 2026-08-26: labels used to be written at the
 * visitor — "Want samples for your format?" — which read as Sol asking them, backwards for a chip
 * that sends their turn.)
 */
export const SECTION_PROMPTS = [
  {
    id: 'benefits',
    section: 'benefits',
    label: "Why doesn't it go cloudy?",
    question: 'Why does your emulsion stay clear when regular kava goes cloudy?',
    intent: 'educate',
  },
  {
    id: 'process',
    section: 'process',
    label: 'Can I get a sample for my base?',
    question: 'Can I get a sample to test in my own base? I want to see how it behaves in my format.',
    intent: 'sample',
  },
  {
    id: 'proof',
    section: 'proof',
    label: 'Who else is shipping with this?',
    question: 'What formats are other brands shipping with this, and can I get a sample to try?',
    intent: 'proof',
  },
  {
    id: 'contact',
    section: 'contact',
    label: 'How do I get samples sent out?',
    question: "I'd like samples sent out — what do you need from me?",
    intent: 'close',
  },
];

export function promptForSection(sectionId) {
  return SECTION_PROMPTS.find((prompt) => prompt.section === sectionId) || null;
}

/**
 * The whole restraint policy in one pure decision. Returns the prompt to raise, or null.
 *
 * `dismissed` is a hard stop for the session: a visitor who waves one away has answered the
 * question for all of them, and asking again is how a helpful nudge turns into a popup.
 *
 * Note this says nothing about whether the panel is open. *Whether* a prompt exists and *how it
 * is presented* are different questions: closed, it is a bubble over the launcher; open, it is a
 * chip above the composer, which ChatPanel withholds while Sol is mid-reply.
 * (Changed 2026-08-25: an open panel used to suppress the prompt outright.)
 */
export function nextPrompt({
  sectionId,
  shownIds = [],
  dismissed = false,
  converted = false,
  lastShownAt = null,
  now = 0,
}) {
  if (dismissed || converted) return null;
  if (shownIds.length >= MAX_NUDGES_PER_SESSION) return null;
  if (shownIds.includes(sectionId)) return null;
  if (lastShownAt !== null && now - lastShownAt < COOLDOWN_MS) return null;
  return promptForSection(sectionId);
}
