/**
 * @file: src/components/SampleQuiz.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Three-tap sample intent quiz (idea #21). Shares the modal shell with NanoExplainer and
 *     ends by handing the answers to Sol as the visitor's own turn, so he recaps them and offers
 *     the sample himself. See chat/engagement/CLAUDE.md § The three-tap intent quiz.
 *
 * @See Also:
 *     src/components/chat/engagement/sampleQuiz.js
 *     src/utils/quiz.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { subscribeQuiz, closeQuiz, completeQuiz } from '../utils/quiz';
import { QUIZ_STEPS, composeQuizMessage, SELECT_FEEDBACK_MS } from './chat/engagement/sampleQuiz';
import { trackEvent } from '../utils/gtag';

const CLOSE_MS = 240;

export default function SampleQuiz() {
  const { isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [chosen, setChosen] = useState(null);
  const panelRef = useRef(null);
  const settlingRef = useRef(false);
  const closeTimerRef = useRef(null);

  const dismiss = useCallback((finished) => {
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setIsOpen(false);
      setIsClosing(false);
      closeQuiz({ dismissed: !finished });
    }, CLOSE_MS);
  }, []);

  useEffect(() => subscribeQuiz((open) => {
    if (!open) return;
    // A reply beating the close animation used to be shut again by the previous run's timer.
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setAnswers({});
    setStepIndex(0);
    setChosen(null);
    settlingRef.current = false;
    setIsClosing(false);
    setIsOpen(true);
    trackEvent('sol_quiz_started', { page: window.location.pathname });
  }), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    panelRef.current?.focus();
    // Captured and stopped, or the same press also unmounts ChatPanel behind this modal.
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      dismiss(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [dismiss, isOpen]);

  const choose = useCallback((option) => {
    // A second tap during the settle would skip a question outright.
    if (settlingRef.current) return;
    settlingRef.current = true;

    const step = QUIZ_STEPS[stepIndex];
    const next = { ...answers, [step.key]: option.value };
    setAnswers(next);
    setChosen(option.value);

    window.setTimeout(() => {
      settlingRef.current = false;
      setChosen(null);

      if (stepIndex < QUIZ_STEPS.length - 1) {
        setStepIndex(stepIndex + 1);
        return;
      }
      trackEvent('sol_quiz_completed', next);
      completeQuiz({ message: composeQuizMessage(next) });
      dismiss(true);
    }, SELECT_FEEDBACK_MS);
  }, [answers, dismiss, stepIndex]);

  if (!isOpen) return null;

  const step = QUIZ_STEPS[stepIndex];
  const suffix = isClosing ? '--closing' : '';

  return (
    <div className={`nano-modal-root${suffix}`} role="presentation">
      <div className="nano-modal-scrim" onClick={() => dismiss(false)} aria-hidden="true" />

      <section
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-quiz-title"
        data-theme={isDark ? 'dark' : 'light'}
        className={`nano-modal${suffix}`}
      >
        <button
          type="button"
          className="nano-modal__close"
          onClick={() => dismiss(false)}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="nano-modal__eyebrow">
          Step {stepIndex + 1} of {QUIZ_STEPS.length}
        </p>
        <h2 id="sample-quiz-title" className="nano-modal__title">{step.question}</h2>

        <div
          className="sample-quiz__progress"
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={QUIZ_STEPS.length}
        >
          <span style={{ '--quiz-pct': `${((stepIndex + 1) / QUIZ_STEPS.length) * 100}%` }} />
        </div>

        <ul className="sample-quiz__options">
          {step.options.map((option, i) => (
            <li key={option.value} style={{ '--opt-index': i }}>
              <button
                type="button"
                aria-pressed={chosen === option.value}
                className={`sample-quiz__option${chosen === option.value ? ' sample-quiz__option--chosen' : ''}`}
                onClick={() => choose(option)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>

        <p className="nano-modal__note">
          Three taps and Josh has what he needs — no form to fill in first.
        </p>
      </section>
    </div>
  );
}
