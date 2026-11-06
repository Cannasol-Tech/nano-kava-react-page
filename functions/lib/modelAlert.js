/**
 * @file: functions/lib/modelAlert.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Tells a human within minutes when Gemini starts refusing Sol's calls. The `chat` request
 *     path records each 4xx into one Firestore document; the scheduled `sendModelAlerts` emails
 *     once per incident and reminds daily while it lasts. Split this way so `chat` never holds
 *     a SendGrid key. See lib/CLAUDE.md § A refused model call alerts within minutes.
 *
 * @See Also:
 *     functions/index.js
 *     functions/lib/dailyReport.js
 *     functions/lib/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const sgMail = require('@sendgrid/mail');
const { sendgridApiKey } = require('./leads');
const { chatDb } = require('./chatStore');
const { REPORT_RECIPIENT, REPORT_SENDER, sendWithRetry, escapeHtml } = require('./dailyReport');

const ALERT_COLLECTION = 'opsAlerts';
const ALERT_DOC = 'gemini';

/** A failure after this much quiet is a new incident and gets its own first email. */
const INCIDENT_GAP_MS = 60 * 60 * 1000;
/** While an incident lasts, one reminder a day. More would be noise; none would be silence. */
const REMIND_MS = 24 * 60 * 60 * 1000;
const MAX_MESSAGE_CHARS = 500;

/** Firestore hands back Timestamps; tests and fresh writes hand back Dates. */
function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * The HTTP status of a refused model call, or null. Only 4xx counts: those are ours to fix
 * (billing, key, quota, a malformed request) and do not clear by themselves. A 5xx is Google
 * having a bad minute, and an error with no status is not an API refusal at all.
 */
function modelErrorStatus(error) {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 400 && status < 500 ? status : null;
}

/** Files one refused call against the open incident, or opens one. Never throws. */
async function recordModelError({ db = chatDb(), error, now = new Date() }) {
  const status = modelErrorStatus(error);
  if (status === null) return { ok: true, recorded: false };

  try {
    const ref = db.collection(ALERT_COLLECTION).doc(ALERT_DOC);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;
      const lastSeen = toDate(existing?.lastSeenAt);
      const open = Boolean(lastSeen) && now.getTime() - lastSeen.getTime() < INCIDENT_GAP_MS;

      tx.set(ref, {
        firstSeenAt: open ? toDate(existing.firstSeenAt) : now,
        lastSeenAt: now,
        count: open ? (Number(existing.count) || 0) + 1 : 1,
        lastStatus: status,
        lastMessage: String(error?.message || '').slice(0, MAX_MESSAGE_CHARS),
        // A new incident has not been emailed; an open one keeps what it had.
        notifiedAt: open ? toDate(existing.notifiedAt) : null,
      });
    });
    return { ok: true, recorded: true, status };
  } catch (writeError) {
    // A lost alert record must never cost the visitor anything more than they already lost.
    console.error('[modelAlert] could not record model error:', writeError.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/** 'first', 'reminder', or null. */
function alertDue(incident, now = new Date()) {
  if (!incident) return null;
  const notified = toDate(incident.notifiedAt);
  if (!notified) return 'first';
  const lastSeen = toDate(incident.lastSeenAt);
  if (lastSeen && lastSeen > notified && now.getTime() - notified.getTime() >= REMIND_MS) {
    return 'reminder';
  }
  return null;
}

function adviceFor(status) {
  if (status === 402 || status === 429) {
    return 'Most likely billing or quota: the AI Studio project behind GOOGLE_AI_API_KEY is out of '
      + 'credit or rate-limited. Check https://ai.studio/projects.';
  }
  if (status === 401 || status === 403) {
    return 'Most likely the API key: GOOGLE_AI_API_KEY was revoked, restricted or rotated.';
  }
  if (status === 404) {
    return 'Most likely the model: the MODEL name in functions/lib/chat.js no longer exists.';
  }
  return 'Most likely a request Gemini rejects: check a recent change to functions/lib/chat.js '
    + 'and run: npx firebase functions:log --only chat --project nano-kava-landing-page --lines 40';
}

const formatEt = (date) => (date
  ? date.toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) + ' ET'
  : 'unknown');

function buildAlertEmail(incident, kind) {
  const status = incident.lastStatus;
  const count = Number(incident.count) || 0;
  const first = formatEt(toDate(incident.firstSeenAt));
  const last = formatEt(toDate(incident.lastSeenAt));
  const turns = `${count} chat turn${count === 1 ? '' : 's'}`;

  const subject = kind === 'reminder'
    ? `Sol is STILL failing: Gemini ${status}, ${turns} since ${first}`
    : `Sol is failing: Gemini returned ${status}`;

  const lines = [
    kind === 'reminder'
      ? 'Sol is still not answering. Every visitor is getting the "can\'t reach my knowledge base" reply.'
      : 'Gemini refused a Sol chat turn. Visitors are getting the "can\'t reach my knowledge base" reply instead of an answer.',
    '',
    `Status: ${status}`,
    `Gemini said: ${incident.lastMessage || '(no message)'}`,
    `Failed turns: ${count}`,
    `First failure: ${first}`,
    `Latest failure: ${last}`,
    '',
    adviceFor(status),
    '',
    'You will get one reminder a day while this continues. A failure after an hour with none starts a new alert.',
  ];

  const text = lines.join('\n');
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5">${
    lines.map((line) => (line ? `<p style="margin:0 0 6px">${escapeHtml(line)}</p>` : '<br>')).join('')
  }</div>`;

  return { to: [REPORT_RECIPIENT], from: REPORT_SENDER, subject, text, html };
}

async function sendAlertEmail(mail) {
  sgMail.setApiKey(sendgridApiKey.value());
  return sendWithRetry(() => sgMail.send(mail));
}

/**
 * Emails the open incident if it is due. Claims the send in a transaction first so two
 * overlapping runs cannot both send, and gives the claim back if the send fails so the next run
 * tries again.
 */
async function sweepModelAlert({ db = chatDb(), send = sendAlertEmail, now = new Date() } = {}) {
  const ref = db.collection(ALERT_COLLECTION).doc(ALERT_DOC);
  let claimed = null;

  try {
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const incident = snapshot.exists ? snapshot.data() : null;
      const kind = alertDue(incident, now);
      if (!kind) return;
      claimed = { kind, incident, previous: toDate(incident.notifiedAt) };
      tx.set(ref, { ...incident, notifiedAt: now });
    });
  } catch (error) {
    return { ok: false, reason: 'read-failed', error: error.message };
  }

  if (!claimed) return { ok: true, sent: null };

  const result = await send(buildAlertEmail(claimed.incident, claimed.kind));
  if (result?.ok) return { ok: true, sent: claimed.kind };

  try {
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      tx.set(ref, { ...snapshot.data(), notifiedAt: claimed.previous });
    });
  } catch (error) {
    console.error('[modelAlert] could not release the claim:', error.message);
  }
  return { ok: false, reason: 'send-failed', error: result?.error || 'unknown' };
}

module.exports = {
  ALERT_COLLECTION,
  ALERT_DOC,
  INCIDENT_GAP_MS,
  REMIND_MS,
  modelErrorStatus,
  recordModelError,
  alertDue,
  buildAlertEmail,
  sweepModelAlert,
};
