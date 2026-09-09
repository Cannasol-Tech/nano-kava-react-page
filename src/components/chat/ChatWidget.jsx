/**
 * @file: src/components/chat/ChatWidget.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Floating launcher and shell for the Sol chat assistant — the only chat module App
 *     imports. Renders closed with a single button so the prerendered snapshot stays legible,
 *     lazy loads the panel on first open, arrives on the load sequence's mark, and pops itself
 *     in once per session. See CLAUDE.md § Prerender and first render.
 *
 * @See Also:
 *     src/components/chat/panel/ChatPanel.jsx
 *     src/components/chat/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import themesConfig from '../../theme/themes';
import { trackEvent } from '../../utils/gtag';
import { SEQUENCE, isSequenceEnabled, msUntil, shouldGreet } from '../../utils/loadSequence';
import { useSectionDwell } from '../../hooks/useSectionDwell';
import { nextPrompt, SECTION_PROMPTS } from './engagement/sectionPrompts';
import SolNudge from './engagement/SolNudge';
import { subscribeQuizComplete } from '../../utils/quiz';
import { isModalOpen } from '../../utils/signal';
import { isMobileViewport } from '../../utils/viewport';
import { ESCALATION_STAGES, nextStage, stageFor, messageForStage } from './engagement/launcherEscalation';

const ChatPanel = lazy(() => import('./panel/ChatPanel'));

const SHOWN_KEY = 'sol:proactive-shown';
const DISMISSED_KEY = 'sol:dismissed';
const NUDGE_OFF_KEY = 'sol:nudge-dismissed';
const CONVERTED_KEY = 'sol:converted';
const SECTION_IDS = SECTION_PROMPTS.map((prompt) => prompt.section);

// Short on purpose: this is the whole introduction on a phone, read at a glance.
const GREETING_BUBBLE = "I'm Sol — questions on specs or samples?";
// Below this the bubble sits on the hero's own CTA — see CLAUDE.md § Sol on a phone.
const HERO_CLEAR_SCROLL_PX = 150;
const DWELL_MS = 12_000;
const SCROLL_TRIGGER_RATIO = 0.4;
const CLOSE_ANIMATION_MS = 240;

/** sessionStorage throws outright in Safari private mode, so every access is guarded. */
function readFlag(key) {
  try {
    return window.sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key) {
  try {
    window.sessionStorage.setItem(key, '1');
  } catch {
    /* private mode — the widget simply loses its session memory */
  }
}

export default function ChatWidget() {
  const { isDark } = useTheme();
  const theme = isDark ? themesConfig.dark : themesConfig.light;

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [settled, setSettled] = useState(false);
  // 'pending' -> 'arriving' -> 'ready'; skips straight to 'ready' when the sequence is off.
  const [arrival, setArrival] = useState(() => (isSequenceEnabled() ? 'pending' : 'ready'));
  const [nudge, setNudge] = useState(null);
  const [initialQuestion, setInitialQuestion] = useState(null);
  const [quizMessage, setQuizMessage] = useState(null);
  const [stage, setStage] = useState('idle');
  const [greetingBubble, setGreetingBubble] = useState(false);
  const [greetTimerFired, setGreetTimerFired] = useState(false);
  // Gates every bubble, not just the greeting — see CLAUDE.md § Sol on a phone.
  const [heroCleared, setHeroCleared] = useState(false);
  const { pathname } = useLocation();
  const everOpenedRef = useRef(false);
  const nudgeStateRef = useRef({ shownIds: [], lastShownAt: null });
  const launcherRef = useRef(null);
  const openedRef = useRef(false);

  const open = useCallback((trigger) => {
    if (openedRef.current) return;
    openedRef.current = true;
    setIsClosing(false);
    setSettled(false);
    setIsOpen(true);
    everOpenedRef.current = true;
    setStage('idle');
    setGreetingBubble(false);
    trackEvent('sol_chat_open', { trigger, page: window.location.pathname });
  }, []);

  const close = useCallback(() => {
    openedRef.current = false;
    writeFlag(DISMISSED_KEY);
    setSettled(false);
    setIsClosing(true);
    window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      launcherRef.current?.focus();
    }, CLOSE_ANIMATION_MS);
  }, []);

  const toggle = useCallback(() => (isOpen ? close() : open('launcher')), [close, isOpen, open]);

  useEffect(() => {
    if (!isOpen) return undefined;
    // A modal over the panel owns Escape; one press used to close both. See CLAUDE.md § Escape closes one thing.
    const closeOnEscape = (event) => {
      if (event.key === 'Escape' && !isModalOpen()) close();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [close, isOpen]);

  /**
   * Every proactive open goes through here, so one set of flags governs all of them.
   *
   * `once` is the session guard for the dwell and scroll-depth triggers. The load-sequence
   * greeting passes false: a visitor who reloads expects to be greeted again, and only an
   * explicit dismissal should silence it. (Changed 2026-08-25 — Stephen refreshed and Sol
   * stayed shut, because SHOWN_KEY had been written earlier in the same tab.)
   */
  const popIn = useCallback((trigger, { once = true } = {}) => {
    if (window.__PRERENDER__) return;
    // Nothing opens the panel on a phone except a tap. Dwell and scroll-depth get the bubble
    // instead — see CLAUDE.md § Proactive pop-in trigger.
    if (isMobileViewport()) return;
    if (readFlag(DISMISSED_KEY)) return;
    if (once && readFlag(SHOWN_KEY)) return;
    writeFlag(SHOWN_KEY);
    open(trigger);
  }, [open]);

  // Deferred to an effect: reading storage/UA during render would desync hydration.
  useEffect(() => {
    if (window.__PRERENDER__) return undefined;
    if (readFlag(SHOWN_KEY) || readFlag(DISMISSED_KEY)) return undefined;

    let observer;
    const trigger = (reason) => {
      window.clearTimeout(timerId);
      observer?.disconnect();
      popIn(reason);
    };
    const timerId = window.setTimeout(() => trigger('dwell'), DWELL_MS);

    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
    sentinel.style.top = `${Math.round(document.documentElement.scrollHeight * SCROLL_TRIGGER_RATIO)}px`;
    document.body.appendChild(sentinel);

    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) trigger('scroll-depth');
    });
    observer.observe(sentinel);

    return () => {
      window.clearTimeout(timerId);
      observer.disconnect();
      sentinel.remove();
    };
  }, [popIn]);

  // Shared gate for every bubble that can anchor over the hero CTA — see CLAUDE.md § Sol on a phone.
  useEffect(() => {
    if (window.__PRERENDER__) return undefined;
    if (window.scrollY > HERO_CLEAR_SCROLL_PX) { setHeroCleared(true); return undefined; }
    const onScroll = () => {
      if (window.scrollY <= HERO_CLEAR_SCROLL_PX) return;
      setHeroCleared(true);
      window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Sol lands, settles, then introduces himself — the last beat of the load sequence.
  useEffect(() => {
    if (!shouldGreet()) return undefined;
    const id = window.setTimeout(() => {
      // A panel that opens itself is most of a phone screen. Offer, do not take.
      if (isMobileViewport()) { setGreetTimerFired(true); return; }
      popIn('load-sequence', { once: false });
    }, msUntil(SEQUENCE.greetAtMs));
    return () => window.clearTimeout(id);
  }, [popIn]);

  // Waits on whichever of {timer, scroll} finishes last — see the heroCleared effect above.
  useEffect(() => {
    if (!greetTimerFired || !heroCleared) return;
    if (!readFlag(DISMISSED_KEY) && !readFlag(NUDGE_OFF_KEY)) setGreetingBubble(true);
  }, [greetTimerFired, heroCleared]);

  useEffect(() => {
    if (arrival !== 'pending') return undefined;
    const id = window.setTimeout(() => setArrival('arriving'), msUntil(SEQUENCE.solAtMs));
    return () => window.clearTimeout(id);
  }, [arrival]);

  const onDwell = useCallback((sectionId) => {
    const { shownIds, lastShownAt } = nudgeStateRef.current;
    const candidate = nextPrompt({
      sectionId,
      shownIds,
      lastShownAt,
      now: Date.now(),
      dismissed: readFlag(NUDGE_OFF_KEY),
      converted: readFlag(CONVERTED_KEY),
    });
    if (!candidate) return;

    nudgeStateRef.current = {
      shownIds: [...shownIds, candidate.section],
      lastShownAt: Date.now(),
    };
    setNudge(candidate);
    trackEvent('sol_nudge_shown', { section: candidate.section, intent: candidate.intent });
  }, []);

  useSectionDwell(SECTION_IDS, onDwell);

  useEffect(() => {
    if (window.__PRERENDER__) return undefined;
    let sentinels = [];
    let observer;
    let cancelled = false;

    // Wait past `load` to measure scrollHeight — see CLAUDE.md § Escalation sentinels wait for layout.
    const plantSentinels = () => {
      if (cancelled) return;
      sentinels = ESCALATION_STAGES.map((entry) => {
        const el = document.createElement('div');
        el.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
        // A pixel offset, not a percentage: a percentage resolves against the viewport here.
        el.style.top = `${Math.round(document.documentElement.scrollHeight * entry.atRatio)}px`;
        el.dataset.ratio = String(entry.atRatio);
        document.body.appendChild(el);
        return el;
      });

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const reached = stageFor(Number(entry.target.dataset.ratio));
          setStage((current) => nextStage({
            current,
            reached,
            everOpened: everOpenedRef.current,
            dismissed: readFlag(NUDGE_OFF_KEY) || readFlag(DISMISSED_KEY),
            converted: readFlag(CONVERTED_KEY),
          }));
        });
      });
      sentinels.forEach((el) => observer.observe(el));
    };

    if (document.readyState === 'complete') {
      requestAnimationFrame(plantSentinels);
    } else {
      window.addEventListener('load', () => requestAnimationFrame(plantSentinels), { once: true });
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
      sentinels.forEach((el) => el.remove());
    };
  }, []);

  // The quiz finishes outside the widget; opening here keeps one owner of panel state.
  // The whole result rides through, id included: two identical runs must stay two turns.
  useEffect(() => subscribeQuizComplete((result) => {
    setQuizMessage({ id: result.id, text: result.message });
    setNudge(null);
    open('sample-quiz');
  }), [open]);

  /** From the launcher bubble: open the panel with the question already asked. */
  const acceptNudge = useCallback(() => {
    const accepted = nudge;
    if (!accepted) return;
    setNudge(null);
    setInitialQuestion(accepted.question);
    open(`nudge:${accepted.section}`);
    trackEvent('sol_nudge_accepted', { section: accepted.section, intent: accepted.intent, surface: 'launcher' });
  }, [nudge, open]);

  /** From inside the panel: ChatPanel sends it directly, so this only clears the chip. */
  const consumeNudge = useCallback(() => {
    if (nudge) {
      trackEvent('sol_nudge_accepted', { section: nudge.section, intent: nudge.intent, surface: 'panel' });
    }
    setNudge(null);
  }, [nudge]);

  const dismissNudge = useCallback(() => {
    // One wave-off answers for all of them; see sectionPrompts.js.
    writeFlag(NUDGE_OFF_KEY);
    setNudge(null);
    trackEvent('sol_nudge_dismissed', { section: nudge?.section });
  }, [nudge]);

  /**
   * One bubble slot, three possible occupants. A contextual section prompt outranks everything;
   * the mobile greeting outranks the generic scroll teaser, because it is the introduction the
   * visitor would otherwise have got from the panel opening itself.
   */
  const teaser = nudge ? null : (
    greetingBubble
      ? { section: 'greeting', intent: 'greeting', label: GREETING_BUBBLE }
      : (stage !== 'idle' && heroCleared
        ? { section: 'scroll', intent: 'teaser', label: messageForStage('peek') }
        : null)
  );

  const dismissTeaser = useCallback(() => {
    writeFlag(NUDGE_OFF_KEY);
    setStage('idle');
    setGreetingBubble(false);
    trackEvent('sol_teaser_dismissed');
  }, []);

  /**
   * On a phone the panel covers ~81% of the screen, so following one of Sol's own links left
   * the destination — the contact form — behind it and untappable. Desktop keeps the panel:
   * there it occupies a corner and closing it would lose the conversation for no reason.
   */
  const firstPathRef = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPathRef.current) return;
    firstPathRef.current = pathname;
    if (isMobileViewport()) close();
  }, [close, pathname]);

  const shellClassName = isClosing
    ? 'sol-panel-shell sol-panel-shell--closing'
    : `sol-panel-shell${settled ? ' sol-panel-shell--settled' : ''}`;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 print:hidden">
      {isOpen ? (
        <Suspense fallback={null}>
          <div
            className={shellClassName}
            onAnimationEnd={() => { if (!isClosing) setSettled(true); }}
          >
            <ChatPanel
              onClose={close}
              initialQuestion={initialQuestion}
              nudge={nudge}
              quizMessage={quizMessage}
              onNudgeAccept={consumeNudge}
              onNudgeDismiss={dismissNudge}
            />
          </div>
        </Suspense>
      ) : null}

      {!isOpen ? (
        <SolNudge
          prompt={nudge || teaser}
          isDark={isDark}
          shimmer={Boolean(greetingBubble && !nudge)}
          onAccept={nudge ? acceptNudge : () => open(greetingBubble ? 'greeting-bubble' : 'scroll-teaser')}
          onDismiss={nudge ? dismissNudge : dismissTeaser}
        />
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-label="Chat with Sol"
        aria-expanded={isOpen}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && arrival === 'arriving') setArrival('ready');
        }}
        className={`sol-launcher sol-launcher--${arrival}${stage === 'insist' && !isOpen ? ' sol-launcher--insist' : ''} interactive-btn hover-scale active-press relative grid place-items-center w-14 h-14 rounded-full text-white bg-gradient-to-br ${theme.accent} ${theme.shadowXl}`}
      >
        {arrival === 'arriving' ? <span className="sol-arrive-ring" aria-hidden="true" /> : null}
        {arrival === 'ready' ? <span className="sol-launcher-pulse" aria-hidden="true" /> : null}
        <MessageCircle className="sol-launcher-icon w-6 h-6 relative" />
      </button>
    </div>
  );
}
