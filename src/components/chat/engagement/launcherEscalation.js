/**
 * @file: src/components/chat/engagement/launcherEscalation.js
 * @author: Stephen Boyett
 *
 * @description:
 *     How hard Sol tries to get noticed by a visitor who is scrolling past him — quiet, then a
 *     teaser, then a bounded wiggle. Pure. See ../CLAUDE.md § Proactive pop-in trigger.
 *
 * @See Also:
 *     src/components/chat/ChatWidget.jsx
 *     src/components/chat/engagement/sectionPrompts.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

/** Depth into the document, as a fraction, at which each stage arms. */
export const ESCALATION_STAGES = [
  {
    key: 'peek',
    atRatio: 0.22,
    message: 'Questions on specs, pricing or samples? I am right here.',
  },
  {
    key: 'insist',
    atRatio: 0.55,
  },
];

export const STAGE_ORDER = ['idle', 'peek', 'insist'];

export const stageFor = (ratio) => ESCALATION_STAGES
  .filter((stage) => ratio >= stage.atRatio)
  .reduce((highest, stage) => stage.key, 'idle');

export const messageForStage = (stage) =>
  ESCALATION_STAGES.find((s) => s.key === stage)?.message
  || ESCALATION_STAGES.find((s) => s.message)?.message
  || null;

/**
 * Sol escalates only while he is being ignored. Anyone who opened him, waved him off, or
 * already converted has answered the question, and a shaking button after that is just noise.
 */
export function nextStage({ current = 'idle', reached, dismissed = false, converted = false, everOpened = false }) {
  if (dismissed || converted || everOpened) return 'idle';
  return STAGE_ORDER.indexOf(reached) > STAGE_ORDER.indexOf(current) ? reached : current;
}
