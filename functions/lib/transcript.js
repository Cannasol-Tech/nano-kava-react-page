/**
 * @file: functions/lib/transcript.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Renders a stored Sol conversation for human eyes — plain text, an HTML block, and the
 *     markdown that rides along as an email attachment. Shared by the lead email and the daily
 *     report so a transcript reads the same wherever it surfaces, and so the escaping rule has
 *     exactly one home: every line is visitor-authored, so nothing is interpolated raw.
 *
 * @See Also:
 *     functions/lib/leads.js
 *     functions/lib/dailyReport.js
 *     functions/lib/chatStore.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Every transcript line is visitor-authored; see CLAUDE.md § Lead email escaping. */
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const ROLE_LABEL = { user: 'Visitor', model: 'Sol', system: 'System' };
const ROLE_COLOR = { user: '#0f766e', model: '#334155', system: '#94a3b8' };

const labelFor = (role) => ROLE_LABEL[role] || role;

/** Firestore hands back Timestamp; a fake or a fixture hands back Date. Both must render. */
const toDate = (value) => (value && typeof value.toDate === 'function' ? value.toDate() : value);

const asMessages = (messages) =>
  (Array.isArray(messages) ? messages : []).filter((m) => m && typeof m.text === 'string');

/** Indented under a heading, which is how both the daily report and the lead email use it. */
function transcriptText(messages, indent = '    ') {
  return asMessages(messages).map((m) => `${indent}${labelFor(m.role)}: ${m.text}`).join('\n');
}

/** Table rows — the caller owns the surrounding <table> and its width. */
function transcriptRowsHtml(messages) {
  return asMessages(messages).map((m) => `
    <tr>
      <td style="padding:5px 9px;vertical-align:top;white-space:nowrap;color:${ROLE_COLOR[m.role] || '#94a3b8'};font-weight:600;font-size:12px;">
        ${escapeHtml(labelFor(m.role))}
      </td>
      <td style="padding:5px 9px;vertical-align:top;font-size:12px;color:#1f2937;">
        ${escapeHtml(m.text).replace(/\n/g, '<br>')}
      </td>
    </tr>`).join('');
}

/** A self-contained block, for callers that just want the conversation dropped in. */
function transcriptHtml(messages) {
  if (asMessages(messages).length === 0) {
    return '<p style="margin:0;font-size:12px;color:#6b7280;">No transcript was stored for this conversation.</p>';
  }
  return `<table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:6px;">`
    + `${transcriptRowsHtml(messages)}</table>`;
}

/**
 * The attachment. Markdown rather than .txt so it opens readable everywhere and pastes straight
 * into a prompt or a doc — the same reason the training block downstream is markdown.
 */
function transcriptMarkdown({ sessionId, page, startedAt, lead, messages }) {
  const started = toDate(startedAt);
  const header = [
    `# Sol conversation — ${sessionId || 'unknown session'}`,
    '',
    `- Page: ${page || 'unknown'}`,
    `- Started: ${started instanceof Date && !Number.isNaN(started.getTime()) ? started.toISOString() : 'unknown'}`,
    `- Messages: ${asMessages(messages).length}`,
  ];

  if (lead) {
    const fields = ['name', 'company', 'email', 'phone', 'interest', 'reason']
      .filter((k) => lead[k])
      .map((k) => `- ${k}: ${lead[k]}`);
    if (fields.length) header.push('', '## Lead', '', ...fields);
  }

  const body = asMessages(messages).map((m) => `**${labelFor(m.role)}:** ${m.text}`).join('\n\n');

  return `${header.join('\n')}\n\n## Transcript\n\n${body || '_No transcript stored._'}\n`;
}

/** SendGrid takes attachment content base64-encoded, never raw. */
function transcriptAttachment(conversation) {
  const id = conversation?.sessionId || 'session';
  return {
    content: Buffer.from(transcriptMarkdown(conversation), 'utf8').toString('base64'),
    filename: `sol-conversation-${String(id).replace(/[^A-Za-z0-9_-]/g, '')}.md`,
    type: 'text/markdown',
    disposition: 'attachment',
  };
}

module.exports = {
  ROLE_LABEL,
  ROLE_COLOR,
  escapeHtml,
  labelFor,
  toDate,
  transcriptText,
  transcriptRowsHtml,
  transcriptHtml,
  transcriptMarkdown,
  transcriptAttachment,
};
