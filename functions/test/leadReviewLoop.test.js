/**
 * @file: functions/test/leadReviewLoop.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The whole loop, end to end, across every module that only meets in production: a real chat
 *     turn is stored, a visitor presses Send, ONE email goes out carrying the transcript and a
 *     review link, and that link's token resolves to a permanent record a review attaches to.
 *     The two properties worth pinning here are the ones each module's own suite cannot see —
 *     that a second Send sends nothing, and that the link in the email actually opens.
 *
 * @See Also:
 *     functions/lib/leadHandoff.js
 *     functions/lib/leads.js
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
import { prepareChatLead, abandonChatLead } from '../lib/leadHandoff.js';
import { resolveReviewToken, loadReview, saveReview, REVIEWS_COLLECTION } from '../lib/solReviews.js';

const require = createRequire(import.meta.url);

const SID = 'session-loop00001';
const T0 = new Date('2026-09-19T14:00:00.000Z');
const SEND_AT = new Date('2026-09-19T14:06:00.000Z');

function fakeDb() {
  const docs = new Map();
  const ref = (path) => ({
    path,
    async get() { return { exists: docs.has(path), data: () => docs.get(path) }; },
  });
  return {
    docs,
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
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

/** Two real chat turns through the recorder, exactly as index.js wires them. */
async function conversation(db) {
  const recorder = createTranscriptRecorder(() => {});
  const history = [{ role: 'user', text: 'Does the kava go clear in a seltzer?' }];
  recorder.emit({ type: 'text', delta: 'Clear at 30 mg/mL — about 18nm.' });
  recorder.emit({
    type: 'lead_proposed',
    fields: {
      name: 'Priya Raman', company: 'Saltmarsh Drinks', email: 'priya@saltmarsh.co',
      interest: 'Kavalactone Nanoemulsion', conversation_summary: 'Q3 seltzer, wants clarity.',
    },
  });
  recorder.emit({ type: 'done' });

  await persistTranscript({
    db, sessionId: SID, history, reply: recorder.reply(), page: '/mushrooms', now: T0,
  });
  await persistLead({ db, sessionId: SID, fields: recorder.lead(), page: '/mushrooms', now: T0 });
}

const LEAD = {
  name: 'Priya Raman',
  email: 'priya@saltmarsh.co',
  company: 'Saltmarsh Drinks',
  phone: '503-555-0142',
  types: ['Request Samples', 'Sol Chat'],
  message: 'Kavalactone Nanoemulsion\n\n--- Conversation summary ---\nQ3 seltzer, wants clarity.',
};

/** Mailchimp is best-effort and must never decide whether the lead was emailed. */
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => 'stub' })));
});

/** The whole of index.js's chat-lead branch, minus req/res. */
async function submit(db, leads, overrides = {}) {
  const prepared = await prepareChatLead({ db, sessionId: SID, now: SEND_AT });
  if (prepared.alreadyEmailed) return { sent: false, prepared };
  try {
    await leads.sendLead({
      ...LEAD, ...overrides,
      transcript: prepared.transcript,
      reviewToken: prepared.reviewToken,
    });
  } catch (error) {
    await abandonChatLead({ db, sessionId: SID, now: SEND_AT });
    throw error;
  }
  return { sent: true, prepared };
}

describe('one lead, one email', () => {
  it('emails the team once and does not auto-reply to a teammate testing it', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await submit(db, leads, { email: 'stephen.boyett@cannasolusa.com' });

    expect(sent).toHaveLength(1);
    expect(Array.isArray(sent[0].to)).toBe(true);
    expect(sent[0].subject).toContain('New Chat Lead (Sol)');
  });

  it('still auto-replies to an actual visitor', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await submit(db, leads);

    expect(sent).toHaveLength(2);
    expect(sent[1].to).toBe('priya@saltmarsh.co');
    expect(sent[1].subject).toContain('We received your message');
  });

  it('sends nothing at all on a second Send for the same conversation', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await submit(db, leads);
    const second = await submit(db, leads);

    expect(second.sent).toBe(false);
    expect(second.prepared.alreadyEmailed).toBe(true);
    expect(sent).toHaveLength(2); // the first submission's pair, and nothing more
  });

  it('hands the claim back when SendGrid throws, so a retry is not swallowed', async () => {
    const db = fakeDb();
    const failing = loadLeads({ sendImpl: () => { throw new Error('Unauthorized'); } });
    await conversation(db);

    await expect(submit(db, failing.leads)).rejects.toThrow(/Unauthorized/);
    expect(db.docs.get(`${LEADS_COLLECTION}/${SID}`).teamEmailedAt).toBeNull();

    const retry = loadLeads();
    await submit(db, retry.leads);
    expect(retry.sent.length).toBeGreaterThan(0);
  });

  it('marks the lead confirmed even though the email then failed', async () => {
    const db = fakeDb();
    const { leads } = loadLeads({ sendImpl: () => { throw new Error('nope'); } });
    await conversation(db);

    await expect(submit(db, leads)).rejects.toThrow();
    // A human pressed Send. That is true whether or not SendGrid was up.
    expect(db.docs.get(`${LEADS_COLLECTION}/${SID}`).confirmed).toBe(true);
  });
});

describe('what the one email carries', () => {
  it('puts the stored conversation in the body and attaches it as markdown', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    await submit(db, leads);
    const team = sent.find((m) => Array.isArray(m.to));

    expect(team.html).toContain('Does the kava go clear in a seltzer?');
    expect(team.text).toContain('Clear at 30 mg/mL');

    expect(team.attachments).toHaveLength(1);
    const attached = Buffer.from(team.attachments[0].content, 'base64').toString('utf8');
    expect(team.attachments[0].filename).toBe(`sol-conversation-${SID}.md`);
    expect(team.attachments[0].type).toBe('text/markdown');
    expect(attached).toContain('Does the kava go clear in a seltzer?');
    expect(attached).toContain('Priya Raman');
  });

  it('carries a review link that actually resolves', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    await conversation(db);

    const { prepared } = await submit(db, leads);
    const team = sent.find((m) => Array.isArray(m.to));

    expect(team.html).toContain(`token=${prepared.reviewToken}`);
    expect(team.text).toContain(`token=${prepared.reviewToken}`);
    // Five one-click scores plus the button.
    for (const n of [1, 2, 3, 4, 5]) expect(team.html).toContain(`rating=${n}`);

    await expect(resolveReviewToken({ db, token: prepared.reviewToken }))
      .resolves.toEqual({ ok: true, sessionId: SID });
  });

  it('escapes a transcript a prompt-injected visitor tried to put markup in', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'text', delta: 'Sure.' });
    await persistTranscript({
      db,
      sessionId: SID,
      history: [{ role: 'user', text: '<img src=x onerror="alert(1)">' }],
      reply: recorder.reply(),
      page: '/',
      now: T0,
    });

    await submit(db, leads);
    const team = sent.find((m) => Array.isArray(m.to));

    expect(team.html).not.toContain('<img src=x');
    expect(team.html).toContain('&lt;img src=x');
  });

  it('sends a form lead with no transcript, no attachment and no review link', async () => {
    const { leads, sent } = loadLeads();
    await leads.sendLead({ ...LEAD, types: ['General Inquiry'] });

    const team = sent.find((m) => Array.isArray(m.to));
    expect(team.attachments).toBeUndefined();
    expect(team.html).not.toContain('sol-review');
    expect(team.html).not.toContain('How did Sol do');
  });
});

describe('from the emailed link to a training example', () => {
  it('opens the archived conversation and files a review against it', async () => {
    const db = fakeDb();
    const { leads } = loadLeads();
    await conversation(db);
    const { prepared } = await submit(db, leads);

    // What the solReview GET handler does with the token in the link.
    const { sessionId } = await resolveReviewToken({ db, token: prepared.reviewToken });
    const opened = await loadReview({ db, sessionId });
    expect(opened.ok).toBe(true);
    expect(opened.review.messages[0].text).toContain('Does the kava go clear');
    expect(opened.review.lead.name).toBe('Priya Raman');
    expect(opened.review.status).toBe('pending');

    // What the POST does with the filled-in form.
    await saveReview({
      db,
      sessionId,
      answers: {
        rating: '4', accuracy: 'accurate', handoffTiming: 'right', tone: 'on-brand',
        compliance: 'clean', leadQuality: 'real', tags: ['formulation', 'particle-size'],
        didWell: 'Led with the number that mattered.',
        idealReply: 'Same, but ask the volume before the card.',
        reviewer: 'Stephen',
      },
    });

    const filed = db.docs.get(`${REVIEWS_COLLECTION}/${SID}`);
    expect(filed.status).toBe('reviewed');
    expect(filed.review.rating).toBe(4);
    expect(filed.training.promptBlock).toContain('Does the kava go clear');
    expect(filed.training.promptBlock).toContain('Same, but ask the volume before the card.');
    expect(filed.training.tags).toEqual(['formulation', 'particle-size']);
    // The permanent record outlives the transcript it was copied from.
    expect(filed.expiresAt).toBeUndefined();
  });

  it('survives a conversation whose transcript was never stored', async () => {
    const db = fakeDb();
    const { leads, sent } = loadLeads();

    const { prepared } = await submit(db, leads);
    const team = sent.find((m) => Array.isArray(m.to));

    // No transcript to attach, but the lead still goes out and is still reviewable.
    expect(team.attachments).toBeUndefined();
    expect(prepared.reviewToken).toBeTruthy();
    expect(team.html).toContain('How did Sol do');
  });
});
