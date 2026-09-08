/**
 * @file: src/test/sampleQuiz.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The quiz earns its place only if three taps produce a lead Josh can act on, so this
 *     pins the composition: prose rather than enum codes, and every answer represented.
 *
 * @See Also:
 *     src/components/chat/engagement/sampleQuiz.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import {
  QUIZ_STEPS, composeQuizMessage, isComplete, canOpenQuiz, QUIZ_NOTES,
} from '../components/chat/engagement/sampleQuiz';

const answers = { format: 'seltzer', volume: 'large', timeline: 'quarter' };

describe('the quiz shape', () => {
  it('is exactly three taps', () => {
    expect(QUIZ_STEPS).toHaveLength(3);
  });

  it('always offers an honest escape hatch, so nobody is forced to overstate', () => {
    const escapes = ['exploring', 'unknown', 'research'];
    QUIZ_STEPS.forEach((step, i) => {
      expect(step.options.map((o) => o.value)).toContain(escapes[i]);
    });
  });

  it('gives every option prose for the lead', () => {
    QUIZ_STEPS.forEach((step) => {
      step.options.forEach((option) => expect(option.phrase.length).toBeGreaterThan(3));
    });
  });
});

describe('isComplete', () => {
  it('needs all three', () => {
    expect(isComplete(answers)).toBe(true);
    expect(isComplete({ format: 'seltzer', volume: 'large' })).toBe(false);
    expect(isComplete({})).toBe(false);
    expect(isComplete(undefined)).toBe(false);
  });
});

describe('composeQuizMessage', () => {
  it('reads as a sentence the visitor could have typed', () => {
    expect(composeQuizMessage(answers)).toBe("I'm building a seltzer or RTD, 10k+ units, this quarter.");
  });

  it('carries every answer, so Sol needs no second round of questions', () => {
    const message = composeQuizMessage(answers);
    ['seltzer or RTD', '10k+ units', 'this quarter'].forEach((fragment) => {
      expect(message).toContain(fragment);
    });
  });

  it('never leaks the raw option values', () => {
    expect(composeQuizMessage(answers)).not.toMatch(/\bseltzer\b(?!\s|,|\.)|\blarge\b/);
  });
});

describe('canOpenQuiz', () => {
  it('allows the first uninvited open', () => {
    expect(canOpenQuiz({})).toBe(true);
    expect(canOpenQuiz()).toBe(true);
  });

  it('never interrupts twice, and never after converting', () => {
    expect(canOpenQuiz({ uninvitedShown: true })).toBe(false);
    expect(canOpenQuiz({ converted: true })).toBe(false);
  });

  // Regression: the chip tap used to write the same flag and silently disable the model's path.
  it('reads only uninvited opens, so a chip tap cannot spend the session ceiling', () => {
    expect(canOpenQuiz({ uninvitedShown: false, converted: false })).toBe(true);
  });
});

describe('QUIZ_NOTES', () => {
  it('tells the model as well as the visitor, or Sol keeps describing a picker', () => {
    Object.values(QUIZ_NOTES).forEach((note) => {
      expect(note.text.length).toBeGreaterThan(3);
      expect(note.toModel).toMatch(/format, volume and timeline/);
    });
  });
});
