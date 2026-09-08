/**
 * @file: src/components/chat/lead/LeadCard.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Inline transcript card for a `lead_proposed` frame. The visitor confirms a name and an
 *     email, an optional company, taps the sample lines they want, and only an explicit Send
 *     posts to the same sendContactEmail function the contact form uses. Runs a sending / sent /
 *     failed state machine whose animations are transform and opacity only — see
 *     CLAUDE.md § Lead card.
 *
 * @See Also:
 *     src/components/chat/panel/ChatPanel.jsx
 *     src/components/ContactPage.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Send, X } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import themesConfig from '../../../theme/themes';
import { trackChatLeadSubmitted, trackEvent } from '../../../utils/gtag';
import { chatSessionId } from '../transport/chatSession';

const CONTACT_URL = import.meta.env.DEV
  ? '/api/sendContactEmail'
  : 'https://us-central1-nano-kava-landing-page.cloudfunctions.net/sendContactEmail';

const INQUIRY_TYPE = 'Request Samples, Sol Chat';
const SALES_PHONE = '(216) 921-2240';

const SHORT_FIELDS = [
  { key: 'name', label: 'Name', type: 'text', autoComplete: 'name' },
  { key: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
];

/** Optional, and full-width under the pair — asking for it must never gate Send. */
const COMPANY_FIELD = { key: 'company', label: 'Company', type: 'text', autoComplete: 'organization' };

/**
 * Every line ships in the same box, so the card offers all of them — CLAUDE.md § Cross-selling
 * the box. `label` is the pill; `interest` is the catalogue name that reaches Josh's inbox.
 */
export const SAMPLE_LINES = [
  { key: 'kava', label: 'Nano Kava', interest: 'Kavalactone Nanoemulsion' },
  { key: 'lions', label: "Nano Lion's Mane", interest: "Lion's Mane Nanoemulsion" },
  { key: 'reishi', label: 'Nano Reishi', interest: 'Reishi Nanoemulsion' },
  { key: 'cordyceps', label: 'Nano Cordyceps', interest: 'Cordyceps Nanoemulsion' },
  { key: 'bitter', label: 'Bitter Blocker', interest: 'Bitter Blocker' },
];

// Sol writes shorthand, not catalogue names; 'mushroom' names three lines at once.
const LINE_ALIASES = {
  kava: ['kava', 'kavalactone'],
  lions: ['lion', 'mushroom'],
  reishi: ['reishi', 'mushroom'],
  cordyceps: ['cordyceps', 'mushroom'],
  bitter: ['bitter'],
};

export function linesFromInterest(interest) {
  const text = (interest || '').toLowerCase();
  const matched = SAMPLE_LINES.filter(
    ({ key, interest: name }) =>
      text.includes(name.toLowerCase()) || LINE_ALIASES[key].some((alias) => text.includes(alias))
  ).map(({ key }) => key);
  return matched.length ? matched : ['kava'];
}

const labelsFor = (keys) =>
  SAMPLE_LINES.filter(({ key }) => keys.has(key)).map(({ interest }) => interest).join(', ');

const BURST_DOTS = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2;
  return { x: Math.round(Math.cos(angle) * 34), y: Math.round(Math.sin(angle) * 34) };
});

const normalize = (fields) =>
  [...SHORT_FIELDS, COMPANY_FIELD].reduce(
    (draft, field) => ({ ...draft, [field.key]: fields[field.key] ?? '' }),
    { conversation_summary: fields.conversation_summary ?? '' }
  );

const isFilled = (value) => Boolean(value && value.trim());

const buildMessage = (interest, summary, note) =>
  [interest, note && `--- Anything else ---\n${note}`, `--- Conversation summary ---\n${summary}`]
    .filter(Boolean)
    .join('\n\n');

/** Sol's own turn, so the beat before the email reads as him and not as form chrome. */
const followUpLine = (name) =>
  `${name ? `Got it, ${name.trim().split(' ')[0]}. ` : 'Got it. '}Anything else Josh should know before I pass this on? Add it on the card, then hit Confirm & send.`;

function SentConfirmation({ theme, name }) {
  return (
    <div className="sol-lead-sent relative overflow-hidden rounded-2xl border px-4 py-4 text-center">
      <span className="sol-burst" aria-hidden="true">
        {BURST_DOTS.map((dot, index) => (
          <span
            key={index}
            className="sol-burst__dot"
            style={{ '--sol-burst-x': `${dot.x}px`, '--sol-burst-y': `${dot.y}px`, animationDelay: `${index * 18}ms` }}
          />
        ))}
      </span>
      <span className="sol-check-ring" aria-hidden="true" />
      <span className="relative grid place-items-center mx-auto w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500">
        <span className="sol-check" aria-hidden="true">
          <span className="sol-check__short" />
          <span className="sol-check__long" />
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

export default function LeadCard({ fields, onFollowUp }) {
  const { isDark } = useTheme();
  const theme = isDark ? themesConfig.dark : themesConfig.light;

  const [draft, setDraft] = useState(() => normalize(fields));
  const [lines, setLines] = useState(() => new Set(linesFromInterest(fields.interest)));
  const [status, setStatus] = useState('editing');
  const [note, setNote] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    trackEvent('sol_lead_proposed', { has_email: isFilled(fields.email), has_phone: isFilled(fields.phone) });
  }, [fields.email, fields.phone]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const interest = useMemo(() => labelsFor(lines), [lines]);
  const canSend = isFilled(draft.name) && isFilled(draft.email) && lines.size > 0;

  const editField = useCallback((key, value) => setDraft((prev) => ({ ...prev, [key]: value })), []);

  const toggleLine = useCallback((key) => {
    setLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    trackEvent('sol_lead_addon_toggled', { add_on: key });
  }, []);

  const cancel = useCallback(() => {
    trackEvent('sol_lead_cancelled', { page: window.location.pathname });
    setStatus('cancelled');
  }, []);

  /** Nothing leaves until a second, deliberate click — see CLAUDE.md § Sol asks before it sends. */
  const confirm = useCallback(() => {
    if (!canSend || status !== 'editing') return;
    trackEvent('sol_lead_confirm_asked', { lines: lines.size });
    onFollowUp?.(followUpLine(draft.name));
    setStatus('confirming');
  }, [canSend, draft.name, lines.size, onFollowUp, status]);

  const submit = useCallback(async () => {
    if (!canSend || status !== 'confirming') return;
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
          ...(isFilled(draft.company) ? { company: draft.company.trim() } : {}),
          inquiryType: INQUIRY_TYPE,
          interest,
          message: buildMessage(interest, draft.conversation_summary, note.trim()),
          // Marks the stored lead confirmed: a human pressed Send, so it is no longer just
          // Sol's extraction. See functions/lib/CLAUDE.md § The lead record is not the transcript.
          sessionId: chatSessionId(),
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'lead submission failed');
      // Stops the section nudges for the session — see sectionPrompts.js § nextPrompt.
      try { window.sessionStorage.setItem('sol:converted', '1'); } catch { /* private mode */ }
      trackChatLeadSubmitted({ email: draft.email, name: draft.name, company: draft.company });
      setStatus('sent');
    } catch (failure) {
      if (failure.name === 'AbortError') return;
      setStatus('failed');
    }
  }, [canSend, draft, interest, note, status]);

  const hint = useMemo(() => {
    if (status === 'confirming') return 'Nothing has been sent yet — Confirm & send does that.';
    if (!isFilled(draft.name)) return 'Add your name so Josh knows who to greet.';
    if (!isFilled(draft.email)) return 'Add an email so Josh can reply.';
    if (!lines.size) return 'Pick at least one sample to send.';
    return null;
  }, [draft.email, draft.name, lines, status]);

  if (status === 'cancelled') {
    return (
      <p className={`sol-lead-dismissed text-xs text-center py-1 ${theme.textMuted}`}>
        Nothing sent — ask me anything else.
      </p>
    );
  }

  if (status === 'sent') return <SentConfirmation theme={theme} name={draft.name} />;

  const isSending = status === 'sending';
  const isConfirming = status === 'confirming';
  const inputClass = `sol-lead__input w-full rounded-lg border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 ${theme.bgInput} ${theme.borderInput} ${theme.text} ${theme.placeholder} ${theme.focusRing}`;
  const labelClass = `block mb-1 text-[11px] font-semibold uppercase tracking-wide ${theme.textMuted}`;

  return (
    <div
      role="group"
      aria-label="Confirm your details before sending"
      className={`sol-lead ${isSending ? 'sol-lead--sending' : ''} relative overflow-hidden rounded-2xl border px-3.5 py-3.5`}
    >
      <span className="sol-lead__sweep" aria-hidden="true" />

      <p className={`mb-2.5 text-sm font-semibold ${theme.accentText}`}>
        {isConfirming ? 'One more thing, then it goes to Josh' : 'Check these details, then send'}
      </p>

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

      <label className="mt-2 block">
        <span className={labelClass}>
          {COMPANY_FIELD.label} <span className="normal-case opacity-70">(optional)</span>
        </span>
        <input
          type={COMPANY_FIELD.type}
          autoComplete={COMPANY_FIELD.autoComplete}
          value={draft.company}
          disabled={isSending}
          onChange={(event) => editField(COMPANY_FIELD.key, event.target.value)}
          placeholder="Brand or company"
          className={inputClass}
        />
      </label>

      <div className="sol-lead__lines mt-2">
        <p className={`text-[11px] leading-4 ${theme.textMuted}`}>
          They all ship in the same box — tap every sample you want.
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {SAMPLE_LINES.map(({ key, label }) => {
            const on = lines.has(key);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                disabled={isSending}
                onClick={() => toggleLine(key)}
                className={`sol-lead__line${on ? ' sol-lead__line--on' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {isConfirming ? (
        <label className="sol-lead__note mt-2.5 block">
          <span className={labelClass}>
            Anything else for Josh <span className="normal-case opacity-70">(optional)</span>
          </span>
          <textarea
            rows={2}
            autoFocus
            value={note}
            disabled={isSending}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Base, timeline, volume — anything that helps him reply properly."
            className={`${inputClass} resize-none leading-5`}
          />
        </label>
      ) : null}

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
          onClick={isConfirming ? submit : confirm}
          disabled={!canSend || isSending}
          className={`sol-send ${isSending ? 'sol-send--sending' : ''} interactive-btn active-press inline-flex ${isConfirming ? 'w-[148px]' : 'w-[104px]'} items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white bg-gradient-to-br ${theme.accent} disabled:opacity-40`}
        >
          {isSending ? (
            <Loader2 className="sol-spin w-4 h-4" aria-hidden="true" />
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              {isConfirming ? 'Confirm & send' : 'Send'}
            </>
          )}
          <span className="sr-only">
            {isSending ? 'Sending your details' : isConfirming ? 'Confirm and send my details to Cannasol' : 'Review before sending'}
          </span>
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
