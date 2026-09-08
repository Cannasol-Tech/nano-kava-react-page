/**
 * @file: src/utils/quiz.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Open/close signal for the sample intent quiz, the notice channel that tells Sol when the
 *     picker is not on screen, and the completion signal that hands the composed lead to
 *     ChatWidget. Separate signals because the payloads are unrelated.
 *
 * @See Also:
 *     src/components/SampleQuiz.jsx
 *     src/components/chat/ChatWidget.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { createSignal, modalSlot } from './signal';
import {
  canOpenQuiz, QUIZ_UNINVITED_KEY, CONVERTED_KEY, QUIZ_NOTES,
} from '../components/chat/engagement/sampleQuiz';

const SLOT = 'sample-quiz';

// Replay: the picker can be signalled before SampleQuiz has subscribed, and a lost open is a
// tool that reported success with nothing on screen.
const openSignal = createSignal({ replay: true });
const doneSignal = createSignal();
const noticeSignal = createSignal();

const readFlag = (key) => {
  try { return window.sessionStorage.getItem(key) === '1'; } catch { return false; }
};
const writeFlag = (key) => {
  try { window.sessionStorage.setItem(key, '1'); } catch { /* private mode */ }
};

export const subscribeQuiz = openSignal.subscribe;

/** Things Sol has to be told about the picker; ChatPanel folds these into the transcript. */
export const subscribeQuizNotice = noticeSignal.subscribe;

/**
 * `force` is for a visitor who tapped the chip. Everything else — notably the model's
 * `open_sample_quiz` tool — goes through the policy in sampleQuiz.js § canOpenQuiz.
 *
 * Returns whether the picker is actually on screen, and every caller must act on that: see
 * components/chat/engagement/CLAUDE.md § One modal at a time.
 */
export function openQuiz({ force = false } = {}) {
  const allowed = force || canOpenQuiz({
    uninvitedShown: readFlag(QUIZ_UNINVITED_KEY),
    converted: readFlag(CONVERTED_KEY),
  });
  if (!allowed || !modalSlot.claim(SLOT)) return false;
  // Only an uninvited open spends the session's one interruption.
  if (!force) writeFlag(QUIZ_UNINVITED_KEY);
  openSignal.emit(true);
  return true;
}

/** `dismissed` means the visitor closed it unfinished, which Sol has to hear about. */
export function closeQuiz({ dismissed = true } = {}) {
  modalSlot.release(SLOT);
  openSignal.emit(false);
  if (dismissed) noticeSignal.emit(QUIZ_NOTES.dismissed);
}

export const subscribeQuizComplete = doneSignal.subscribe;
export const completeQuiz = (result) => doneSignal.emit(result);
