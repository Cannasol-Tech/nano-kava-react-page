/**
 * @file: functions/lib/reviewForm.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The questionnaire the lead email links to, rendered as one self-contained HTML document.
 *     Served by a Cloud Function rather than added to the React app on purpose: it is a private,
 *     token-addressed page that must never be prerendered, listed in routes.js or indexed, and
 *     nothing about it should ride on a hosting release.
 *
 * @See Also:
 *     functions/lib/solReviews.js
 *     functions/index.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { CHOICES, TAGS } = require('./solReviews');
const { escapeHtml, transcriptRowsHtml, toDate } = require('./transcript');

const RATINGS = [1, 2, 3, 4, 5];

const LABELS = {
  accuracy: { accurate: 'Accurate', mostly: 'Mostly right', wrong: 'Got something wrong' },
  handoffTiming: {
    'too-early': 'Too early', right: 'Right moment', 'too-late': 'Too late', missed: 'Never offered it',
  },
  tone: { 'on-brand': 'On brand', pushy: 'Too pushy', stiff: 'Too stiff', chatty: 'Too chatty' },
  compliance: { clean: 'Clean', borderline: 'Borderline', violation: 'Crossed the line' },
  leadQuality: { real: 'Real buyer', maybe: 'Maybe', junk: 'Junk' },
};

const TAG_LABELS = {
  'particle-size': 'particle size', moq: 'MOQ', 'off-topic': 'off topic',
};

const STYLE = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 24px 16px 64px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a; color: #e2e8f0; line-height: 1.5;
}
main { max-width: 760px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 4px; color: #fff; }
h2 { font-size: 15px; margin: 28px 0 10px; color: #5eead4; text-transform: uppercase; letter-spacing: .06em; }
.sub { margin: 0 0 24px; color: #94a3b8; font-size: 14px; }
.card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
.card table { width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; }
.meta { font-size: 13px; color: #94a3b8; margin: 0 0 10px; }
.meta strong { color: #e2e8f0; }
label.q { display: block; font-size: 14px; font-weight: 600; margin: 0 0 8px; color: #f1f5f9; }
.hint { font-weight: 400; color: #94a3b8; font-size: 13px; }
.opts { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
.opts input { position: absolute; opacity: 0; width: 0; height: 0; }
.opts span {
  display: inline-block; padding: 7px 13px; border-radius: 999px; font-size: 13px;
  border: 1px solid #475569; background: #0f172a; color: #cbd5e1; cursor: pointer;
  transition: background .15s, border-color .15s, color .15s;
}
.opts input:focus-visible + span { outline: 2px solid #2ECC71; outline-offset: 2px; }
.opts input:checked + span { background: #0d9488; border-color: #2ECC71; color: #fff; font-weight: 600; }
.stars { display: flex; gap: 6px; }
.stars span { min-width: 46px; text-align: center; font-size: 15px; }
textarea {
  width: 100%; min-height: 84px; padding: 10px 12px; border-radius: 9px; resize: vertical;
  border: 1px solid #475569; background: #0f172a; color: #e2e8f0; font: inherit; font-size: 14px;
}
input[type=text] {
  width: 100%; padding: 10px 12px; border-radius: 9px;
  border: 1px solid #475569; background: #0f172a; color: #e2e8f0; font: inherit; font-size: 14px;
}
textarea:focus, input[type=text]:focus { outline: 2px solid #2ECC71; outline-offset: 1px; border-color: #2ECC71; }
.field { margin-bottom: 18px; }
button {
  margin-top: 8px; padding: 13px 26px; border: 0; border-radius: 10px; cursor: pointer;
  background: linear-gradient(135deg, #2ECC71, #17A2B8); color: #062d21;
  font-size: 15px; font-weight: 700; font-family: inherit;
}
button:hover { filter: brightness(1.07); }
.done { text-align: center; padding: 48px 16px; }
.done .tick {
  display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #2ECC71, #17A2B8); color: #062d21; font-size: 28px; font-weight: 700;
}
.err { border-left: 3px solid #f87171; padding-left: 12px; color: #fca5a5; }
footer { margin-top: 32px; color: #64748b; font-size: 12px; text-align: center; }
@media (max-width: 480px) { .stars span { min-width: 40px; } body { padding: 16px 12px 48px; } }
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

function radioGroup(name, choices, labels, current) {
  const options = choices.map((value) => `
      <label><input type="radio" name="${attr(name)}" value="${attr(value)}"${
        current === value ? ' checked' : ''}><span>${escapeHtml(labels[value] || value)}</span></label>`).join('');
  return `<div class="opts">${options}</div>`;
}

function starGroup(current) {
  const options = RATINGS.map((value) => `
      <label><input type="radio" name="rating" value="${value}"${
        current === value ? ' checked' : ''}><span>${value}</span></label>`).join('');
  return `<div class="opts stars">${options}</div>`;
}

function tagGroup(current = []) {
  const chosen = new Set(current);
  const options = TAGS.map((tag) => `
      <label><input type="checkbox" name="tags" value="${attr(tag)}"${
        chosen.has(tag) ? ' checked' : ''}><span>${escapeHtml(TAG_LABELS[tag] || tag)}</span></label>`).join('');
  return `<div class="opts">${options}</div>`;
}

const textField = (name, label, hint, value) => `
    <div class="field">
      <label class="q" for="${attr(name)}">${escapeHtml(label)}${
        hint ? ` <span class="hint">${escapeHtml(hint)}</span>` : ''}</label>
      <textarea id="${attr(name)}" name="${attr(name)}" rows="3">${escapeHtml(value || '')}</textarea>
    </div>`;

const choiceField = (name, label, hint, current) => `
    <div class="field">
      <p class="q">${escapeHtml(label)}${hint ? ` <span class="hint">${escapeHtml(hint)}</span>` : ''}</p>
      ${radioGroup(name, CHOICES[name], LABELS[name], current)}
    </div>`;

/** The lead, so the reviewer can see what Sol actually captured before grading how it got there. */
function leadSummary(lead) {
  if (!lead) return '<p class="meta">No contact details were captured.</p>';
  const rows = ['name', 'company', 'email', 'phone', 'interest', 'reason']
    .filter((k) => lead[k])
    .map((k) => `<strong>${escapeHtml(k)}:</strong> ${escapeHtml(lead[k])}`)
    .join(' &middot; ');
  return `<p class="meta">${rows || 'no fields'}</p>`;
}

/** The whole questionnaire, prefilled when this conversation has already been rated or reviewed. */
function renderForm({ record, token, error }) {
  const review = record?.review || {};
  const started = toDate(record?.startedAt);
  const when = started instanceof Date && !Number.isNaN(started.getTime())
    ? started.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
    : 'unknown';

  const transcript = Array.isArray(record?.messages) && record.messages.length
    ? `<table>${transcriptRowsHtml(record.messages)}</table>`
    : '<p class="meta">No transcript was stored for this conversation.</p>';

  return page('Review Sol — Cannasol', `
  <h1>How did Sol do?</h1>
  <p class="sub">Your answers are stored permanently and become training material for LIVEY.
    Everything below is optional except the score &mdash; even one line helps.</p>

  ${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}

  <h2>The conversation</h2>
  <div class="card">
    <p class="meta"><strong>Page:</strong> ${escapeHtml(record?.page || 'unknown')}
      &middot; <strong>Started:</strong> ${escapeHtml(when)}
      &middot; <strong>Messages:</strong> ${Array.isArray(record?.messages) ? record.messages.length : 0}</p>
    ${leadSummary(record?.lead)}
    ${transcript}
  </div>

  <form method="POST" action="">
    <input type="hidden" name="token" value="${attr(token)}">

    <h2>The verdict</h2>
    <div class="field">
      <p class="q">Overall, how well did Sol handle this? <span class="hint">1 poor &rarr; 5 excellent</span></p>
      ${starGroup(review.rating)}
    </div>

    ${choiceField('accuracy', 'Did Sol get the product facts right?', '', review.accuracy)}
    ${textField('accuracyNotes', 'What did it get wrong?', 'skip if nothing', review.accuracyNotes)}

    ${choiceField('handoffTiming', 'When did it raise the sample card?', '', review.handoffTiming)}
    ${choiceField('tone', 'How did it read?', '', review.tone)}

    ${choiceField('compliance', 'Any health claim or personal dosing advice?',
      'kava is an ingestible — this one matters', review.compliance)}
    ${textField('complianceNotes', 'Quote the line', 'skip if clean', review.complianceNotes)}

    ${choiceField('leadQuality', 'Is this a lead worth chasing?', '', review.leadQuality)}

    <h2>What should it learn?</h2>
    ${textField('didWell', 'What did Sol do well here?', '', review.didWell)}
    ${textField('doDifferently', 'What should it do differently next time?', '', review.doDifferently)}
    ${textField('idealReply', 'Write the reply Sol should have given',
      'the single most useful box on this page', review.idealReply)}

    <div class="field">
      <p class="q">What was this conversation about? <span class="hint">tap any that apply</span></p>
      ${tagGroup(review.tags)}
    </div>

    <div class="field">
      <label class="q" for="reviewer">Your name</label>
      <input type="text" id="reviewer" name="reviewer" value="${attr(review.reviewer || '')}"
        autocomplete="name" placeholder="so we know whose call this was">
    </div>

    <button type="submit">Save review</button>
  </form>`);
}

function renderSaved({ rating }) {
  return page('Review saved — Cannasol', `
  <div class="done">
    <p class="tick">&#10003;</p>
    <h1>Saved</h1>
    <p class="sub">${rating ? `Scored ${escapeHtml(String(rating))}/5. ` : ''}This conversation and your
      review are stored permanently and are ready to be fed back into LIVEY.</p>
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

module.exports = { renderForm, renderSaved, renderProblem, RATINGS, LABELS, page };
