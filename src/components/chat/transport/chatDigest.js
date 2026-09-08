/**
 * @file: src/components/chat/transport/chatDigest.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Packs a Sol conversation for the team digest and posts it with sendBeacon, which is the
 *     only transport that survives the page being closed. Who receives it is decided server-side
 *     from `leadSent` / `shareAuthorized`. See functions/lib/CLAUDE.md § Conversation digests.
 *
 *     ⚠️ RETIRED 2026-08-26. Nothing imports this any more. Stephen replaced the
 *     per-conversation digest with one daily report (functions/lib/dailyReport.js), so the
 *     `sendChatDigest` endpoint was removed from index.js and the browser no longer beacons.
 *     Left on disk rather than deleted only because it is not in git; safe to delete once
 *     committed. See functions/lib/CLAUDE.md § The daily report replaced the digest.
 *
 * @See Also:
 *     functions/lib/digest.js
 *     src/components/chat/panel/ChatPanel.jsx
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

export const DIGEST_URL = import.meta.env.DEV
  ? '/api/sendChatDigest'
  : 'https://us-central1-nano-kava-landing-page.cloudfunctions.net/sendChatDigest';

/** Matches the server's floor, so a visitor who opened Sol and said nothing sends nothing. */
export const MIN_VISITOR_TURNS = 1;

const CONTACT_KEYS = ['name', 'company', 'email', 'phone'];

/** How long a conversation sits idle before it counts as over. */
export const IDLE_TIMEOUT_MS = 3 * 60 * 1000;

/**
 * The lead card holds the best contact details we ever see — the model extracted them and the
 * visitor may have corrected them — so they are read from the last lead message, sent or not.
 */
export function extractContact(messages) {
  const lead = [...messages].reverse().find((m) => m.role === 'lead' && m.fields);
  if (!lead) return {};
  return CONTACT_KEYS.reduce((acc, key) => {
    const value = lead.fields[key];
    if (value && String(value).trim()) acc[key] = String(value).trim();
    return acc;
  }, {});
}

/** Lead cards carry fields rather than prose, so they are summarised rather than transcribed. */
const toWire = (message) => {
  if (message.role !== 'lead') return { role: message.role, text: message.text || '' };
  const fields = message.fields || {};
  return {
    role: 'lead',
    text: `[lead card shown] interest: ${fields.interest || '—'}; why now: ${fields.reason || '—'}`,
  };
};

export function buildDigest(messages, { page, leadSent = false, shareAuthorized = false, reason = 'closed' } = {}) {
  const wire = (messages || []).map(toWire).filter((m) => m.text.trim());
  const visitorTurns = wire.filter((m) => m.role === 'user').length;
  if (visitorTurns < MIN_VISITOR_TURNS) return null;

  return {
    messages: wire,
    contact: extractContact(messages || []),
    page: page || (typeof window !== 'undefined' ? window.location.pathname : ''),
    leadSent,
    shareAuthorized,
    reason,
  };
}

/**
 * Fire and forget. sendBeacon cannot report failure and we do not want it to: a digest is
 * telemetry for us, and nothing about the visitor's experience should depend on it.
 */
export function sendDigestBeacon(digest) {
  if (!digest || typeof navigator === 'undefined' || !navigator.sendBeacon) return false;
  try {
    // text/plain is CORS-safelisted; application/json preflights, and a preflight during unload is dropped.
    const blob = new Blob([JSON.stringify(digest)], { type: 'text/plain;charset=UTF-8' });
    return navigator.sendBeacon(DIGEST_URL, blob);
  } catch {
    return false;
  }
}
