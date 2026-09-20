/**
 * @file: functions/test/leadReviewLoop.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The reported bug, reproduced and then pinned: Kelsy Bass used Sol's card at 5:34 and the
 *     contact form at 5:52, and got two emails. The whole loop runs here across every module
 *     that only meets in production — a real chat turn is stored, both submissions are queued,
 *     the sweep sends ONE email carrying both and the conversation, and the link in it resolves
 *     to a permanent record a scored review attaches to.
 *
 * @See Also:
 *     functions/lib/leadQueue.js
 *     functions/lib/leadHandoff.js
 *     functions/lib/solReviews.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

import { persistTranscript, createTranscriptRecorder } from '../lib/chatStore.js';
import { persistLead, LEADS_COLLECTION } from '../lib/chatLeads.js';
import { enqueueSubmission, QUEUE_COLLECTION, QUIET_MS } from '../lib/leadQueue.js';
import { sweepDueLeads } from '../lib/leadHandoff.js';
import { contactKeyFor } from '../lib/leadIdentity.js';
import { resolveReviewToken, loadReview, saveReview, REVIEWS_COLLECTION } from '../lib/solReviews.js';

const require = createRequire(import.meta.url);

const SID = 'session-kelsy001';
const EMAIL = 'jalynnwilllzen@gmail.com';
const PHONE = '18647107608';

const T0 = new Date('2026-09-19T17:20:00.000Z');
const CHAT_AT = new Date('2026-09-19T17:34:00.000Z');
const FORM_AT = new Date('2026-09-19T17:52:00.000Z');
const after = (from, ms) => new Date(from.getTime() + ms);

/** Enough Firestore for the queue's equality query, its range sweep and every transaction. */
function fakeDb() {
  const docs = new Map();
  const ref = (path) => ({
    path,
    async get() { return { exists: docs.has(path), data: () => docs.get(path) }; },
  });

  const rowsIn = (name) => [...docs.entries()]
    .filter(([path]) => path.startsWith(`${name}/`))
    .map(([, data]) => data);

  const query = (name, filters = []) => ({
    where: (field, op, value) => query(name, [...filters, { field, op, value }]),
    limit: () => query(name, filters),
    get: async () => ({
      docs: rowsIn(name)
        .filter((row) => filters.every(({ field, op, value }) => {
          const current = row[field];
          if (op === '==') return current === value;
          if (op === '<=') {
            // Absent means "not in the queue" — the behaviour leadQueue.js depends on.
            if (current === undefined || current === null) return false;
            return current.getTime() <= value.getTime();
          }
          return true;
        }))
        .map((data) => ({ data: () => data })),
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

/** Captures what would go to SendGrid without a key, a network call, or anyone's inbox. */
function loadLeads({ sendImpl } = {}) {
  vi.resetModules();
  const sent = [];
  const send = vi.fn(async (msg) => {
    sent.push(msg);
    if (sendImpl) return sendImpl(msg);
    return [{ statusCode: 202 }];
  });

  require.cache[require.resolve('@sendgrid/mail')] = {
    id: require.resolve('@sendgrid/mail'),
    filename: require.resolve('@sendgrid/mail'),
    loaded: true,
    exports: { setApiKey: vi.fn(), send },
  };
  delete require.cache[require.resolve('../lib/leads.js')];

  const leads = require('../lib/leads.js');
  vi.spyOn(leads.sendgridApiKey, 'value').mockReturnValue('SG.test-key');
  return { leads, sent };
}

/** A real chat turn through the recorder, exactly as index.js wires it. */
async function conversation(db, now = T0) {
  const recorder = createTranscriptRecorder(() => {});
  const history = [{ role: 'user', text: 'Does the kava go clear in a seltzer?' }];
  recorder.emit({ type: 'text', delta: 'Clear at 30 mg/mL — about 20nm.' });
  recorder.emit({
    type: 'lead_proposed',
    fields: { name: 'Kelsy Bass', company: 'TreeOf12', email: EMAIL, interest: 'Kavalactone Nanoemulsion' },
  });
  recorder.emit({ type: 'done' });

  await persistTranscript({ db, sessionId: SID, history, reply: recorder.reply(), page: '/', now });
  await persistLead({ db, sessionId: SID, fields: recorder.lead(), page: '/', now });
}

const chatSubmission = {
  source: 'chat', name: 'Kelsy Bass', email: EMAIL, phone: PHONE, company: 'TreeOf12',
  types: ['Request Samples', 'Sol Chat'], sessionId: SID,
  message: 'Kavalactone Nanoemulsion, Lion\'s Mane Nanoemulsion',
};

// Note the different capitalisation of the company, exactly as the two real emails showed it.
const formSubmission = {
  source: 'form', name: 'Kelsy Bass', email: EMAIL, phone: PHONE, company: 'TreeOF12',
  types: ['Request Samples', 'Pricing & Volume Quotes', 'Formulation Support', 'Partnership Inquiry'],
  message: 'I want to go business-to-business for people.',
};

/** Mailchimp is best-effort and must never decide whether the lead was emailed. */
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'stub' })));
});

const sweep = (db, leads, now, opts = {}) =>
  sweepDueLeads({ db, send: opts.send || leads.sendLead, now });

const teamMail = (sent) => sent.find((m) => Array.isArray(m.to));

describe('the chat card and the contact form are one lead', () => {
  it('sends ONE email for two submissions 18 minutes apart', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await enqueueSubmission({ db, submission: formSubmission, now: FORM_AT });

    // Nothing has gone out yet: the second submission pushed the window forward.
    await sweep(db, leads, after(CHAT_AT, QUIET_MS + 1000));
    expect(sent).toHaveLength(0);

    await sweep(db, leads, after(FORM_AT, QUIET_MS + 1000));

    const team = teamMail(sent);
    expect(sent.filter((m) => Array.isArray(m.to))).toHaveLength(1);
    expect(team.subject).toContain('New Lead (Sol chat + contact form)');
    expect(team.text).toContain('Kavalactone Nanoemulsion');
    expect(team.text).toContain('I want to go business-to-business for people.');
  });

  it('merges every inquiry type the person named across both forms', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await enqueueSubmission({ db, submission: formSubmission, now: FORM_AT });
    await sweep(db, leads, after(FORM_AT, QUIET_MS + 1000));

    const team = teamMail(sent);
    for (const type of ['Request Samples', 'Sol Chat', 'Pricing & Volume Quotes',
      'Formulation Support', 'Partnership Inquiry']) {
      expect(team.text, `${type} missing`).toContain(type);
    }
  });

  it('keys the lead on the person, so a differently-typed company does not split it', async () => {
    const db = fakeDb();
    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await enqueueSubmission({ db, submission: formSubmission, now: FORM_AT });

    const queued = [...db.docs.keys()].filter((k) => k.startsWith(QUEUE_COLLECTION));
    expect(queued).toHaveLength(1);
    expect(queued[0]).toBe(`${QUEUE_COLLECTION}/${contactKeyFor({ email: EMAIL }).key}`);
  });

  it('treats a differently-cased email as the same person', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await enqueueSubmission({
      db, submission: { ...formSubmission, email: '  JaLynnWilllzen@Gmail.com ' }, now: FORM_AT,
    });
    await sweep(db, leads, after(FORM_AT, QUIET_MS + 1000));

    expect(sent.filter((m) => Array.isArray(m.to))).toHaveLength(1);
  });

  it('sends a second email only once the first lead has already gone out', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await sweep(db, leads, after(CHAT_AT, QUIET_MS + 1000));
    expect(sent.filter((m) => Array.isArray(m.to))).toHaveLength(1);

    // A week later, the same person gets in touch again. That IS a new lead email.
    const laterAt = after(CHAT_AT, 7 * 24 * 60 * 60 * 1000);
    await enqueueSubmission({ db, submission: formSubmission, now: laterAt });
    await sweep(db, leads, after(laterAt, QUIET_MS + 1000));

    expect(sent.filter((m) => Array.isArray(m.to))).toHaveLength(2);
    // ...and it gets its own review, rather than overwriting the first.
    const reviews = [...db.docs.keys()].filter((k) => k.startsWith(REVIEWS_COLLECTION));
    expect(reviews).toHaveLength(2);
  });
});

describe('the sweep is the only thing that sends', () => {
  it('sends nothing before the quiet period is up', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await sweep(db, leads, after(CHAT_AT, QUIET_MS - 1000));

    expect(sent).toHaveLength(0);
  });

  it('leaves nothing in the queue once a lead is sent', async () => {
    const db = fakeDb();
    const { leads } = loadLeads();

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await sweep(db, leads, after(CHAT_AT, QUIET_MS + 1000));

    const queued = db.docs.get(`${QUEUE_COLLECTION}/${contactKeyFor({ email: EMAIL }).key}`);
    expect(queued.pending).toEqual([]);
    expect(queued.notifyAfter).toBeUndefined();
    expect(queued.notifyCount).toBe(1);

    // A second sweep with nothing due must not re-send.
    const second = await sweep(db, leads, after(CHAT_AT, QUIET_MS + 60_000));
    expect(second.sent).toBe(0);
  });

  it('puts a failed send back on the queue instead of dropping the lead', async () => {
    const db = fakeDb();
    const { leads } = loadLeads();
    const failing = vi.fn(async () => { throw new Error('Unauthorized'); });

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    const result = await sweep(db, leads, after(CHAT_AT, QUIET_MS + 1000), { send: failing });

    expect(result.failures).toHaveLength(1);
    const queued = db.docs.get(`${QUEUE_COLLECTION}/${contactKeyFor({ email: EMAIL }).key}`);
    expect(queued.pending).toHaveLength(1);
    expect(queued.notifyAfter).toBeInstanceOf(Date);
    expect(queued.notifyCount).toBe(0);

    // The retry, minutes later, delivers it.
    const retry = loadLeads();
    await sweep(db, retry.leads, after(CHAT_AT, QUIET_MS + 10 * 60_000));
    expect(teamMail(retry.sent)).toBeTruthy();
  });

  it('marks the chat lead confirmed when the lead is actually sent', async () => {
    const db = fakeDb();
    const { leads } = loadLeads();
    await conversation(db);

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await sweep(db, leads, after(CHAT_AT, QUIET_MS + 1000));

    expect(db.docs.get(`${LEADS_COLLECTION}/${SID}`).confirmed).toBe(true);
  });
});

describe('what the one email carries', () => {
  it('attaches the conversation to a CONTACT FORM submission, via the session id', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    // The form carries the session id from localStorage but no chat submission of its own.
    await enqueueSubmission({
      db, submission: { ...formSubmission, sessionId: SID }, now: FORM_AT,
    });
    await sweep(db, leads, after(FORM_AT, QUIET_MS + 1000));

    const team = teamMail(sent);
    expect(team.html).toContain('Does the kava go clear in a seltzer?');
    expect(team.attachments).toHaveLength(1);
  });

  it('finds the conversation by email when the form carried no session id at all', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await enqueueSubmission({ db, submission: { ...formSubmission, sessionId: null }, now: FORM_AT });
    await sweep(db, leads, after(FORM_AT, QUIET_MS + 1000));

    expect(teamMail(sent).html).toContain('Does the kava go clear in a seltzer?');
  });

  it('attaches the whole conversation as one markdown file', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await sweep(db, leads, after(CHAT_AT, QUIET_MS + 1000));

    const team = teamMail(sent);
    expect(team.attachments).toHaveLength(1);
    expect(team.attachments[0].type).toBe('text/markdown');
    const attached = Buffer.from(team.attachments[0].content, 'base64').toString('utf8');
    expect(attached).toContain('Does the kava go clear in a seltzer?');
    expect(attached).toContain('Kelsy Bass');
  });

  it('carries a review link that actually resolves', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await sweep(db, leads, after(CHAT_AT, QUIET_MS + 1000));

    const team = teamMail(sent);
    const token = team.html.match(/token=([A-Za-z0-9_-]+)/)?.[1];
    expect(token).toBeTruthy();
    for (const n of [1, 2, 3, 4, 5]) expect(team.html).toContain(`rating=${n}`);

    const resolved = await resolveReviewToken({ db, token });
    expect(resolved.ok).toBe(true);
  });

  it('escapes a transcript a prompt-injected visitor tried to put markup in', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'text', delta: 'Sure.' });
    await persistTranscript({
      db, sessionId: SID, history: [{ role: 'user', text: '<img src=x onerror="alert(1)">' }],
      reply: recorder.reply(), page: '/', now: T0,
    });

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await sweep(db, leads, after(CHAT_AT, QUIET_MS + 1000));

    const team = teamMail(sent);
    expect(team.html).not.toContain('<img src=x');
    expect(team.html).toContain('&lt;img src=x');
  });

  it('still sends a lead whose conversation was never stored', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();

    await enqueueSubmission({ db, submission: { ...formSubmission, sessionId: null }, now: FORM_AT });
    await sweep(db, leads, after(FORM_AT, QUIET_MS + 1000));

    const team = teamMail(sent);
    expect(team).toBeTruthy();
    expect(team.attachments).toBeUndefined();
    expect(team.html).toContain('How did Sol do');
  });
});

describe('from the emailed link to a training example', () => {
  it('opens the archived lead and files a scored review against it', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await enqueueSubmission({ db, submission: chatSubmission, now: CHAT_AT });
    await enqueueSubmission({ db, submission: formSubmission, now: FORM_AT });
    await sweep(db, leads, after(FORM_AT, QUIET_MS + 1000));

    const token = teamMail(sent).html.match(/token=([A-Za-z0-9_-]+)/)[1];

    // What the solReview GET handler does with the token in the link.
    const { reviewId } = await resolveReviewToken({ db, token });
    const opened = await loadReview({ db, reviewId });
    expect(opened.ok).toBe(true);
    expect(opened.review.conversations[0].messages[0].text).toContain('Does the kava go clear');
    expect(opened.review.contact.name).toBe('Kelsy Bass');
    expect(opened.review.submissions).toHaveLength(2);
    expect(opened.review.status).toBe('pending');

    // What the POST does with the filled-in form.
    await saveReview({
      db,
      reviewId,
      answers: {
        overall: '4', knowledge: '5', tone: '3', toneComment: 'A shade brochure-ish.',
        handoff: '4',
        doDifferently: 'Ask the volume before raising the card.',
        reviewer: 'Stephen',
      },
    });

    const filed = db.docs.get(`${REVIEWS_COLLECTION}/${reviewId}`);
    expect(filed.status).toBe('reviewed');
    expect(filed.review.scores.overall).toBe(4);
    expect(filed.review.scores.tone).toBe(3);
    expect(filed.review.comments.tone).toBe('A shade brochure-ish.');
    expect(filed.review.flags.compliance).toBe(false);
    expect(filed.review.average).toBe(4);
    expect(filed.training.promptBlock).toContain('Does the kava go clear');
    expect(filed.training.promptBlock).toContain('Tone: 3/5 — A shade brochure-ish.');
    expect(filed.training.promptBlock).toContain('Ask the volume before raising the card.');
    // The permanent record outlives the transcript it was copied from.
    expect(filed.expiresAt).toBeUndefined();
  });
});
