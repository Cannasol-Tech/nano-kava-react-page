/**
 * @file: functions/test/leadQueue.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The queue that turns however many submissions a person makes into one email. What matters
 *     here is the identity (a person, not a browser or a form), the window (quiet time, not a
 *     fixed bucket), and the one Firestore subtlety the whole design rests on — `notifyAfter` is
 *     absent rather than null when nothing is pending, because null would match `<= now` and the
 *     sweep would resend every lead it has ever sent, forever.
 *
 * @See Also:
 *     functions/lib/leadQueue.js
 *     functions/lib/leadIdentity.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import {
  QUEUE_COLLECTION,
  QUIET_MS,
  MAX_PENDING,
  normalizeSubmission,
  mergeSubmissions,
  enqueueSubmission,
  dueLeads,
  claimForSend,
  markSent,
  returnToQueue,
} from '../lib/leadQueue.js';
import { contactKeyFor, normalizePhone, normalizeEmail, sessionsForContact } from '../lib/leadIdentity.js';
import { LEADS_COLLECTION } from '../lib/chatLeads.js';

function fakeDb() {
  const docs = new Map();
  const ref = (path) => ({
    path,
    async get() { return { exists: docs.has(path), data: () => docs.get(path) }; },
  });
  const rowsIn = (name) => [...docs.entries()]
    .filter(([path]) => path.startsWith(`${name}/`)).map(([, data]) => data);

  const query = (name, filters = []) => ({
    where: (field, op, value) => query(name, [...filters, { field, op, value }]),
    limit: () => query(name, filters),
    get: async () => ({
      docs: rowsIn(name).filter((row) => filters.every(({ field, op, value }) => {
        const current = row[field];
        if (op === '==') return current === value;
        if (op === '<=') {
          if (current === undefined || current === null) return false;
          return current.getTime() <= value.getTime();
        }
        return true;
      })).map((data) => ({ data: () => data })),
    }),
  });

  return {
    docs,
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`), ...query(name) }),
    async runTransaction(fn) {
      return fn({
        get: async (r) => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }),
        set: (r, data) => { docs.set(r.path, data); },
      });
    },
  };
}

const EMAIL = 'kelsy@treeof12.co';
const KEY = contactKeyFor({ email: EMAIL }).key;
const T0 = new Date('2026-09-19T17:34:00.000Z');
const at = (mins) => new Date(T0.getTime() + mins * 60_000);
const queued = (db) => db.docs.get(`${QUEUE_COLLECTION}/${KEY}`);

const CHAT = { source: 'chat', name: 'Kelsy Bass', email: EMAIL, types: ['Request Samples'], message: 'samples please', sessionId: 'session-kelsy001' };
const FORM = { source: 'form', name: 'Kelsy Bass', email: EMAIL, company: 'TreeOF12', types: ['Partnership Inquiry'], message: 'B2B' };

describe('who a lead is', () => {
  it('is the same person however they typed their email', () => {
    expect(normalizeEmail('  KELSY@TreeOf12.co ')).toBe('kelsy@treeof12.co');
    expect(contactKeyFor({ email: '  KELSY@TreeOf12.co ' }).key).toBe(KEY);
  });

  it('is the same person however they typed their phone', () => {
    expect(normalizePhone('+1 (864) 710-7608')).toBe('8647107608');
    expect(normalizePhone('864-710-7608')).toBe('8647107608');
    expect(contactKeyFor({ phone: '+1 (864) 710-7608' }).key)
      .toBe(contactKeyFor({ phone: '8647107608' }).key);
  });

  it('prefers the email, so one person with two phone formats is not two leads', () => {
    const a = contactKeyFor({ email: EMAIL, phone: '864-710-7608' });
    const b = contactKeyFor({ email: EMAIL, phone: '+18647107608 ext 2' });
    expect(a.key).toBe(b.key);
    expect(a.by).toBe('email');
  });

  it('refuses a short number rather than keying two people together', () => {
    expect(normalizePhone('12345')).toBe('');
    expect(contactKeyFor({ phone: '12345' })).toMatchObject({ ok: false });
  });

  it('has no key for a submission with neither', () => {
    expect(contactKeyFor({})).toMatchObject({ ok: false, reason: 'no-contact-method' });
  });

  it('never puts a raw email in a document path', () => {
    // `.` and `/` are both legal in an address and neither survives a Firestore path.
    expect(KEY).not.toContain('@');
    expect(KEY).toMatch(/^e_[0-9a-f]{32}$/);
  });
});

describe('finding the conversations a person had', () => {
  it('joins by session id and by the email on the stored lead', async () => {
    const db = fakeDb();
    db.docs.set(`${LEADS_COLLECTION}/session-aaaaaaa1`, { sessionId: 'session-aaaaaaa1', email: EMAIL });
    db.docs.set(`${LEADS_COLLECTION}/session-bbbbbbb2`, { sessionId: 'session-bbbbbbb2', email: 'someone@else.co' });

    const found = await sessionsForContact({ db, email: EMAIL, sessionIds: ['session-ccccccc3'] });
    expect(found.sort()).toEqual(['session-aaaaaaa1', 'session-ccccccc3']);
  });

  it('returns what it can when a lookup throws', async () => {
    const db = fakeDb();
    db.collection = () => ({ where: () => ({ get: async () => { throw new Error('boom'); } }) });

    await expect(sessionsForContact({ db, email: EMAIL, sessionIds: ['session-ccccccc3'] }))
      .resolves.toEqual(['session-ccccccc3']);
  });
});

describe('normalizeSubmission', () => {
  it('allow-lists the fields and clips the rest', () => {
    const s = normalizeSubmission({
      source: 'chat', name: '  Kelsy  ', message: 'x'.repeat(99999),
      types: ['a', '', 'b'], isAdmin: true, __proto__: { y: 1 },
    }, T0);

    expect(s.name).toBe('Kelsy');
    expect(s.message).toHaveLength(8000);
    expect(s.types).toEqual(['a', 'b']);
    expect(s.isAdmin).toBeUndefined();
    expect(s.y).toBeUndefined();
  });

  it('falls back to the contact form for an unknown source', () => {
    expect(normalizeSubmission({ source: 'carrier-pigeon' }).source).toBe('form');
  });

  it('drops a session id that could escape its own document path', () => {
    expect(normalizeSubmission({ sessionId: '../../etc' }).sessionId).toBeNull();
  });
});

describe('merging what they sent', () => {
  it('takes the latest value that was actually filled in', () => {
    const merged = mergeSubmissions(KEY, [
      { ...CHAT, at: at(0), company: 'TreeOf12' },
      { ...FORM, at: at(18), company: '' },
    ]);
    // The second submission left company blank; it must not erase the first.
    expect(merged.company).toBe('TreeOf12');
    expect(merged.name).toBe('Kelsy Bass');
  });

  it('unions the inquiry types in first-seen order', () => {
    const merged = mergeSubmissions(KEY, [
      { ...CHAT, at: at(0), types: ['Request Samples', 'Sol Chat'] },
      { ...FORM, at: at(18), types: ['Request Samples', 'Partnership Inquiry'] },
    ]);
    expect(merged.types).toEqual(['Request Samples', 'Sol Chat', 'Partnership Inquiry']);
  });

  it('records both sources, so the email can say the person did both', () => {
    const merged = mergeSubmissions(KEY, [{ ...CHAT, at: at(0) }, { ...FORM, at: at(18) }]);
    expect(merged.sources).toEqual(['chat', 'form']);
  });

  it('orders submissions oldest first however they arrived', () => {
    const merged = mergeSubmissions(KEY, [{ ...FORM, at: at(18) }, { ...CHAT, at: at(0) }]);
    expect(merged.submissions.map((s) => s.source)).toEqual(['chat', 'form']);
  });
});

describe('the quiet window', () => {
  it('pushes the send back on every new submission', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: CHAT, now: T0 });
    expect(queued(db).notifyAfter).toEqual(new Date(T0.getTime() + QUIET_MS));

    await enqueueSubmission({ db, submission: FORM, now: at(18) });
    expect(queued(db).notifyAfter).toEqual(new Date(at(18).getTime() + QUIET_MS));
    expect(queued(db).pending).toHaveLength(2);
  });

  it('does not offer a lead that is still inside its window', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: CHAT, now: T0 });

    const early = await dueLeads({ db, now: new Date(T0.getTime() + QUIET_MS - 1000) });
    expect(early.leads).toHaveLength(0);

    const due = await dueLeads({ db, now: new Date(T0.getTime() + QUIET_MS + 1000) });
    expect(due.leads).toHaveLength(1);
  });

  it('keeps both submissions on one document', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: CHAT, now: T0 });
    await enqueueSubmission({ db, submission: FORM, now: at(18) });

    expect([...db.docs.keys()].filter((k) => k.startsWith(QUEUE_COLLECTION))).toHaveLength(1);
    expect(queued(db).sessionIds).toEqual(['session-kelsy001']);
  });

  it('refuses a submission with no way to identify the person', async () => {
    const db = fakeDb();
    await expect(enqueueSubmission({ db, submission: { ...CHAT, email: '', phone: '' } }))
      .resolves.toMatchObject({ ok: false, reason: 'no-contact-method' });
    expect(db.docs.size).toBe(0);
  });

  it('bounds one document however many times somebody submits', async () => {
    const db = fakeDb();
    for (let i = 0; i < MAX_PENDING + 5; i += 1) {
      await enqueueSubmission({ db, submission: { ...CHAT, message: `m${i}` }, now: at(i) });
    }
    expect(queued(db).pending).toHaveLength(MAX_PENDING);
    // The most recent are the ones kept.
    expect(queued(db).pending.at(-1).message).toBe(`m${MAX_PENDING + 4}`);
  });
});

describe('claiming and sending', () => {
  it('takes the batch out of the queue so a second sweep finds nothing', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: CHAT, now: T0 });

    const first = await claimForSend({ db, contactKey: KEY, now: at(25) });
    expect(first.ok).toBe(true);
    expect(first.batch.submissions).toHaveLength(1);

    const second = await claimForSend({ db, contactKey: KEY, now: at(25) });
    expect(second).toMatchObject({ ok: false, reason: 'nothing-pending' });
  });

  /** The one Firestore subtlety the whole sweep rests on. */
  it('REMOVES notifyAfter rather than nulling it', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: CHAT, now: T0 });
    await claimForSend({ db, contactKey: KEY, now: at(25) });

    expect('notifyAfter' in queued(db)).toBe(false);

    // A null would sort below every timestamp and match `<= now` forever.
    const due = await dueLeads({ db, now: at(999) });
    expect(due.leads).toHaveLength(0);
  });

  it('counts the emails a person has generated, for the review sequence', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: CHAT, now: T0 });
    await claimForSend({ db, contactKey: KEY, now: at(25) });
    await markSent({ db, contactKey: KEY, now: at(25) });

    expect(queued(db).notifyCount).toBe(1);
    expect(queued(db).sending).toEqual([]);
    expect(queued(db).firstNotifiedAt).toEqual(at(25));
  });

  it('puts a failed batch back in front of anything queued since', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: CHAT, now: T0 });
    await claimForSend({ db, contactKey: KEY, now: at(25) });
    await enqueueSubmission({ db, submission: FORM, now: at(26) });

    await returnToQueue({ db, contactKey: KEY, now: at(27) });

    expect(queued(db).pending.map((s) => s.source)).toEqual(['chat', 'form']);
    expect(queued(db).notifyCount).toBe(0);
    // Re-armed on the short retry, not another full quiet period.
    expect(queued(db).notifyAfter.getTime() - at(27).getTime()).toBeLessThan(QUIET_MS);
  });

  it('is a no-op when there is nothing in flight to return', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: CHAT, now: T0 });
    await returnToQueue({ db, contactKey: KEY, now: at(1) });

    expect(queued(db).pending).toHaveLength(1);
    expect(queued(db).notifyAfter).toEqual(new Date(T0.getTime() + QUIET_MS));
  });
});
