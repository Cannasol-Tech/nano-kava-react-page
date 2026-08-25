/**
 * @file: src/components/chat/ChatWidget.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Floating launcher and shell for the Bula chat assistant — the only chat module App
 *     imports. Renders closed with a single button so the prerendered snapshot stays
 *     hydratable, lazy loads the panel on first open, and pops itself in once per session
 *     after a dwell timer or 40% scroll depth. See CLAUDE.md § Prerender and first render.
 *
 * @See Also:
 *     src/components/chat/ChatPanel.jsx
 *     src/components/chat/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import themesConfig from '../../theme/themes';
import { trackEvent } from '../../utils/gtag';

const ChatPanel = lazy(() => import('./ChatPanel'));

const SHOWN_KEY = 'bula:proactive-shown';
const DISMISSED_KEY = 'bula:dismissed';
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
  const launcherRef = useRef(null);
  const openedRef = useRef(false);

  const open = useCallback((trigger) => {
    if (openedRef.current) return;
    openedRef.current = true;
    setIsClosing(false);
    setSettled(false);
    setIsOpen(true);
    trackEvent('bula_chat_open', { trigger, page: window.location.pathname });
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
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [close, isOpen]);

  // Deferred to an effect: reading storage/UA during render would desync hydration.
  useEffect(() => {
    if (window.__PRERENDER__) return undefined;
    if (readFlag(SHOWN_KEY) || readFlag(DISMISSED_KEY)) return undefined;

    let observer;
    const popIn = (trigger) => {
      writeFlag(SHOWN_KEY);
      window.clearTimeout(timerId);
      observer?.disconnect();
      open(trigger);
    };
    const timerId = window.setTimeout(() => popIn('dwell'), DWELL_MS);

    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none';
    sentinel.style.top = `${Math.round(document.documentElement.scrollHeight * SCROLL_TRIGGER_RATIO)}px`;
    document.body.appendChild(sentinel);

    observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) popIn('scroll-depth');
    });
    observer.observe(sentinel);

    return () => {
      window.clearTimeout(timerId);
      observer.disconnect();
      sentinel.remove();
    };
  }, [open]);

  const shellClassName = isClosing
    ? 'bula-panel-shell bula-panel-shell--closing'
    : `bula-panel-shell${settled ? ' bula-panel-shell--settled' : ''}`;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 print:hidden">
      {isOpen ? (
        <Suspense fallback={null}>
          <div
            className={shellClassName}
            onAnimationEnd={() => { if (!isClosing) setSettled(true); }}
          >
            <ChatPanel onClose={close} />
          </div>
        </Suspense>
      ) : null}

      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        aria-label="Chat with Bula"
        aria-expanded={isOpen}
        className={`bula-launcher interactive-btn hover-scale active-press relative grid place-items-center w-14 h-14 rounded-full text-white bg-gradient-to-br ${theme.accent} ${theme.shadowXl}`}
      >
        <span className="bula-launcher-pulse" aria-hidden="true" />
        <MessageCircle className="w-6 h-6 relative" />
      </button>
    </div>
  );
}
