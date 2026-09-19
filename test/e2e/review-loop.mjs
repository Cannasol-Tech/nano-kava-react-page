#!/usr/bin/env node
/**
 * @file: test/e2e/review-loop.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Proves the review loop against the DEPLOYED backend, end to end: holds a real conversation
 *     with Sol, submits a lead from it, checks the second submission sends nothing, then reads
 *     solReviews/{sessionId} straight out of Firestore and prints the review link the email
 *     carried. Sends real mail to the team — run deliberately, never in CI.
 *
 * @See Also:
 *     functions/lib/solReviews.js
 *     functions/lib/leadHandoff.js
 *     docs/sol-review-loop.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';

const run = promisify(execFile);

const BASE = process.env.FUNCTIONS_BASE
  || 'https://us-central1-nano-kava-landing-page.cloudfunctions.net';
const LEAD_ENDPOINT = process.env.LEAD_ENDPOINT || `${BASE}/sendContactEmail`;
const CHAT_ENDPOINT = process.env.CHAT_ENDPOINT || `${BASE}/chat`;
const REVIEW_URL = process.env.SOL_REVIEW_URL || 'https://enjoynano.com/sol-review';
const PROJECT = process.env.GCP_PROJECT || 'nano-kava-landing-page';

// A team address on purpose: this run emails a real inbox, and it is also the case the
// one-lead-one-email suppression exists for. See docs/sol-review-loop.md § One lead, one email.
const VISITOR = process.env.LEAD_TEST_EMAIL || 'stephen.boyett@cannasolusa.com';

// Url-safe, 8-64 chars, no leading `__` — the same shape chatStore.isValidSessionId enforces.
const SESSION = `e2e-${randomBytes(9).toString('base64url')}`;

const results = [];

function check(name, passed, detail) {
  results.push({ name, passed });
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${passed || !detail ? '' : `\n        ${detail}`}`);
}

/** Firestore has no read CLI, so the REST API with gcloud's own token is the short path. */
async function firestoreDoc(path) {
  const { stdout } = await run('gcloud', ['auth', 'print-access-token'], { maxBuffer: 1024 * 1024 });
  const token = stdout.trim();
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}`
    + `/databases/(default)/documents/${path}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${await response.text()}`);
  return response.json();
}

/** Firestore REST wraps every value in a type tag; this unwraps enough of it to assert on. */
function plain(value) {
  if (value === null || value === undefined) return value;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(plain);
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, plain(v)]));
  }
  return value;
}

/** One real turn against the deployed SSE endpoint, so a genuine transcript exists to archive. */
async function say(text, history) {
  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [...history, { role: 'user', text }], sessionId: SESSION, page: '/' }),
  });
  if (!response.ok) throw new Error(`chat ${response.status}: ${await response.text()}`);

  let reply = '';
  for (const line of (await response.text()).split('\n')) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === 'text' && event.delta) reply += event.delta;
  }
  return [...history, { role: 'user', text }, { role: 'model', text: reply }];
}

const submit = (marker) => fetch(LEAD_ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Automated Review-Loop Test',
    email: VISITOR,
    company: marker,
    phone: '216-921-2240',
    inquiryType: 'Request Samples, Sol Chat',
    interest: 'Kavalactone Nanoemulsion',
    message: `AUTOMATED TEST ${marker} — ignore. Verifies the Sol review loop end to end.`,
    sessionId: SESSION,
  }),
}).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

async function main() {
  const marker = `REVIEW-${Date.now().toString(36).toUpperCase()}`;
  console.log(`Sol review loop -> ${LEAD_ENDPOINT}`);
  console.log(`Session: ${SESSION}`);
  console.log(`Marker:  ${marker}  (company field, so it is greppable in the inbox)\n`);

  console.log('[1] A real conversation is stored');
  let history = await say('Does your nano kava stay clear in a seltzer?', []);
  history = await say('Good. Can you have Josh send me samples?', history);
  check('Sol answered both turns', history.filter((m) => m.role === 'model' && m.text).length === 2,
    history.map((m) => `${m.role}: ${m.text.slice(0, 60)}`).join(' | '));

  // The transcript is written after the stream resolves, so give the function a beat to land it.
  await new Promise((r) => setTimeout(r, 4000));
  const session = await firestoreDoc(`chatSessions/${SESSION}`);
  check('the transcript reached Firestore', Boolean(session),
    'no chatSessions document — the chat function did not persist this session');

  console.log('\n[2] The lead is emailed exactly once');
  const first = await submit(marker);
  check('the first submission was accepted', first.status === 200 && first.body.success === true,
    JSON.stringify(first.body));
  check('it was not a dry run', first.body.dryRun !== true,
    'the dev middleware answered — point LEAD_ENDPOINT at the deployed function');

  const second = await submit(marker);
  check('a second Send sends nothing', second.status === 200 && second.body.duplicate === true,
    `expected duplicate:true, got ${JSON.stringify(second.body)}`);

  console.log('\n[3] The conversation is copied somewhere permanent');
  const archived = await firestoreDoc(`solReviews/${SESSION}`);
  check('solReviews document exists', Boolean(archived), 'nothing was archived for this session');
  if (!archived) return finish();

  const fields = Object.fromEntries(
    Object.entries(archived.fields || {}).map(([k, v]) => [k, plain(v)]));

  check('it carries the transcript', Array.isArray(fields.messages) && fields.messages.length >= 2,
    `messages: ${JSON.stringify(fields.messages).slice(0, 200)}`);
  check('it carries the lead', Boolean(fields.lead && (fields.lead.name || fields.lead.email)),
    JSON.stringify(fields.lead));
  check('it is waiting for a review', fields.status === 'pending', `status: ${fields.status}`);
  // The entire reason this collection is separate from chatSessions.
  check('it has NO expiry', !('expiresAt' in (archived.fields || {})),
    'an expiresAt would put the training corpus back on the 90-day TTL');
  check('it minted a review token', typeof fields.token === 'string' && fields.token.length >= 16,
    `token: ${fields.token}`);

  const tokenDoc = fields.token ? await firestoreDoc(`solReviewTokens/${fields.token}`) : null;
  check('the token resolves back to this session',
    plain(tokenDoc?.fields?.sessionId) === SESSION,
    `token document: ${JSON.stringify(tokenDoc?.fields)}`);

  console.log('\n[4] The link in the email opens');
  const link = `${REVIEW_URL}?token=${fields.token}`;
  const page = await fetch(link);
  const html = await page.text();
  check('the review page renders', page.status === 200, `status ${page.status}`);
  check('it shows the conversation being graded', html.includes('How did Sol do'),
    html.slice(0, 200));
  check('it is marked noindex', /noindex/.test(page.headers.get('x-robots-tag') || html), '');

  console.log(`\n  Review link (this is what the email carried):\n  ${link}\n`);
  console.log('  Open it, fill it in, then re-read the document to confirm the review attached:');
  console.log(`  node -e "…" or check solReviews/${SESSION} for status: 'reviewed'.`);

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nFirestore reads need gcloud auth against the project. Delivery itself is a');
    console.log('separate concern — run `make test-lead-delivery` for that.');
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nreview-loop failed: ${error.message}`);
  process.exit(2);
});
