/**
 * @file: functions/lib/digest.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Builds and sends the conversation digest — every Sol chat that got past small talk is
 *     emailed to the team with its transcript and whatever contact details surfaced, whether or
 *     not it produced a lead. See CLAUDE.md § Conversation digests.
 *
 *     ⚠️ RETIRED 2026-08-26. Nothing imports this any more. Stephen replaced the
 *     per-conversation digest with one daily report (functions/lib/dailyReport.js), so the
 *     `sendChatDigest` endpoint was removed from index.js and the browser no longer beacons.
 *     Left on disk rather than deleted only because it is not in git; safe to delete once
 *     committed. See functions/lib/CLAUDE.md § The daily report replaced the digest.
 *
 * @See Also:
 *     functions/lib/leads.js
 *     src/components/chat/useChatDigest.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { defineSecret } = require('firebase-functions/params');
const sgMail = require('@sendgrid/mail');

const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

// Caps are the abuse surface: this endpoint takes visitor-authored text and mails it to us.
const MAX_MESSAGES = 60;
const MAX_MESSAGE_CHARS = 2000;
const MAX_FIELD_CHARS = 200;
const MIN_MESSAGES = 2;
const RATE_LIMIT_MAX = 6;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

const ROLES = new Set(['user', 'model', 'system', 'lead']);

/**
 * Recipients are earned, not default. A conversation that merely timed out goes to Stephen for
 * review; Josh is only copied once the visitor did something deliberate — filled the sample form,
 * or said in words that Sol may pass the chat on. Stephen's rule, 2026-08-25.
 */
const REVIEWER = 'stephen.boyett@cannasolusa.com';
const FOUNDER = 'josh.detzel@cannasolusa.com';

function recipientsFor({ leadSent, shareAuthorized }) {
  return leadSent || shareAuthorized ? [REVIEWER, FOUNDER] : [REVIEWER];
}
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Every value here is visitor-authored or LLM-summarised; see CLAUDE.md § Lead email escaping. */
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const clip = (value, max) => String(value ?? '').slice(0, max);

const rateLimitBuckets = new Map();

/** Same shape as chat.js's limiter, and the same caveat: per-instance and best-effort. */
function rateLimitDigest(ip, now = Date.now()) {
  const key = ip || 'unknown';
  const hits = (rateLimitBuckets.get(key) || []).filter((at) => now - at < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) return { ok: false };
  hits.push(now);
  rateLimitBuckets.set(key, hits);
  return { ok: true };
}

/**
 * Everything a rejection may be logged with. Deliberately excludes message text: the log line
 * lands in Cloud Logging and the text is visitor-authored.
 */
function summariseDigest(payload) {
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  return {
    received: messages.length,
    visitorTurns: messages.filter((m) => m?.role === 'user').length,
    page: clip(payload?.page, MAX_FIELD_CHARS),
  };
}

/**
 * Rejects anything not worth mailing, and normalises what is. Returning `{ ok: false }` for a
 * short conversation is the main volume control — most visits open Sol and say nothing.
 * Every rejection carries a distinct `error` code so the 204s are greppable in Cloud Logging.
 */
function validateDigest(payload) {
  const counts = summariseDigest(payload);
  const messages = Array.isArray(payload?.messages) ? payload.messages : null;
  if (!messages) return { ok: false, error: 'messages-not-an-array', ...counts };

  const cleaned = messages
    .filter((m) => m && ROLES.has(m.role) && typeof m.text === 'string' && m.text.trim())
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, text: clip(m.text.trim(), MAX_MESSAGE_CHARS) }));

  if (cleaned.length < MIN_MESSAGES) return { ok: false, error: 'conversation-too-short', ...counts };
  if (!cleaned.some((m) => m.role === 'user')) return { ok: false, error: 'no-visitor-turns', ...counts };

  const contactIn = payload?.contact || {};
  const contact = ['name', 'company', 'email', 'phone'].reduce((acc, key) => {
    const value = clip(contactIn[key], MAX_FIELD_CHARS).trim();
    if (value) acc[key] = value;
    return acc;
  }, {});

  return {
    ok: true,
    ...counts,
    digest: {
      messages: cleaned,
      contact,
      page: counts.page,
      leadSent: Boolean(payload?.leadSent),
      shareAuthorized: Boolean(payload?.shareAuthorized),
      reason: ['timeout', 'closed', 'lead'].includes(payload?.reason) ? payload.reason : 'closed',
    },
  };
}

const ROLE_LABEL = { user: 'Visitor', model: 'Sol', system: 'System', lead: 'Lead card' };
const ROLE_COLOR = { user: '#0f766e', model: '#334155', system: '#94a3b8', lead: '#b45309' };

function transcriptHtml(messages) {
  return messages.map((m) => `
    <tr>
      <td style="padding:6px 10px;vertical-align:top;white-space:nowrap;color:${ROLE_COLOR[m.role]};font-weight:600;font-size:13px;">
        ${escapeHtml(ROLE_LABEL[m.role])}
      </td>
      <td style="padding:6px 10px;vertical-align:top;font-size:13px;color:#1f2937;">
        ${escapeHtml(m.text).replace(/\n/g, '<br>')}
      </td>
    </tr>`).join('');
}

function contactHtml(contact) {
  const rows = Object.entries(contact);
  if (rows.length === 0) {
    return '<p style="color:#6b7280;font-size:13px;margin:0;">No contact details were given.</p>';
  }
  return `<ul style="margin:0;padding-left:18px;font-size:13px;color:#1f2937;">${
    rows.map(([key, value]) =>
      `<li><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</li>`).join('')
  }</ul>`;
}

function buildDigestEmail(digest) {
  const { messages, contact, page, leadSent, shareAuthorized } = digest;
  const visitorTurns = messages.filter((m) => m.role === 'user').length;
  const outcome = leadSent
    ? 'Lead submitted'
    : (shareAuthorized ? 'Visitor asked us to follow up' : 'No lead submitted');
  const identity = contact.company || contact.name || 'Anonymous visitor';

  const subject = `[Sol chat] ${identity} — ${visitorTurns} message${visitorTurns === 1 ? '' : 's'}, ${outcome}`;

  const text = [
    `Sol conversation digest`,
    `Outcome: ${outcome}`,
    `Page: ${page || 'unknown'}`,
    `Visitor turns: ${visitorTurns}`,
    '',
    'Contact:',
    Object.keys(contact).length
      ? Object.entries(contact).map(([k, v]) => `  ${k}: ${v}`).join('\n')
      : '  none given',
    '',
    'Transcript:',
    ...messages.map((m) => `  ${ROLE_LABEL[m.role]}: ${m.text}`),
  ].join('\n');

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:680px;margin:0 auto;">
    <div style="background:#0f172a;padding:18px 20px;border-radius:10px 10px 0 0;">
      <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;">Sol conversation digest</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">
        ${escapeHtml(outcome)} &middot; ${visitorTurns} visitor message${visitorTurns === 1 ? '' : 's'}
        &middot; ${escapeHtml(page || 'unknown page')}
      </p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px;padding:18px 20px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a;">Contact</p>
      ${contactHtml(contact)}
      <p style="margin:18px 0 6px;font-size:13px;font-weight:700;color:#0f172a;">Transcript</p>
      <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;">
        ${transcriptHtml(messages)}
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#6b7280;">
        Sent automatically so the team can see how Sol is handling real conversations. The visitor
        is not told this email exists.
      </p>
    </div>
  </div>`;

  return {
    to: recipientsFor(digest),
    from: { email: 'do-not-reply@enjoynano.com', name: 'EnjoyNano - Sol' },
    ...(contact.email ? { replyTo: contact.email } : {}),
    subject,
    text,
    html,
  };
}

async function sendDigest(digest) {
  sgMail.setApiKey(sendgridApiKey.value());
  await sgMail.send(buildDigestEmail(digest));
}

module.exports = {
  sendgridApiKey,
  recipientsFor,
  REVIEWER,
  FOUNDER,
  summariseDigest,
  validateDigest,
  buildDigestEmail,
  sendDigest,
  rateLimitDigest,
  MIN_MESSAGES,
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
};
