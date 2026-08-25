/**
 * @file: src/components/chat/LeadCard.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Inline transcript card for a `lead_proposed` frame. The model extracts the fields, the
 *     visitor corrects them in place, and only an explicit Send posts to the same
 *     sendContactEmail function the contact form uses. Runs a sending / sent / failed state
 *     machine whose animations are transform and opacity only — see CLAUDE.md § Lead card.
 *
 * @See Also:
 *     src/components/chat/ChatPanel.jsx
 *     src/components/ContactPage.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Send, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import themesConfig from '../../theme/themes';
import { trackChatLeadSubmitted, trackEvent } from '../../utils/gtag';

const CONTACT_URL = import.meta.env.DEV
  ? '/api/sendContactEmail'
  : 'https://us-central1-nano-kava-landing-page.cloudfunctions.net/sendContactEmail';

const INQUIRY_TYPE = 'Request Samples, Bula Chat';
const SALES_PHONE = '(216) 921-2240';

const SHORT_FIELDS = [
  { key: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { key: 'company', label: 'Company', type: 'text', autoComplete: 'organization' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  { key: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
];

const LONG_FIELDS = [
  { key: 'interest', label: 'Interest', rows: 2 },
  { key: 'reason', label: 'Why now', rows: 2 },
];

const REQUIRED_KEYS = ['name', 'company', 'interest', 'reason'];

const BURST_DOTS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2;
  return { x: Math.round(Math.cos(angle) * 34), y: Math.round(Math.sin(angle) * 34) };
});

const normalize = (fields) =>
  [...SHORT_FIELDS, ...LONG_FIELDS].reduce(
    (draft, field) => ({ ...draft, [field.key]: fields[field.key] ?? '' }),
    { conversation_summary: fields.conversation_summary ?? '' }
  );

const isFilled = (value) => Boolean(value && value.trim());

const buildMessage = ({ interest, reason, conversation_summary: summary }) =>
  `${interest}\n\n${reason}\n\n--- Conversation summary ---\n${summary}`;

function SentConfirmation({ theme, name }) {
  return (
    <div className={`bula-lead-sent relative overflow-hidden rounded-2xl border px-4 py-4 text-center ${theme.bgHighlightBorder}`}>
      <span className="bula-burst" aria-hidden="true">
        {BURST_DOTS.map((dot, index) => (
          <span
            key={index}
            className="bula-burst__dot"
            style={{ '--bula-burst-x': `${dot.x}px`, '--bula-burst-y': `${dot.y}px`, animationDelay: `${index * 18}ms` }}
          />
        ))}
      </span>
      <span className="bula-check-ring" aria-hidden="true" />
      <span className="relative grid place-items-center mx-auto w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
        <span className="bula-check" aria-hidden="true">
          <span className="bula-check__short" />
          <span className="bula-check__long" />
        </span>
        <Check className="sr-only w-4 h-4" />
      </span>
      <p className={`mt-2 text-sm font-semibold ${theme.text}`}>Sent to Josh</p>
      <p className={`text-xs ${theme.textSecondary}`}>
        {name ? `Thanks, ${name.trim().split(' ')[0]} — ` : ''}you&apos;ll hear back within one business day.
      </p>
    </div>
  );
}

export default function LeadCard({ fields }) {
  const { isDark } = useTheme();
  const theme = isDark ? themesConfig.dark : themesConfig.light;

  const [draft, setDraft] = useState(() => normalize(fields));
  const [status, setStatus] = useState('editing');
  const [showSummary, setShowSummary] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    trackEvent('bula_lead_proposed', { has_email: isFilled(fields.email), has_phone: isFilled(fields.phone) });
  }, [fields.email, fields.phone]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const hasContact = isFilled(draft.email) || isFilled(draft.phone);
  const hasRequired = REQUIRED_KEYS.every((key) => isFilled(draft[key]));
  const canSend = hasContact && hasRequired;

  const editField = useCallback((key, value) => setDraft((prev) => ({ ...prev, [key]: value })), []);

  const cancel = useCallback(() => {
    trackEvent('bula_lead_cancelled', { page: window.location.pathname });
    setStatus('cancelled');
  }, []);

  const submit = useCallback(async () => {
    if (!canSend || status === 'sending') return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('sending');
    try {
      const response = await fetch(CONTACT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          name: draft.name,
          email: draft.email,
          company: draft.company,
          phone: draft.phone,
          inquiryType: INQUIRY_TYPE,
          message: buildMessage(draft),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'lead submission failed');
      trackChatLeadSubmitted({
        email: draft.email,
        name: draft.name,
        phone: draft.phone,
        company: draft.company,
      });
      setStatus('sent');
    } catch (failure) {
      if (failure.name === 'AbortError') return;
      setStatus('failed');
    }
  }, [canSend, draft, status]);

  const hint = useMemo(() => {
    if (!hasRequired) return 'Fill in name, company, interest and why now.';
    if (!hasContact) return 'Add an email or a phone number so Josh can reply.';
    return null;
  }, [hasContact, hasRequired]);

  if (status === 'cancelled') {
    return (
      <p className={`bula-lead-dismissed text-xs text-center py-1 ${theme.textMuted}`}>
        Nothing sent — ask me anything else.
      </p>
    );
  }

  if (status === 'sent') return <SentConfirmation theme={theme} name={draft.name} />;

  const isSending = status === 'sending';
  const inputClass = `w-full rounded-lg border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 ${theme.bgInput} ${theme.borderInput} ${theme.text} ${theme.placeholder} ${theme.focusRing}`;
  const labelClass = `block mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${theme.textMuted}`;

  return (
    <div
      role="group"
      aria-label="Confirm your details before sending"
      className={`bula-lead ${isSending ? 'bula-lead--sending' : ''} relative overflow-hidden rounded-2xl border px-3 py-3 ${theme.bgCardStats} ${theme.borderCta}`}
    >
      <span className="bula-lead__sweep" aria-hidden="true" />

      <p className={`mb-2 text-xs font-semibold ${theme.accentText}`}>Check these details, then send</p>

      <div className="grid grid-cols-2 gap-2">
        {SHORT_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className={labelClass}>{field.label}</span>
            <input
              type={field.type}
              autoComplete={field.autoComplete}
              value={draft[field.key]}
              disabled={isSending}
              onChange={(event) => editField(field.key, event.target.value)}
              placeholder={field.label}
              className={inputClass}
            />
          </label>
        ))}
      </div>

      <div className="mt-2 space-y-2">
        {LONG_FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className={labelClass}>{field.label}</span>
            <textarea
              rows={field.rows}
              value={draft[field.key]}
              disabled={isSending}
              onChange={(event) => editField(field.key, event.target.value)}
              placeholder={field.label}
              className={`${inputClass} resize-none leading-4`}
            />
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setShowSummary((open) => !open)}
        aria-expanded={showSummary}
        className={`mt-2 text-[11px] underline underline-offset-2 ${theme.textSecondary}`}
      >
        {showSummary ? 'Hide conversation summary' : 'Edit conversation summary'}
      </button>

      {showSummary ? (
        <label className="mt-1 block">
          <span className="sr-only">Conversation summary</span>
          <textarea
            rows={4}
            value={draft.conversation_summary}
            disabled={isSending}
            onChange={(event) => editField('conversation_summary', event.target.value)}
            className={`${inputClass} resize-none leading-4`}
          />
        </label>
      ) : null}

      {status === 'failed' ? (
        <p className={`mt-2 text-xs ${theme.textError}`} role="alert">
          That didn&apos;t go through. Try again, or call us at {SALES_PHONE}.
        </p>
      ) : null}

      {hint && status !== 'failed' ? <p className={`mt-2 text-[11px] ${theme.textMuted}`}>{hint}</p> : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!canSend || isSending}
          className={`bula-send ${isSending ? 'bula-send--sending' : ''} interactive-btn active-press inline-flex w-[104px] items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white bg-gradient-to-br ${theme.accent} disabled:opacity-40`}
        >
          {isSending ? (
            <Loader2 className="bula-spin w-4 h-4" aria-hidden="true" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              Send
            </>
          )}
          <span className="sr-only">{isSending ? 'Sending your details' : 'Send my details to Cannasol'}</span>
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={isSending}
          className={`interactive-btn active-press inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs ${theme.textSecondary} disabled:opacity-40`}
        >
          <X className="w-3.5 h-3.5" />
          Not now
        </button>
      </div>
    </div>
  );
}
