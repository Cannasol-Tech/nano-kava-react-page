/**
 * @file: src/components/chat/engagement/sampleQuiz.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The three-tap sample intent quiz (idea #21) and the pure composition that turns its
 *     answers into a lead Josh can act on. See CLAUDE.md § The three-tap intent quiz.
 *
 * @See Also:
 *     src/components/SampleQuiz.jsx
 *     src/components/chat/lead/LeadCard.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

/**
 * Three questions, because a fourth is where people quit. Each answer is written to read back
 * as prose in the lead, so Josh gets a brief rather than a set of enum codes.
 */
export const QUIZ_STEPS = [
  {
    key: 'format',
    question: 'What are you building?',
    options: [
      { value: 'seltzer', label: 'Seltzer / RTD', phrase: 'a seltzer or RTD' },
      { value: 'shot', label: 'Shot', phrase: 'a shot' },
      { value: 'powder', label: 'Powder / stick pack', phrase: 'a powder or stick pack' },
      { value: 'exploring', label: 'Still deciding', phrase: 'a format they are still deciding on' },
    ],
  },
  {
    key: 'volume',
    question: 'Roughly what volume?',
    options: [
      { value: 'pilot', label: 'Pilot batch', phrase: 'a pilot batch' },
      { value: 'small', label: 'Up to 10k units', phrase: 'up to 10k units' },
      { value: 'large', label: '10k+ units', phrase: '10k+ units' },
      { value: 'unknown', label: 'Not sure yet', phrase: 'volume not yet scoped' },
    ],
  },
  {
    key: 'timeline',
    question: 'When do you need it?',
    options: [
      { value: 'now', label: 'Now', phrase: 'starting now' },
      { value: 'quarter', label: 'This quarter', phrase: 'this quarter' },
      { value: 'later', label: 'Later this year', phrase: 'later this year' },
      { value: 'research', label: 'Just researching', phrase: 'still researching' },
    ],
  },
];

const phraseFor = (key, value) => {
  const step = QUIZ_STEPS.find((s) => s.key === key);
  return step?.options.find((option) => option.value === value)?.phrase || null;
};

export const isComplete = (answers) => QUIZ_STEPS.every((step) => Boolean(answers?.[step.key]));

/**
 * Reads back as something the visitor could have typed, because that is what it becomes: the
 * quiz result is sent as their turn, so Sol recaps it and offers the sample in his own words.
 *
 * Deliberately NOT a pre-filled lead card. A card seeded straight after the quiz filled the
 * panel and hid the conversation, and it skipped the beat where the visitor agrees to anything.
 * (Changed 2026-08-25 — see CLAUDE.md § The three-tap intent quiz.)
 */
export function composeQuizMessage(answers) {
  const format = phraseFor('format', answers.format);
  const volume = phraseFor('volume', answers.volume);
  const timeline = phraseFor('timeline', answers.timeline);
  return `I'm building ${format}, ${volume}, ${timeline}.`;
}

/**
 * How long the tapped option stays visibly chosen before the next question replaces it.
 * Without this the step advanced in the same tick, so a finger got no confirmation at all —
 * and on touch the stuck :hover then made the next question look pre-answered.
 */
export const SELECT_FEEDBACK_MS = 220;

/** Session flags the policy reads. Kept here so the rule and its inputs live together. */
export const QUIZ_UNINVITED_KEY = 'sol:quiz-uninvited';
export const QUIZ_ANSWERED_KEY = 'sol:quiz-answered';
export const CONVERTED_KEY = 'sol:converted';

/**
 * What Sol is told when the picker is not on screen. Both carry a `toModel` line, because a
 * transcript note the model never sees leaves him telling people to tap through a picker that
 * is not there. See CLAUDE.md § One modal at a time.
 */
export const QUIZ_NOTES = {
  unavailable: {
    text: "The sample picker didn't open.",
    toModel: '[System note: the sample picker did not open and the visitor cannot see one. Do not mention it or ask them to tap through it — ask about format, volume and timeline in the conversation instead.]',
  },
  dismissed: {
    text: 'Sample picker closed.',
    toModel: '[System note: the visitor closed the sample picker without finishing it. Do not raise it or refer to it again — ask about format, volume and timeline in the conversation instead.]',
  },
  // No `text`: the visitor answered, so a note about it would read as an error they caused.
  answered: {
    text: null,
    toModel: '[System note: the visitor has already answered the three questions and their answers are in this conversation. The picker was not raised again. Do not ask them to tap through anything — recap what they told you and offer the sample.]',
  },
};

/**
 * Whether the picker may raise itself *uninvited*: once per session, and never after the visitor
 * has converted. The code sets that ceiling rather than the prompt, because a modal appearing
 * unbidden is far more annoying than a missed opportunity.
 *
 * `uninvitedShown` is deliberately NOT "the quiz has been seen". A visitor who taps the chip
 * bypasses the policy entirely and must not burn the model's one turn — see
 * CLAUDE.md § A chip tap is not an interruption. (Corrected 2026-08-26.)
 *
 * `answered` closes the loop a visitor hit on 2026-09-08: they answered, Sol raised it again,
 * and re-asking three questions they had just answered is the annoyance, not the help.
 */
export function canOpenQuiz({ uninvitedShown = false, converted = false, answered = false } = {}) {
  return !uninvitedShown && !converted && !answered;
}
