/**
 * @file: functions/lib/reviewForm.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The questionnaire the lead email links to, rendered as one self-contained HTML document.
 *     Every question is 1-5 with an optional comment beside it, so a month of reviews can be
 *     averaged and compared rather than read one at a time. Served by a Cloud Function rather
 *     than added to the React app on purpose: it is a private, token-addressed page that must
 *     never be prerendered, listed in routes.js or indexed.
 *
 * @See Also:
 *     functions/lib/solReviews.js
 *     functions/index.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { SCALES, TAGS } = require('./solReviews');
const { escapeHtml, transcriptRowsHtml, toDate } = require('./transcript');

const RATINGS = [1, 2, 3, 4, 5];

const TAG_LABELS = {
  'particle-size': 'particle size', moq: 'MOQ', 'off-topic': 'off topic',
};

const STYLE = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 22px 16px 64px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a; color: #e2e8f0; line-height: 1.5;
  -webkit-text-size-adjust: 100%;
}
main { max-width: 760px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 4px; color: #fff; }
h2 { font-size: 13px; margin: 28px 0 10px; color: #5eead4; text-transform: uppercase; letter-spacing: .08em; }
.sub { margin: 0 0 22px; color: #94a3b8; font-size: 14px; }
.card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 14px; margin-bottom: 14px; }
.card table { width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; }
.meta { font-size: 13px; color: #94a3b8; margin: 0 0 8px; }
.meta strong { color: #e2e8f0; }
.sub-block { margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155; }
.sub-block p { margin: 0 0 4px; }
.msg { white-space: pre-wrap; font-size: 13px; color: #cbd5e1; margin: 0; }

.scale { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 13px 14px; margin-bottom: 10px; }
.scale > p { margin: 0 0 9px; font-size: 15px; font-weight: 600; color: #f1f5f9; }
.row { display: flex; align-items: center; gap: 8px; }
.pills { display: flex; gap: 6px; flex: 1; }
.pills label { flex: 1; }
.pills input { position: absolute; opacity: 0; width: 0; height: 0; }
.pills span {
  display: block; text-align: center; padding: 10px 0; border-radius: 9px; font-size: 15px;
  font-weight: 600; border: 1px solid #475569; background: #0f172a; color: #cbd5e1;
  cursor: pointer; transition: background .15s, border-color .15s, color .15s;
}
.pills input:focus-visible + span { outline: 2px solid #2ECC71; outline-offset: 2px; }
.pills input:checked + span { background: #0d9488; border-color: #2ECC71; color: #fff; }
.ends { display: flex; justify-content: space-between; margin: 6px 2px 0; font-size: 11px; color: #64748b; }
.note { margin-top: 8px; }
.note input {
  width: 100%; padding: 9px 11px; border-radius: 8px; font-size: 14px;
  border: 1px solid #3f4d63; background: #0f172a; color: #e2e8f0; font-family: inherit;
}
.note input::placeholder { color: #64748b; }

.opts { display: flex; flex-wrap: wrap; gap: 8px; }
.opts input { position: absolute; opacity: 0; width: 0; height: 0; }
.opts span {
  display: inline-block; padding: 7px 13px; border-radius: 999px; font-size: 13px;
  border: 1px solid #475569; background: #0f172a; color: #cbd5e1; cursor: pointer;
}
.opts input:checked + span { background: #0d9488; border-color: #2ECC71; color: #fff; font-weight: 600; }
.opts input:focus-visible + span { outline: 2px solid #2ECC71; outline-offset: 2px; }

textarea {
  width: 100%; min-height: 78px; padding: 10px 12px; border-radius: 9px; resize: vertical;
  border: 1px solid #475569; background: #0f172a; color: #e2e8f0; font: inherit; font-size: 14px;
}
input[type=text] {
  width: 100%; padding: 10px 12px; border-radius: 9px;
  border: 1px solid #475569; background: #0f172a; color: #e2e8f0; font: inherit; font-size: 14px;
}
textarea:focus, input:focus { outline: 2px solid #2ECC71; outline-offset: 1px; border-color: #2ECC71; }
.field { margin-bottom: 16px; }
label.q { display: block; font-size: 14px; font-weight: 600; margin: 0 0 7px; color: #f1f5f9; }
.hint { font-weight: 400; color: #94a3b8; font-size: 13px; }
button {
  width: 100%; margin-top: 10px; padding: 15px 26px; border: 0; border-radius: 11px; cursor: pointer;
  background: linear-gradient(135deg, #2ECC71, #17A2B8); color: #062d21;
  font-size: 16px; font-weight: 700; font-family: inherit;
}
button:hover { filter: brightness(1.07); }
.done { text-align: center; padding: 48px 16px; }
.done .tick {
  display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #2ECC71, #17A2B8); color: #062d21; font-size: 28px; font-weight: 700;
}
.err { border-left: 3px solid #f87171; padding-left: 12px; color: #fca5a5; }
footer { margin-top: 30px; color: #64748b; font-size: 12px; text-align: center; }
@media (max-width: 420px) { body { padding: 16px 12px 48px; } .pills span { padding: 11px 0; } }
`;

/** Every page this file emits, so the shell is never half-built. */
function page(title, body) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head><body><main>${body}
<footer>Cannasol Technologies &middot; Sol review loop</footer>
</main></body></html>`;
}

const attr = (value) => escapeHtml(value);

/**
 * One question: 1-5, the ends labelled so a 2 means the same thing in March as in September,
 * and a comment box so the number arrives with its reason attached.
 */
function scaleRow(scale, review) {
  const score = review?.scores?.[scale.key] ?? null;
  const comment = review?.comments?.[scale.key] || '';

  const pills = RATINGS.map((n) => `
        <label><input type="radio" name="${attr(scale.key)}" value="${n}"${
          score === n ? ' checked' : ''}><span>${n}</span></label>`).join('');

  return `
    <div class="scale">
      <p>${escapeHtml(scale.label)} <span class="hint">&middot; ${escapeHtml(scale.question)}</span></p>
      <div class="row"><div class="pills">${pills}</div></div>
      <div class="ends"><span>1 &mdash; ${escapeHtml(scale.low)}</span><span>${escapeHtml(scale.high)} &mdash; 5</span></div>
      <div class="note">
        <input type="text" name="${attr(scale.key)}Comment" value="${attr(comment)}"
          placeholder="Why? (optional)" aria-label="${attr(`${scale.label} comment`)}">
      </div>
    </div>`;
}

function tagGroup(current = []) {
  const chosen = new Set(current);
  return `<div class="opts">${TAGS.map((tag) => `
      <label><input type="checkbox" name="tags" value="${attr(tag)}"${
        chosen.has(tag) ? ' checked' : ''}><span>${escapeHtml(TAG_LABELS[tag] || tag)}</span></label>`).join('')}</div>`;
}

const textField = (name, label, hint, value) => `
    <div class="field">
      <label class="q" for="${attr(name)}">${escapeHtml(label)}${
        hint ? ` <span class="hint">${escapeHtml(hint)}</span>` : ''}</label>
      <textarea id="${attr(name)}" name="${attr(name)}" rows="3">${escapeHtml(value || '')}</textarea>
    </div>`;

/** Who the lead is, so the reviewer grades the handling of a person they can see. */
function contactSummary(contact) {
  if (!contact) return '<p class="meta">No contact details were captured.</p>';
  const rows = ['name', 'company', 'email', 'phone']
    .filter((k) => contact[k])
    .map((k) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(contact[k])}`)
    .join(' &middot; ');
  const types = (contact.types || []).length
    ? `<br><strong>asked about:</strong> ${escapeHtml(contact.types.join(', '))}` : '';
  return `<p class="meta">${rows || 'no fields'}${types}</p>`;
}

const when = (value) => {
  const date = toDate(value);
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`
    : 'unknown';
};

/** What they sent, in order — a lead can be a chat card and a contact form twenty minutes apart. */
function submissionsHtml(submissions) {
  if (!Array.isArray(submissions) || submissions.length === 0) return '';
  return submissions.map((s) => `
      <div class="sub-block">
        <p class="meta"><strong>${s.source === 'chat' ? 'Sol chat card' : 'Contact form'}</strong>
          &middot; ${escapeHtml(when(s.at))}</p>
        <p class="msg">${escapeHtml(s.message || '(no message)')}</p>
      </div>`).join('');
}

/** Every conversation this person had, oldest first. */
function conversationsHtml(conversations) {
  if (!Array.isArray(conversations) || conversations.length === 0) {
    return '<p class="meta">No Sol conversation was stored for this lead.</p>';
  }
  return conversations.map((c) => `
      <p class="meta"><strong>${escapeHtml(c.page || 'unknown page')}</strong>
        &middot; ${escapeHtml(when(c.startedAt))}
        &middot; ${(c.messages || []).length} messages</p>
      <table>${transcriptRowsHtml(c.messages)}</table>`).join('');
}

/** The whole questionnaire, prefilled when this lead has already been rated or reviewed. */
function renderForm({ record, token, error }) {
  const review = record?.review || null;

  return page('Review Sol — Cannasol', `
  <h1>How did Sol do?</h1>
  <p class="sub">Score what you can, skip what you can&rsquo;t. Every answer is stored permanently
    and becomes training material for LIVEY &mdash; the comments are what make a score useful,
    so one line beats none.</p>

  ${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}

  <h2>The lead</h2>
  <div class="card">
    ${contactSummary(record?.contact)}
    ${submissionsHtml(record?.submissions)}
  </div>

  <h2>The conversation</h2>
  <div class="card">
    ${conversationsHtml(record?.conversations)}
  </div>

  <form method="POST" action="">
    <input type="hidden" name="token" value="${attr(token)}">

    <h2>Scores &mdash; 1 poor, 5 excellent</h2>
    ${SCALES.map((scale) => scaleRow(scale, review)).join('')}

    <h2>What should it learn?</h2>
    ${textField('doDifferently', 'What should Sol do differently next time?', '', review?.doDifferently)}
    ${textField('idealReply', 'Write the reply Sol should have given',
      'the single most useful box on this page', review?.idealReply)}

    <div class="field">
      <label class="q">What was this about? <span class="hint">tap any that apply</span></label>
      ${tagGroup(review?.tags)}
    </div>

    <div class="field">
      <label class="q" for="reviewer">Your name</label>
      <input type="text" id="reviewer" name="reviewer" value="${attr(review?.reviewer || '')}"
        autocomplete="name" placeholder="so we know whose call this was">
    </div>

    <button type="submit">Save review</button>
  </form>`);
}

function renderSaved({ rating, average }) {
  const score = rating ? `Scored ${escapeHtml(String(rating))}/5 overall. `
    : (average ? `Averaged ${escapeHtml(String(average))}/5. ` : '');
  return page('Review saved — Cannasol', `
  <div class="done">
    <p class="tick">&#10003;</p>
    <h1>Saved</h1>
    <p class="sub">${score}This lead, its conversation and your review are stored permanently and
      are ready to be fed back into LIVEY.</p>
    <p class="sub">You can close this tab &mdash; or reopen the link any time to revise it.</p>
  </div>`);
}

function renderProblem(message) {
  return page('Review unavailable — Cannasol', `
  <div class="done">
    <h1>That link didn&rsquo;t work</h1>
    <p class="sub">${escapeHtml(message)}</p>
  </div>`);
}

module.exports = { renderForm, renderSaved, renderProblem, RATINGS, page };
