/**
 * @file: functions/lib/dailyReport.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Builds and sends the once-a-day review of every Sol conversation, read from Firestore
 *     rather than from the browser. It replaced the per-conversation digest beacon, so it is now
 *     the ONLY path a conversation takes to a human — which is why it sends on silent days and
 *     retries on failure. See CLAUDE.md § The daily report replaced the digest.
 *
 * @See Also:
 *     functions/lib/chatStore.js
 *     functions/lib/chatLeads.js
 *     functions/index.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const sgMail = require('@sendgrid/mail');
const { sendgridApiKey } = require('./leads');
const { chatDb, COLLECTION: SESSIONS_COLLECTION } = require('./chatStore');
const { LEADS_COLLECTION } = require('./chatLeads');

const REPORT_RECIPIENT = 'stephen.boyett@cannasolusa.com';
const REPORT_SENDER = { email: 'do-not-reply@enjoynano.com', name: 'EnjoyNano - Sol' };

const WINDOW_HOURS = 24;
const RETRY_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 2000;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Every transcript line is visitor-authored; see CLAUDE.md § Lead email escaping. */
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const ROLE_LABEL = { user: 'Visitor', model: 'Sol' };
const ROLE_COLOR = { user: '#0f766e', model: '#334155' };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Firestore hands back Timestamp; a fake or a fixture hands back Date. Both must render. */
const toDate = (value) => (value && typeof value.toDate === 'function' ? value.toDate() : value);

function reportWindow(now = new Date()) {
  const until = new Date(now.getTime());
  return { since: new Date(until.getTime() - WINDOW_HOURS * 60 * 60 * 1000), until };
}

const visitorTurns = (messages) =>
  (Array.isArray(messages) ? messages : []).filter((m) => m?.role === 'user').length;

/**
 * Joins each conversation to its lead. A session with no visitor turn is dropped for the same
 * reason the digest had a floor: most visits open Sol and say nothing.
 */
function summariseReport({ sessions = [], leads = [], window }) {
  const leadBySession = new Map(leads.map((l) => [l.sessionId, l]));

  const rows = sessions
    .filter((s) => visitorTurns(s.messages) > 0)
    .map((s) => ({
      sessionId: s.sessionId,
      page: s.page || 'unknown',
      turnCount: s.turnCount || (s.messages || []).length,
      visitorTurns: visitorTurns(s.messages),
      startedAt: toDate(s.createdAt),
      messages: Array.isArray(s.messages) ? s.messages : [],
      lead: leadBySession.get(s.sessionId) || null,
    }))
    .sort((a, b) => (a.startedAt?.getTime() || 0) - (b.startedAt?.getTime() || 0));

  const withLead = rows.filter((r) => r.lead);
  return {
    window,
    rows,
    conversations: rows.length,
    confirmedLeads: withLead.filter((r) => r.lead.confirmed === true).length,
    extractedOnly: withLead.filter((r) => r.lead.confirmed !== true).length,
  };
}

const dayLabel = (date) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', month: 'short', day: 'numeric',
  }).format(date);

function leadLine(lead) {
  if (!lead) return '  no contact details captured';
  const parts = ['name', 'company', 'email', 'phone', 'interest']
    .filter((k) => lead[k])
    .map((k) => `${k}: ${lead[k]}`);
  const status = lead.confirmed === true
    ? 'SUBMITTED by the visitor'
    : 'extracted by Sol, NOT submitted (unconfirmed)';
  return `  ${status}\n  ${parts.join('\n  ') || 'no fields'}`;
}

function transcriptText(messages) {
  return messages.map((m) => `    ${ROLE_LABEL[m.role] || m.role}: ${m.text}`).join('\n');
}

function transcriptHtml(messages) {
  return messages.map((m) => `
    <tr>
      <td style="padding:5px 9px;vertical-align:top;white-space:nowrap;color:${ROLE_COLOR[m.role] || '#94a3b8'};font-weight:600;font-size:12px;">
        ${escapeHtml(ROLE_LABEL[m.role] || m.role)}
      </td>
      <td style="padding:5px 9px;vertical-align:top;font-size:12px;color:#1f2937;">
        ${escapeHtml(m.text).replace(/\n/g, '<br>')}
      </td>
    </tr>`).join('');
}

function leadHtml(lead) {
  if (!lead) {
    return '<p style="margin:0;font-size:12px;color:#6b7280;">No contact details captured.</p>';
  }
  const confirmed = lead.confirmed === true;
  const rows = ['name', 'company', 'email', 'phone', 'interest']
    .filter((k) => lead[k])
    .map((k) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(lead[k])}</li>`)
    .join('');
  return `
    <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${confirmed ? '#0f766e' : '#b45309'};">
      ${confirmed ? 'SUBMITTED by the visitor' : 'Extracted by Sol — NOT submitted (unconfirmed)'}
    </p>
    <ul style="margin:0;padding-left:18px;font-size:12px;color:#1f2937;">${rows || '<li>no fields</li>'}</ul>`;
}

function buildReportEmail(report) {
  const { conversations, confirmedLeads, extractedOnly, rows, window } = report;
  const day = dayLabel(window.until);

  const subject = conversations === 0
    ? `[Sol daily] ${day} — no conversations`
    : `[Sol daily] ${day} — ${conversations} conversation${conversations === 1 ? '' : 's'}, `
      + `${confirmedLeads} submitted, ${extractedOnly} unconfirmed`;

  const text = [
    `Sol daily report — ${day}`,
    `Window: ${window.since.toISOString()} to ${window.until.toISOString()}`,
    `Conversations: ${conversations}`,
    `Leads submitted: ${confirmedLeads}`,
    `Contact details captured but not submitted: ${extractedOnly}`,
    '',
    ...(conversations === 0
      ? ['No conversations in this window. (This report is sent daily either way, so silence',
         'here means a quiet day rather than a broken job.)']
      : rows.flatMap((r) => [
          `--- ${r.page} · ${r.visitorTurns} visitor message${r.visitorTurns === 1 ? '' : 's'} ---`,
          leadLine(r.lead),
          '  Transcript:',
          transcriptText(r.messages),
          '',
        ])),
  ].join('\n');

  const body = conversations === 0
    ? `<p style="margin:0;font-size:13px;color:#6b7280;">No conversations in this window.
       This report goes out daily either way, so a quiet inbox means a quiet day rather than a
       broken job.</p>`
    : rows.map((r) => `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:14px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0f172a;">
          ${escapeHtml(r.page)}
          <span style="font-weight:400;color:#6b7280;">
            &middot; ${r.visitorTurns} visitor message${r.visitorTurns === 1 ? '' : 's'}
          </span>
        </p>
        ${leadHtml(r.lead)}
        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;margin-top:10px;">
          ${transcriptHtml(r.messages)}
        </table>
      </div>`).join('');

  const html = `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:720px;margin:0 auto;">
    <div style="background:#0f172a;padding:18px 20px;border-radius:10px 10px 0 0;">
      <p style="margin:0;color:#ffffff;font-size:16px;font-weight:700;">Sol daily report &middot; ${escapeHtml(day)}</p>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">
        ${conversations} conversation${conversations === 1 ? '' : 's'} &middot;
        ${confirmedLeads} submitted &middot; ${extractedOnly} unconfirmed
      </p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 10px 10px;padding:18px 20px;">
      ${body}
    </div>
  </div>`;

  return { to: [REPORT_RECIPIENT], from: REPORT_SENDER, subject, text, html };
}

/**
 * SendGrid's 202 confirms ACCEPTANCE, not delivery — true receipt needs the Event Webhook, which
 * this does not implement. What it does guarantee is that a transient failure is retried rather
 * than dropping a day's only report on the floor.
 */
async function sendWithRetry(send, { attempts = RETRY_ATTEMPTS, delayMs = RETRY_BASE_DELAY_MS } = {}) {
  let lastError = 'unknown';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await send();
      const status = Array.isArray(response) ? response[0]?.statusCode : response?.statusCode;
      if (status === undefined || (status >= 200 && status < 300)) {
        return { ok: true, attempts: attempt, statusCode: status };
      }
      lastError = `SendGrid returned ${status}`;
    } catch (error) {
      lastError = error.message;
    }

    console.error(`[dailyReport] send attempt ${attempt}/${attempts} failed: ${lastError}`);
    if (attempt < attempts) await sleep(delayMs * 2 ** (attempt - 1));
  }

  return { ok: false, attempts, error: lastError };
}

/**
 * Reads the window's conversations, then fetches exactly the lead documents that belong to them.
 * Leads are fetched by id rather than queried by date: a lead's own timestamps can sit outside
 * the window (Sol extracted it yesterday, the visitor submitted today) and it would be missed.
 */
async function collectReport({ db = chatDb(), now = new Date() }) {
  const window = reportWindow(now);

  const snapshot = await db.collection(SESSIONS_COLLECTION)
    .where('createdAt', '>=', window.since)
    .get();
  const sessions = snapshot.docs.map((doc) => doc.data());

  if (sessions.length === 0) return summariseReport({ sessions: [], leads: [], window });

  const refs = sessions.map((s) => db.collection(LEADS_COLLECTION).doc(s.sessionId));
  const leadDocs = await db.getAll(...refs);
  const leads = leadDocs.filter((doc) => doc.exists).map((doc) => doc.data());

  return summariseReport({ sessions, leads, window });
}

/** Sends the report, retrying transient failures. Returns the outcome rather than throwing. */
async function sendDailyReport(report) {
  sgMail.setApiKey(sendgridApiKey.value());
  const mail = buildReportEmail(report);
  return sendWithRetry(() => sgMail.send(mail));
}

module.exports = {
  REPORT_RECIPIENT,
  REPORT_SENDER,
  WINDOW_HOURS,
  RETRY_ATTEMPTS,
  reportWindow,
  summariseReport,
  buildReportEmail,
  sendWithRetry,
  collectReport,
  sendDailyReport,
  escapeHtml,
};
