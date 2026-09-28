/**
 * @file: functions/lib/reviewForm.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The questionnaire the lead email links to, rendered as one self-contained HTML document.
 *     Four scores, two checkboxes and one box — short enough to finish on a phone between other
 *     things, which is the only version that ever gets filled in. Served by a Cloud Function
 *     rather than added to the React app on purpose: it is a private, token-addressed page that
 *     must never be prerendered, listed in routes.js or indexed.
 *
 * @See Also:
 *     functions/lib/solReviews.js
 *     functions/index.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { SCALES, FLAGS } = require('./solReviews');
const { escapeHtml, transcriptRowsHtml, toDate } = require('./transcript');

const RATINGS = [1, 2, 3, 4, 5];

const STYLE = `
:root { color-scheme: dark; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 22px 16px 56px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a; color: #e2e8f0; line-height: 1.5;
  -webkit-text-size-adjust: 100%;
}
main { max-width: 640px; margin: 0 auto; }
h1 { font-size: 22px; margin: 0 0 4px; color: #fff; }
h2 { font-size: 12px; margin: 26px 0 10px; color: #5eead4; text-transform: uppercase; letter-spacing: .09em; }
.sub { margin: 0 0 20px; color: #94a3b8; font-size: 14px; }

.card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 13px 14px; }
.meta { font-size: 13px; color: #94a3b8; margin: 0; }
.meta strong { color: #e2e8f0; }
.meta + .meta { margin-top: 5px; }
details { margin-top: 10px; }
summary {
  cursor: pointer; font-size: 13px; color: #5eead4; padding: 6px 0;
  list-style: none; -webkit-tap-highlight-color: transparent;
}
summary::-webkit-details-marker { display: none; }
summary::before { content: '▸ '; }
details[open] summary::before { content: '▾ '; }
details table { width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; margin-top: 6px; }
.chat-meta { font-size: 12px; color: #64748b; margin: 8px 0 0; }
.msg { white-space: pre-wrap; font-size: 13px; color: #cbd5e1; margin: 4px 0 0; }
.sent { margin-top: 10px; padding-top: 10px; border-top: 1px solid #334155; }
.sent-head { font-size: 11px; font-weight: 700; color: #5eead4; text-transform: uppercase; letter-spacing: .05em; margin: 0; }

.scale { margin-bottom: 14px; }
.scale > p { margin: 0 0 7px; font-size: 15px; color: #f1f5f9; }
.scale > p b { font-weight: 700; }
.scale > p span { color: #94a3b8; font-size: 14px; }
.pills { display: flex; gap: 6px; }
.pills label { flex: 1; }
.pills input { position: absolute; opacity: 0; width: 0; height: 0; }
.pills span {
  display: block; text-align: center; padding: 11px 0; border-radius: 9px; font-size: 15px;
  font-weight: 600; border: 1px solid #475569; background: #1e293b; color: #cbd5e1;
  cursor: pointer; transition: background .15s, border-color .15s, color .15s;
}
.pills input:focus-visible + span { outline: 2px solid #2ECC71; outline-offset: 2px; }
.pills input:checked + span { background: #0d9488; border-color: #2ECC71; color: #fff; }
.ends { display: flex; justify-content: space-between; margin: 5px 2px 0; font-size: 11px; color: #64748b; }
.why { margin-top: 7px; }

input[type=text] {
  width: 100%; padding: 10px 12px; border-radius: 9px; font-size: 14px;
  border: 1px solid #3f4d63; background: #0f172a; color: #e2e8f0; font-family: inherit;
}
input[type=text]::placeholder { color: #64748b; }
textarea {
  width: 100%; min-height: 84px; padding: 10px 12px; border-radius: 9px; resize: vertical;
  border: 1px solid #475569; background: #0f172a; color: #e2e8f0; font: inherit; font-size: 14px;
}
textarea:focus, input:focus { outline: 2px solid #2ECC71; outline-offset: 1px; border-color: #2ECC71; }
.field { margin-bottom: 16px; }
label.q { display: block; font-size: 15px; font-weight: 600; margin: 0 0 7px; color: #f1f5f9; }
.hint { font-weight: 400; color: #94a3b8; font-size: 13px; }

.flag { display: block; margin-bottom: 9px; }
.flag input { position: absolute; opacity: 0; width: 0; height: 0; }
.flag span {
  display: block; padding: 12px 14px; border-radius: 10px; font-size: 14px; cursor: pointer;
  border: 1px solid #475569; background: #1e293b; color: #cbd5e1;
  transition: background .15s, border-color .15s, color .15s;
}
.flag span::before { content: '○ '; opacity: .6; }
.flag input:checked + span { background: #7f1d1d; border-color: #f87171; color: #fee2e2; }
.flag input:checked + span::before { content: '● '; opacity: 1; }
.flag input:focus-visible + span { outline: 2px solid #2ECC71; outline-offset: 2px; }
.flag em { display: block; font-style: normal; color: #94a3b8; font-size: 12px; margin-top: 2px; }
.flag input:checked + span em { color: #fecaca; }

button {
  width: 100%; margin-top: 8px; padding: 15px 26px; border: 0; border-radius: 11px; cursor: pointer;
  background: linear-gradient(135deg, #2ECC71, #17A2B8); color: #062d21;
  font-size: 16px; font-weight: 700; font-family: inherit;
}
button:hover { filter: brightness(1.07); }
.done { text-align: center; padding: 48px 16px; }
.done .tick {
  display: inline-grid; place-items: center; width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #2ECC71, #17A2B8); color: #062d21; font-size: 28px; font-weight: 700;
}
.quick { background: #134e4a; border: 1px solid #2ECC71; border-radius: 12px; padding: 14px; margin: 0 0 18px; }
.quick p { margin: 0; font-size: 15px; color: #f1f5f9; }
.quick .hint { margin-top: 8px; font-size: 13px; }
.err { border-left: 3px solid #f87171; padding-left: 12px; color: #fca5a5; }
footer { margin-top: 28px; color: #64748b; font-size: 12px; text-align: center; }
@media (max-width: 420px) { body { padding: 16px 12px 44px; } }
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
 * One question: 1-5, both ends labelled so a 2 means the same thing in March as in September,
 * and one optional line for why. Four of these is the whole scoring section.
 */
function scaleRow(scale, review) {
  const score = review?.scores?.[scale.key] ?? null;
  const comment = review?.comments?.[scale.key] || '';

  const pills = RATINGS.map((n) => `
        <label><input type="radio" name="${attr(scale.key)}" value="${n}"${
          score === n ? ' checked' : ''}><span>${n}</span></label>`).join('');

  return `
    <div class="scale">
      <p><b>${escapeHtml(scale.label)}</b> <span>${escapeHtml(scale.question)}</span></p>
      <div class="pills">${pills}</div>
      <div class="ends"><span>1 &mdash; ${escapeHtml(scale.low)}</span><span>${escapeHtml(scale.high)} &mdash; 5</span></div>
      <div class="why">
        <input type="text" name="${attr(scale.key)}Comment" value="${attr(comment)}"
          placeholder="Why? (optional)" aria-label="${attr(`${scale.label} comment`)}">
      </div>
    </div>`;
}

/** A tap, not a score. See solReviews.js § FLAGS for why compliance is not a 1-5. */
function flagRow(flag, review) {
  const on = Boolean(review?.flags?.[flag.key]);
  const note = flag.note ? `
      <div class="why">
        <input type="text" name="${attr(flag.key)}Note" value="${attr(review?.complianceNote || '')}"
          placeholder="Quote the line (optional)" aria-label="Compliance note">
      </div>` : '';

  return `
    <label class="flag">
      <input type="checkbox" name="${attr(flag.key)}" value="1"${on ? ' checked' : ''}>
      <span>${escapeHtml(flag.label)}<em>${escapeHtml(flag.hint)}</em></span>
    </label>${note}`;
}

const when = (value) => {
  const date = toDate(value);
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? `${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`
    : 'unknown';
};

/** Who the lead is, and what they sent. Short — the email they came from had all of it. */
function leadCard(record) {
  const contact = record?.contact;
  const lines = contact
    ? [
      `<p class="meta"><strong>${escapeHtml(contact.name || 'Unnamed')}</strong>`
        + `${contact.company ? ` &middot; ${escapeHtml(contact.company)}` : ''}`
        + `${contact.email ? ` &middot; ${escapeHtml(contact.email)}` : ''}</p>`,
      (contact.types || []).length
        ? `<p class="meta">Asked about: ${escapeHtml(contact.types.join(', '))}</p>` : '',
    ].join('')
    : '<p class="meta">No contact details were captured.</p>';

  const submissions = (record?.submissions || []).map((s) => `
      <div class="sent">
        <p class="sent-head">${s.source === 'chat' ? 'Sol chat card' : 'Contact form'}
          &middot; ${escapeHtml(when(s.at))}</p>
        <p class="msg">${escapeHtml(s.message || '(no message)')}</p>
      </div>`).join('');

  const conversations = record?.conversations || [];
  const messageCount = conversations.reduce((n, c) => n + (c.messages || []).length, 0);

  // Closed by default: they have just read this conversation in the email that linked here, and
  // an open transcript is most of the page's height.
  const transcript = messageCount === 0
    ? '<p class="chat-meta">No Sol conversation was stored for this lead.</p>'
    : `<details>
        <summary>Show the conversation (${messageCount} message${messageCount === 1 ? '' : 's'})</summary>
        ${conversations.map((c) => `
          <p class="chat-meta">${escapeHtml(c.page || 'unknown page')} &middot; ${escapeHtml(when(c.startedAt))}</p>
          <table>${transcriptRowsHtml(c.messages)}</table>`).join('')}
      </details>`;

  return `<div class="card">${lines}${submissions}${transcript}</div>`;
}

/** A star from the email, if it is one. Anything else is ignored rather than trusted. */
const preselectedScore = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};

/**
 * The whole questionnaire, prefilled when this lead has already been reviewed.
 *
 * `preselect` is the star tapped in the email. It is shown selected but NOT saved — the GET that
 * carries it must not write, because a mail scanner opens every link first — so the page leads
 * with a Save button that files it in one more tap.
 */
function renderForm({ record, token, error, preselect }) {
  const stored = record?.review || null;
  const picked = preselectedScore(preselect);
  const review = picked
    ? { ...(stored || {}), scores: { ...(stored?.scores || {}), overall: picked } }
    : stored;

  const quickSave = picked ? `
  <div class="quick">
    <p>You picked <b>${picked}/5</b> overall. It is not saved until you press Save.</p>
    <button type="submit" form="review">Save ${picked}/5</button>
    <p class="hint">Or add more below first &mdash; everything else is optional.</p>
  </div>` : '';

  return page('Review Sol — Cannasol', `
  <h1>How did Sol do?</h1>
  <p class="sub">Four taps and you&rsquo;re done. Everything is optional, and it all becomes
    training material for Sol.</p>

  ${error ? `<p class="err">${escapeHtml(error)}</p>` : ''}
  ${quickSave}

  <h2>The lead</h2>
  ${leadCard(record)}

  <form id="review" method="POST" action="">
    <input type="hidden" name="token" value="${attr(token)}">

    <h2>Score it &mdash; 1 poor, 5 excellent</h2>
    ${SCALES.map((scale) => scaleRow(scale, review)).join('')}

    <h2>Anything go wrong?</h2>
    ${FLAGS.map((flag) => flagRow(flag, review)).join('')}

    <h2>One more thing</h2>
    <div class="field">
      <label class="q" for="doDifferently">What should Sol have said or done instead?
        <span class="hint">the most useful box on this page</span></label>
      <textarea id="doDifferently" name="doDifferently" rows="3">${escapeHtml(review?.doDifferently || '')}</textarea>
    </div>

    <div class="field">
      <label class="q" for="reviewer">Your name <span class="hint">optional</span></label>
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
      are ready to be fed back into Sol.</p>
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
