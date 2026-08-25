/**
 * @file: src/components/chat/ChatPanel.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Body of the Bula chat panel: solid header bar, translucent message transcript, and a
 *     solid composer footer with an auto-growing textarea, lazy emoji popover and the inline
 *     lead card raised by a `lead_proposed` frame. Lazy
 *     loaded by ChatWidget so none of it lands in the initial bundle, and the transcript
 *     background is blur-gated per browser — see CLAUDE.md § Why the blur is browser-gated.
 *
 * @See Also:
 *     src/components/chat/ChatWidget.jsx
 *     src/components/chat/useChatStream.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Send, Smile, X, Sparkles } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import themesConfig from '../../theme/themes';
import { trackCTAClick, trackEvent, trackSampleRequest } from '../../utils/gtag';
import { useChatStream } from './useChatStream';
import LeadCard from './LeadCard';

const EmojiPicker = lazy(() => import('./EmojiPicker'));

const SAMPLE_PROMPT = "I'd like to request a free sample.";
const SAMPLE_LINK = '/contact?inquiry=samples&product=nano-kava';
const MAX_ROWS = 5;
const NEAR_BOTTOM_PX = 64;

// backdrop-filter on a fixed element cost 53% of frame time in Safari (SAFARI_PERFORMANCE.md).
const IS_SAFARI = typeof navigator !== 'undefined'
  && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

/** Resize the textarea by row count; a height transition would animate a layout property. */
function fitRows(field) {
  field.rows = 1;
  const style = window.getComputedStyle(field);
  const lineHeight = parseFloat(style.lineHeight) || 20;
  const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const needed = Math.round((field.scrollHeight - padding) / lineHeight);
  field.rows = Math.max(1, Math.min(MAX_ROWS, needed || 1));
}

function TypingDots({ dotColor }) {
  return (
    <span className="flex items-center gap-1 py-1" aria-label="Bula is typing">
      {[0, 1, 2].map((index) => (
        <span key={index} className={`bula-dot w-1.5 h-1.5 rounded-full ${dotColor}`} />
      ))}
    </span>
  );
}

function Transcript({ messages, isStreaming, theme, dotColor }) {
  const last = messages[messages.length - 1];
  const awaitingFirstToken = isStreaming && last?.role === 'model' && last.text === '';

  return (
    <>
      {messages.map((message, index) => {
        if (message.role === 'lead') return <LeadCard key={message.id} fields={message.fields} />;
        if (message.role === 'system') {
          return (
            <p key={message.id} className={`text-xs text-center py-1 ${theme.accentText}`}>
              {message.text}
            </p>
          );
        }
        return (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={
                message.role === 'user'
                  ? `max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white bg-gradient-to-br ${theme.accent}`
                  : `max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2 text-sm border ${theme.bgCardAlt} ${theme.borderCard} ${theme.text}`
              }
            >
              {message.text ? (
                <span className={index === 0 ? 'animate-fade-in-up anim-delay-300' : undefined}>{message.text}</span>
              ) : (
                <TypingDots dotColor={dotColor} />
              )}
            </div>
          </div>
        );
      })}
      {awaitingFirstToken ? <span className="sr-only">Bula is typing</span> : null}
    </>
  );
}

export default function ChatPanel({ onClose }) {
  const { isDark } = useTheme();
  const theme = isDark ? themesConfig.dark : themesConfig.light;

  const [draft, setDraft] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const fieldRef = useRef(null);
  const scrollerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const greetedRef = useRef(false);
  const hasSentRef = useRef(false);
  const pendingCaretRef = useRef(null);

  const handleTool = useCallback((event) => {
    trackEvent('bula_tool_handoff', { tool_name: event.name, tool_status: event.status });
  }, []);

  const { messages, send, requestGreeting, isStreaming } = useChatStream({ onTool: handleTool });

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    requestGreeting();
    fieldRef.current?.focus();
  }, [requestGreeting]);

  useEffect(() => {
    if (!isNearBottomRef.current) return;
    const scroller = scrollerRef.current;
    if (scroller) scroller.scrollTop = scroller.scrollHeight;
  }, [messages]);

  const trackScrollAnchor = useCallback((event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < NEAR_BOTTOM_PX;
  }, []);

  const submit = useCallback(
    (text) => {
      if (!text.trim() || isStreaming) return;
      if (!hasSentRef.current) {
        hasSentRef.current = true;
        trackEvent('bula_first_message', { page: window.location.pathname });
      }
      isNearBottomRef.current = true;
      send(text);
      setDraft('');
      if (fieldRef.current) fieldRef.current.rows = 1;
    },
    [isStreaming, send]
  );

  const handleDraftChange = useCallback((event) => {
    setDraft(event.target.value);
    fitRows(event.target);
  }, []);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      submit(draft);
    },
    [draft, submit]
  );

  const insertEmoji = useCallback((glyph) => {
    const field = fieldRef.current;
    setIsPickerOpen(false);
    if (!field) return;
    const caret = field.selectionStart ?? field.value.length;
    setDraft(`${field.value.slice(0, caret)}${glyph}${field.value.slice(field.selectionEnd ?? caret)}`);
    pendingCaretRef.current = caret + glyph.length;
  }, []);

  useEffect(() => {
    const caret = pendingCaretRef.current;
    const field = fieldRef.current;
    if (caret == null || !field) return;
    pendingCaretRef.current = null;
    field.focus();
    field.setSelectionRange(caret, caret);
    fitRows(field);
  }, [draft]);

  const requestSample = useCallback(() => {
    trackSampleRequest('nano-kava');
    submit(SAMPLE_PROMPT);
  }, [submit]);

  const dotColor = isDark ? 'bg-emerald-400' : 'bg-emerald-600';
  const transcriptSurface = IS_SAFARI ? 'bula-transcript--solid' : 'bula-transcript--blur';
  const showQuickReplies = messages.length <= 1 && !isStreaming;

  return (
    <div
      role="dialog"
      aria-label="Chat with Bula, the Cannasol nano kava assistant"
      data-theme={isDark ? 'dark' : 'light'}
      className={`bula-panel flex flex-col overflow-hidden rounded-2xl border ${theme.borderCard} ${theme.shadowXl}`}
    >
      <span className="bula-edge-light" aria-hidden="true">
        <span className="bula-edge-light__beam" />
      </span>

      <header
        className={`animate-fade-in-up anim-delay-100 relative z-[3] flex items-center gap-3 px-4 py-3 border-b ${theme.bgNav} ${theme.border}`}
      >
        <span className={`relative grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br ${theme.accent}`}>
          <Bot className="w-5 h-5 text-white" />
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-900/60" />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm font-semibold leading-tight ${theme.text}`}>Bula</span>
          <span className={`block text-xs leading-tight truncate ${theme.textSecondary}`}>
            Nano kava specialist · online
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className={`interactive-btn hover-scale active-press rounded-lg p-1.5 ${theme.textSecondary}`}
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div
        ref={scrollerRef}
        onScroll={trackScrollAnchor}
        aria-live="polite"
        className={`bula-transcript ${transcriptSurface} relative z-[1] flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-2`}
      >
        <Transcript messages={messages} isStreaming={isStreaming} theme={theme} dotColor={dotColor} />

        {showQuickReplies ? (
          <div className="animate-fade-in-up anim-delay-600 flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={requestSample}
              className={`interactive-btn hover-scale-xs active-press inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs ${theme.bgPill} ${theme.borderCta} ${theme.accentText}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Request a free sample
            </button>
            <Link
              to={SAMPLE_LINK}
              onClick={() => trackCTAClick('bula_sample_form', 'chat_widget')}
              className={`interactive-btn hover-scale-xs active-press inline-flex items-center rounded-full border px-3 py-1.5 text-xs ${theme.bgPill} ${theme.borderCard} ${theme.textSecondary}`}
            >
              Open the sample form
            </Link>
          </div>
        ) : null}
      </div>

      <footer className={`relative z-[3] border-t px-3 py-2.5 ${theme.bgNav} ${theme.border}`}>
        <div className="relative flex items-end gap-2">
          {isPickerOpen ? (
            <Suspense fallback={null}>
              <EmojiPicker onSelect={insertEmoji} onDismiss={() => setIsPickerOpen(false)} />
            </Suspense>
          ) : null}

          <button
            type="button"
            onClick={() => setIsPickerOpen((open) => !open)}
            aria-label="Insert emoji"
            aria-expanded={isPickerOpen}
            className={`interactive-btn active-press shrink-0 rounded-lg p-2 ${theme.textSecondary}`}
          >
            <Smile className="w-5 h-5" />
          </button>

          <textarea
            ref={fieldRef}
            rows={1}
            value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask about dosing, stability, MOQs…"
            aria-label="Message Bula"
            className={`flex-1 resize-none rounded-xl border px-3 py-2 text-sm leading-5 focus:outline-none focus:ring-2 ${theme.bgInput} ${theme.borderInput} ${theme.text} ${theme.placeholder} ${theme.focusRing}`}
          />

          <button
            type="button"
            onClick={() => submit(draft)}
            disabled={isStreaming || !draft.trim()}
            aria-label="Send message"
            className={`interactive-btn active-press shrink-0 rounded-xl p-2 text-white bg-gradient-to-br ${theme.accent} disabled:opacity-40`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
