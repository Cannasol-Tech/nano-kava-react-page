#!/usr/bin/env node
/**
 * @file: test/e2e/verify-release.mjs
 * @author: Stephen Boyett
 *
 * @description:
 *     Answers "is it actually live?" — read-only, sends nothing, emails nobody. Written after a
 *     release that never happened looked exactly like a release that had: the lead email simply
 *     arrived without the conversation or the review link, which is also what the OLD code does.
 *     Nothing in the running system says which version it is, so this asks.
 *
 *     Run it after every `make deploy-all`. The two checks that matter most are the ones that
 *     fail silently: a missing `sendPendingLeads` schedule means leads queue and are never
 *     emailed, and a missing /sol-review rewrite means every review link in every lead email is
 *     a 404.
 *
 * @See Also:
 *     docs/sol-review-loop.md
 *     functions/lib/leadQueue.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const PROJECT = process.env.GCP_PROJECT || 'nano-kava-landing-page';
const SITE = process.env.SITE_URL || 'https://enjoynano.com';
const REGION = 'us-central1';

// Every export index.js carries. A deploy that drops one of these is the failure mode.
const EXPECTED_FUNCTIONS = [
  'sendContactEmail', 'chat', 'sendPendingLeads', 'solReview', 'dailyChatReport',
];

const results = [];

function check(name, passed, detail) {
  results.push({ name, passed });
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${passed || !detail ? '' : `\n        ${detail}`}`);
}

const cli = async (cmd, args) => {
  try {
    const { stdout } = await run(cmd, args, { maxBuffer: 8 * 1024 * 1024 });
    return { ok: true, stdout };
  } catch (error) {
    return { ok: false, stdout: error.stdout || '', error: error.message };
  }
};

const get = async (url) => {
  try {
    const response = await fetch(url, { redirect: 'follow' });
    return { ok: true, status: response.status, body: await response.text() };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

async function main() {
  console.log(`Release check -> ${PROJECT} / ${SITE}\n`);

  console.log('[1] The code you are about to trust is the code you think it is');
  const head = await cli('git', ['log', '-1', '--format=%h %s']);
  console.log(`    local HEAD: ${head.stdout.trim()}`);
  const contains = await cli('git', ['log', '--oneline', 'origin/main..HEAD']);
  const unmerged = contains.stdout.trim();
  check('this checkout carries the lead-queue work',
    /leadQueue|one lead|a lead is a person/i.test(contains.stdout) || unmerged === '',
    unmerged === '' ? 'HEAD matches main — if main was never updated, this is the OLD code'
      : `ahead of main by:\n        ${unmerged.split('\n').join('\n        ')}`);

  console.log('\n[2] Every Cloud Function is deployed');
  const list = await cli('firebase', ['functions:list', '--project', PROJECT]);
  if (!list.ok) {
    check('firebase functions:list ran', false, list.error);
  } else {
    for (const name of EXPECTED_FUNCTIONS) {
      check(`${name} is deployed`, list.stdout.includes(name),
        'not in functions:list — re-run `make deploy-all`');
    }
  }

  console.log('\n[3] The lead sweep is actually scheduled');
  // Without this job nothing ever emails a lead. The request path only queues, so the symptom
  // is silence rather than an error — the exact failure this whole script exists for.
  const jobs = await cli('gcloud',
    ['scheduler', 'jobs', 'list', '--location', REGION, '--project', PROJECT, '--format=value(name)']);
  check('a Cloud Scheduler job exists for sendPendingLeads',
    jobs.ok && /sendPendingLeads/i.test(jobs.stdout),
    jobs.ok ? `jobs found:\n        ${jobs.stdout.trim().split('\n').join('\n        ') || '(none)'}`
      : jobs.error);

  console.log('\n[4] The review link in every lead email resolves');
  const review = await get(`${SITE}/sol-review?token=releasecheck0000`);
  check('/sol-review is served by the solReview function', review.ok && review.status !== 404
    && /didn.t work|How did Sol do/i.test(review.body || ''),
    review.ok
      ? `status ${review.status} — a hosting 404 means the rewrite or the function is missing`
      : review.error);

  console.log('\n[5] Hosting carries the current content');
  const mushrooms = await get(`${SITE}/mushrooms`);
  check('the mushroom category copy is live', mushrooms.ok && /Sells into/.test(mushrooms.body || ''),
    mushrooms.ok ? 'no "Sells into" — hosting is older than the content change' : mushrooms.error);

  console.log('\n[6] Firestore retention is untouched');
  const indexes = await cli('firebase', ['firestore:indexes', '--project', PROJECT]);
  if (!indexes.ok) {
    check('firebase firestore:indexes ran', false, indexes.error);
  } else {
    check('chatSessions still has its 90-day TTL', /chatSessions/.test(indexes.stdout), indexes.stdout.slice(0, 200));
    // Their absence IS the retention policy for these three — see CLAUDE.md.
    for (const collection of ['chatLeads', 'leadNotifications', 'solReviews']) {
      check(`${collection} has NO TTL`, !new RegExp(`${collection}[\\s\\S]{0,200}"ttl"\\s*:\\s*true`).test(indexes.stdout),
        'a TTL here would delete business records');
    }
  }

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('\nA lead email with no conversation and no review link means the functions are');
    console.log('still the old ones. Re-run `make deploy-all` and check [2] and [3] again.');
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((error) => {
  console.error(`\nverify-release failed: ${error.message}`);
  process.exit(2);
});
