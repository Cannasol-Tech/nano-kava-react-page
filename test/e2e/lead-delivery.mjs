#!/usr/bin/env node
/**
 * @file: test/e2e/lead-delivery.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Proves a sample request is really delivered: POSTs a marked lead to the DEPLOYED
 *     sendContactEmail, then polls SendGrid's Email Activity until every expected recipient
 *     reaches a terminal state, and fails on anything but delivered. Sends real mail to the
 *     team — run deliberately, never in CI.
 *
 *     ⚠️ This run takes ~25 MINUTES, and that is the system working. `sendContactEmail` only
 *     queues; the scheduled `sendPendingLeads` sends once the lead has been quiet for
 *     LEAD_QUIET_MINUTES (20 by default). Set that env var on the deployed function to 1 if you
 *     want a fast run — see functions/lib/CLAUDE.md § One email per lead, after the quiet period.
 *
 *     It also pins the half that is easiest to get wrong from the outside: a lead submitted with
 *     a TEAM address gets the notification and NOTHING else. That auto-reply-to-self is what made
 *     every test lead arrive twice — see docs/sol-review-loop.md § One lead, one email.
 *
 * @See Also:
 *     functions/lib/leads.js
 *     functions/test/leadDelivery.test.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const ENDPOINT = process.env.LEAD_ENDPOINT
  || 'https://us-central1-nano-kava-landing-page.cloudfunctions.net/sendContactEmail';
const PROJECT = process.env.GCP_PROJECT || 'nano-kava-landing-page';
const TEAM = ['stephen.boyett@cannasolusa.com', 'josh.detzel@cannasolusa.com'];
// Where the auto-reply would go. The default is a team address ON PURPOSE: that is the case the
// suppression exists for, and it keeps a stranger's inbox out of a test run. Set LEAD_TEST_EMAIL
// to an address outside the team to exercise the auto-reply itself.
const VISITOR = process.env.LEAD_TEST_EMAIL || 'stephen.boyett@cannasolusa.com';
const VISITOR_IS_TEAM = TEAM.map((a) => a.toLowerCase()).includes(VISITOR.toLowerCase());

// The quiet window, the sweep interval on top of it, and slack for SendGrid to settle. Read
// from the env so a deploy running a shorter window does not mean a 25-minute test run.
const QUIET_MINUTES = Number(process.env.LEAD_QUIET_MINUTES) > 0
  ? Number(process.env.LEAD_QUIET_MINUTES) : 20;
const POLL_INTERVAL_MS = 15000;
const POLL_ATTEMPTS = Math.ceil(((QUIET_MINUTES + 5) * 60 * 1000) / POLL_INTERVAL_MS);
// SendGrid's activity feed is eventually consistent; these are the states it settles into.
const TERMINAL = new Set(['delivered', 'not_delivered', 'bounce', 'dropped', 'blocked', 'deferred']);

const results = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, passed, detail) {
  results.push({ name, passed });
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${passed || !detail ? '' : `\n        ${detail}`}`);
}

/** The key never reaches the shell history or this file; Secret Manager is the only source. */
async function sendgridKey() {
  if (process.env.SENDGRID_API_KEY) return process.env.SENDGRID_API_KEY;
  const { stdout } = await run('gcloud', [
    'secrets', 'versions', 'access', 'latest', '--secret=SENDGRID_API_KEY', `--project=${PROJECT}`,
  ], { maxBuffer: 1024 * 1024 });
  return stdout.trim();
}

/**
 * Rows for this run only. The marker rides in the company field, which `teamSubject` puts in the
 * team subject — the auto-reply's subject is fixed, so that one is matched by recipient and time.
 * Deliberately NOT a `unique_args` query: the code sets none, so that query answers 200 with an
 * empty list and a run that really delivered reads as a run that sent nothing.
 */
async function activityFor(key, marker, sinceMs) {
  const response = await fetch('https://api.sendgrid.com/v3/messages?limit=100', {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`SendGrid activity ${response.status}: ${await response.text()}`);

  const { messages = [] } = await response.json();
  const afterStart = (m) => new Date(m.last_event_time).getTime() >= sinceMs - 60_000;
  return messages.filter((m) => (
    m.subject.includes(marker)
    || (afterStart(m) && m.to_email === VISITOR && /We received your message/.test(m.subject))
  ));
}

async function main() {
  const marker = `E2E-${Date.now().toString(36).toUpperCase()}`;
  console.log(`Lead delivery test -> ${ENDPOINT}`);
  console.log(`Marker: ${marker}  (company field, so it is greppable in both inboxes)\n`);

  const key = await sendgridKey();
  if (!key.startsWith('SG.')) throw new Error('No usable SendGrid key — set SENDGRID_API_KEY or authenticate gcloud.');

  console.log('[1] The deployed function accepts the lead');
  const started = Date.now();
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Automated Delivery Test',
      email: VISITOR,
      company: marker,
      phone: '216-921-2240',
      inquiryType: 'Request Samples, Sol Chat',
      message: `AUTOMATED TEST ${marker} — ignore. Verifies sample-request email delivery end to end.`,
    }),
  });
  const body = await response.json().catch(() => ({}));

  check('function returned 200', response.status === 200, `status ${response.status}: ${JSON.stringify(body)}`);
  check('function reported success', body.success === true, JSON.stringify(body));
  check('it was not a dry run', body.dryRun !== true, 'the dev middleware answered — point LEAD_ENDPOINT at the deployed function');
  // Nothing is emailed from the request path any more; the sweep is what sends.
  check('the lead was queued rather than sent inline', body.queued === true, JSON.stringify(body));
  if (response.status !== 200) return finish();

  console.log(`\n[2] The sweep sends it and SendGrid delivers it`);
  console.log(`    Waiting out the ${QUIET_MINUTES}-minute quiet window plus the sweep —`
    + ` up to ${Math.round((POLL_ATTEMPTS * POLL_INTERVAL_MS) / 60000)} minutes. This is not a hang.`);
  const expected = [...new Set([...TEAM, VISITOR])];
  // One notification row per team address, plus the auto-reply when the visitor is not one of us.
  // Counting *recipients* stopped the poll as soon as the team rows landed, and the auto-reply
  // appears a beat later.
  const expectedRows = TEAM.length + (VISITOR_IS_TEAM ? 0 : 1);
  const isTeamRow = (m) => TEAM.includes(m.to_email) && /Chat Lead|Contact Form/.test(m.subject);
  const isAutoReply = (m) => m.to_email === VISITOR && /We received your message/.test(m.subject);

  let messages = [];
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);
    messages = await activityFor(key, marker, started);
    const settled = messages.filter((m) => TERMINAL.has(m.status) && (isTeamRow(m) || isAutoReply(m)));
    process.stdout.write(`\r  ${settled.length}/${expectedRows} messages settled (${Math.round((Date.now() - started) / 1000)}s)   `);
    if (settled.length >= expectedRows) break;
  }
  console.log('');

  for (const recipient of expected) {
    const forRecipient = messages.filter((m) => m.to_email === recipient);
    const delivered = forRecipient.filter((m) => m.status === 'delivered');
    check(
      `delivered to ${recipient}`,
      delivered.length > 0,
      forRecipient.length === 0
        ? 'no activity row at all — SendGrid never saw a message for this address'
        : forRecipient.map((m) => `${m.status}: ${m.subject}`).join(' | ')
    );
  }

  const teamMail = messages.filter(isTeamRow);
  check('the team notification reached both addresses', new Set(teamMail.map((m) => m.to_email)).size === TEAM.length,
    teamMail.map((m) => `${m.to_email}: ${m.status}`).join(' | ') || 'none found');

  const autoReply = messages.find(isAutoReply);
  if (VISITOR_IS_TEAM) {
    // The whole point of the suppression: one lead, one email. A second row here is the
    // regression Stephen reported as "TWO emails from Sol every time".
    check('no auto-reply is sent to a team address', !autoReply,
      autoReply ? `${autoReply.to_email}: ${autoReply.subject}` : '');
    check('the team got exactly one message each',
      teamMail.length === new Set(teamMail.map((m) => m.to_email)).size,
      teamMail.map((m) => `${m.to_email}: ${m.subject}`).join(' | '));
  } else {
    check('the visitor got the auto-reply', Boolean(autoReply) && autoReply.status === 'delivered',
      autoReply ? autoReply.status : 'no auto-reply row');
  }

  console.log('\n[3] Nothing is silently suppressed');
  for (const recipient of expected) {
    for (const list of ['bounces', 'blocks', 'spam_reports', 'invalid_emails']) {
      const res = await fetch(`https://api.sendgrid.com/v3/suppression/${list}/${recipient}`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const entries = res.ok ? await res.json() : [];
      check(`${recipient} is not on ${list}`, Array.isArray(entries) && entries.length === 0, JSON.stringify(entries).slice(0, 160));
    }
  }

  finish();
}

function finish() {
  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nDelivered means SendGrid handed it to the receiving server. If every check passes and');
    console.log('the mail is still not visible, it is past SendGrid — check Microsoft 365 quarantine.');
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nlead-delivery failed: ${error.message}`);
  process.exit(2);
});
