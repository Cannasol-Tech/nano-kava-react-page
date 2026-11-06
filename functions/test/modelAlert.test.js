/**
 * @file: functions/test/modelAlert.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     A refused Gemini call must reach a human once per incident, not once per visitor and not
 *     never. Written after the 2026-10-28 outage, when depleted credits failed every turn for
 *     nine days and nothing said so. See functions/lib/CLAUDE.md § A refused model call alerts
 *     within minutes.
 *
 * @See Also:
 *     functions/lib/modelAlert.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import {
  ALERT_COLLECTION,
  ALERT_DOC,
  modelErrorStatus,
  recordModelError,
  alertDue,
  buildAlertEmail,
  sweepModelAlert,
} from '../lib/modelAlert.js';

const PATH = `${ALERT_COLLECTION}/${ALERT_DOC}`;

function fakeDb() {
  const docs = new Map();
  return {
    docs,
    collection: (name) => ({ doc: (id) => ({ path: `${name}/${id}` }) }),
    async runTransaction(fn) {
      return fn({
        get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
        set: (ref, data) => { docs.set(ref.path, data); },
      });
    },
  };
}

/** The shape the SDK throws, as seen on 2026-11-06. */
const depleted = Object.assign(new Error(
  '{"error":{"code":402,"message":"Your prepayment credits are depleted.","status":"RESOURCE_EXHAUSTED"}}',
), { status: 402 });

const T0 = new Date('2026-10-28T06:21:00.000Z');
const at = (mins) => new Date(T0.getTime() + mins * 60_000);

function recordingSender(ok = true) {
  const sent = [];
  const send = async (mail) => {
    sent.push(mail);
    return ok ? { ok: true } : { ok: false, error: 'SendGrid returned 500' };
  };
  return { sent, send };
}

describe('which errors count', () => {
  it('counts a 4xx refusal', () => {
    expect(modelErrorStatus(depleted)).toBe(402);
    expect(modelErrorStatus({ status: 429 })).toBe(429);
    expect(modelErrorStatus({ status: 400 })).toBe(400);
  });

  it('ignores a 5xx and an error that is not an API refusal', () => {
    expect(modelErrorStatus({ status: 503 })).toBeNull();
    expect(modelErrorStatus(new Error('socket hang up'))).toBeNull();
    expect(modelErrorStatus(undefined)).toBeNull();
  });

  it('records nothing for an error that does not count', async () => {
    const db = fakeDb();
    const result = await recordModelError({ db, error: { status: 503 }, now: T0 });
    expect(result).toMatchObject({ ok: true, recorded: false });
    expect(db.docs.has(PATH)).toBe(false);
  });
});

describe('one email per incident', () => {
  it('emails on the first refusal and not again for the next ones', async () => {
    const db = fakeDb();
    const { sent, send } = recordingSender();

    await recordModelError({ db, error: depleted, now: at(0) });
    expect(await sweepModelAlert({ db, send, now: at(3) })).toMatchObject({ ok: true, sent: 'first' });

    await recordModelError({ db, error: depleted, now: at(10) });
    await recordModelError({ db, error: depleted, now: at(40) });
    expect(await sweepModelAlert({ db, send, now: at(45) })).toMatchObject({ ok: true, sent: null });

    expect(sent).toHaveLength(1);
    expect(db.docs.get(PATH).count).toBe(3);
  });

  it('sends nothing when there has never been a refusal', async () => {
    const { sent, send } = recordingSender();
    expect(await sweepModelAlert({ db: fakeDb(), send, now: T0 })).toMatchObject({ ok: true, sent: null });
    expect(sent).toHaveLength(0);
  });

  it('reminds once a day while the refusals continue', async () => {
    const db = fakeDb();
    const { sent, send } = recordingSender();

    await recordModelError({ db, error: depleted, now: at(0) });
    await sweepModelAlert({ db, send, now: at(1) });

    // Visitors keep arriving at least every hour, so it is one incident throughout.
    for (let m = 50; m <= 24 * 60 + 30; m += 50) await recordModelError({ db, error: depleted, now: at(m) });

    expect(await sweepModelAlert({ db, send, now: at(23 * 60) })).toMatchObject({ sent: null });
    expect(await sweepModelAlert({ db, send, now: at(24 * 60 + 2) })).toMatchObject({ sent: 'reminder' });
    expect(sent.map((m) => m.subject)).toEqual([
      'Sol is failing: Gemini returned 402',
      expect.stringMatching(/^Sol is STILL failing: Gemini 402, \d+ chat turns since /),
    ]);
  });

  it('sends no reminder once the refusals have stopped', async () => {
    const db = fakeDb();
    const { sent, send } = recordingSender();

    await recordModelError({ db, error: depleted, now: at(0) });
    await sweepModelAlert({ db, send, now: at(1) });

    expect(await sweepModelAlert({ db, send, now: at(3 * 24 * 60) })).toMatchObject({ sent: null });
    expect(sent).toHaveLength(1);
  });

  it('treats a refusal after an hour of quiet as a new incident', async () => {
    const db = fakeDb();
    const { sent, send } = recordingSender();

    await recordModelError({ db, error: depleted, now: at(0) });
    await sweepModelAlert({ db, send, now: at(1) });

    await recordModelError({ db, error: { status: 403, message: 'API key not valid' }, now: at(180) });
    expect(db.docs.get(PATH)).toMatchObject({ count: 1, lastStatus: 403, notifiedAt: null });
    expect(await sweepModelAlert({ db, send, now: at(182) })).toMatchObject({ sent: 'first' });
    expect(sent.at(-1).subject).toBe('Sol is failing: Gemini returned 403');
  });
});

describe('a failed send', () => {
  it('gives the claim back so the next run tries again', async () => {
    const db = fakeDb();
    await recordModelError({ db, error: depleted, now: at(0) });

    const failing = recordingSender(false);
    expect(await sweepModelAlert({ db, send: failing.send, now: at(1) }))
      .toMatchObject({ ok: false, reason: 'send-failed' });
    expect(alertDue(db.docs.get(PATH), at(2))).toBe('first');

    const working = recordingSender();
    expect(await sweepModelAlert({ db, send: working.send, now: at(6) })).toMatchObject({ sent: 'first' });
  });
});

describe('never costs the visitor anything', () => {
  it('returns instead of throwing when Firestore is down', async () => {
    const db = { collection: () => ({ doc: () => ({}) }), runTransaction: async () => { throw new Error('UNAVAILABLE'); } };
    await expect(recordModelError({ db, error: depleted, now: T0 })).resolves.toMatchObject({ ok: false });
  });
});

describe('what the email says', () => {
  it('points a billing refusal at AI Studio', () => {
    const mail = buildAlertEmail({
      lastStatus: 402, lastMessage: 'Your prepayment credits are depleted.', count: 1,
      firstSeenAt: T0, lastSeenAt: T0,
    }, 'first');
    expect(mail.to).toEqual(['stephen.boyett@cannasolusa.com']);
    expect(mail.text).toContain('https://ai.studio/projects');
    expect(mail.text).toContain('Your prepayment credits are depleted.');
  });

  it('escapes what Gemini said in the HTML part', () => {
    const mail = buildAlertEmail({ lastStatus: 400, lastMessage: '<b>bad</b>', count: 2, firstSeenAt: T0, lastSeenAt: T0 }, 'first');
    expect(mail.html).not.toContain('<b>bad</b>');
    expect(mail.html).toContain('&lt;b&gt;bad&lt;/b&gt;');
  });

  it('reads Firestore Timestamps, not only Dates', () => {
    const ts = (d) => ({ toDate: () => d });
    expect(alertDue({ notifiedAt: ts(at(0)), lastSeenAt: ts(at(24 * 60 + 5)) }, at(24 * 60 + 6))).toBe('reminder');
  });
});
