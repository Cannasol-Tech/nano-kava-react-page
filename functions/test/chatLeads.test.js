/**
 * @file: functions/test/chatLeads.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The lead record is a business record, not telemetry: it carries no TTL, it accumulates as
 *     Sol learns more, and `confirmed` is the difference between a model's guess and a human
 *     pressing Send. Those three properties are what these tests pin.
 *
 * @See Also:
 *     functions/lib/chatLeads.js
 *     functions/lib/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  LEADS_COLLECTION,
  normalizeLead,
  persistLead,
  confirmLead,
} from '../lib/chatLeads.js';

function fakeDb(seed = {}) {
  const docs = new Map(Object.entries(seed));
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

const stored = (db, id) => db.docs.get(`${LEADS_COLLECTION}/${id}`);
const NOW = new Date('2026-02-01T12:00:00.000Z');
const LATER = new Date('2026-02-01T12:09:00.000Z');
const SID = 'session-abcdefgh';

describe('normalizeLead', () => {
  it('keeps the fields Sol extracts and drops the blanks', () => {
    expect(normalizeLead({
      name: '  Jo Smith ', company: '', email: 'jo@brand.co', phone: undefined,
      interest: 'nano kava emulsion', reason: 'launching a seltzer',
      conversation_summary: 'Wants 18nm for a Q3 seltzer.',
    })).toEqual({
      name: 'Jo Smith',
      email: 'jo@brand.co',
      interest: 'nano kava emulsion',
      reason: 'launching a seltzer',
      conversationSummary: 'Wants 18nm for a Q3 seltzer.',
    });
  });

  it('ignores anything the tool did not declare', () => {
    expect(normalizeLead({ email: 'a@b.co', isAdmin: true, __proto__: { x: 1 } })).toEqual({
      email: 'a@b.co',
    });
  });

  it('clips a field an injected prompt tried to make enormous', () => {
    expect(normalizeLead({ name: 'x'.repeat(5000) }).name).toHaveLength(200);
  });
});

describe('persistLead', () => {
  it('creates the record unconfirmed — Sol extracted it, nobody pressed Send', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'jo@brand.co' }, page: '/faq', now: NOW });

    const doc = stored(db, SID);
    expect(doc.confirmed).toBe(false);
    expect(doc.email).toBe('jo@brand.co');
    expect(doc.sessionId).toBe(SID);
    expect(doc.page).toBe('/faq');
    expect(doc.firstSeenAt.getTime()).toBe(NOW.getTime());
  });

  it('carries NO expiry — a prospect outlives the transcript', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'jo@brand.co' }, now: NOW });
    expect(stored(db, SID).expiresAt).toBeUndefined();
  });

  it('accumulates as Sol learns more, without losing what it already knew', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { name: 'Jo', interest: 'seltzer' }, now: NOW });
    await persistLead({ db, sessionId: SID, fields: { email: 'jo@brand.co' }, now: LATER });

    const doc = stored(db, SID);
    expect(doc.name).toBe('Jo');
    expect(doc.interest).toBe('seltzer');
    expect(doc.email).toBe('jo@brand.co');
    expect(doc.firstSeenAt.getTime()).toBe(NOW.getTime());
    expect(doc.updatedAt.getTime()).toBe(LATER.getTime());
  });

  it('never blanks a known value with a later empty extraction', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'jo@brand.co' }, now: NOW });
    await persistLead({ db, sessionId: SID, fields: { email: '', name: 'Jo' }, now: LATER });
    expect(stored(db, SID).email).toBe('jo@brand.co');
  });

  it('refuses a malformed session id rather than writing to a path it was handed', async () => {
    const db = fakeDb();
    const result = await persistLead({ db, sessionId: '../../admin', fields: { email: 'a@b.co' } });
    expect(result.ok).toBe(false);
    expect(db.docs.size).toBe(0);
  });

  it('writes nothing when Sol extracted no usable field', async () => {
    const db = fakeDb();
    const result = await persistLead({ db, sessionId: SID, fields: { name: '  ' }, now: NOW });
    expect(result.ok).toBe(false);
    expect(db.docs.size).toBe(0);
  });

  it('never throws — a lost lead record must not cost the visitor their card', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const failing = {
      collection: () => ({ doc: (id) => ({ path: `x/${id}` }) }),
      runTransaction: async () => { throw new Error('PERMISSION_DENIED'); },
    };
    const result = await persistLead({ db: failing, sessionId: SID, fields: { email: 'a@b.co' } });
    expect(result.ok).toBe(false);
    vi.restoreAllMocks();
  });
});

describe('confirmLead', () => {
  it('marks the record confirmed once a human actually pressed Send', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'jo@brand.co' }, now: NOW });
    await confirmLead({ db, sessionId: SID, now: LATER });

    const doc = stored(db, SID);
    expect(doc.confirmed).toBe(true);
    expect(doc.confirmedAt.getTime()).toBe(LATER.getTime());
  });

  it('does not un-confirm a record when Sol later re-extracts', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'jo@brand.co' }, now: NOW });
    await confirmLead({ db, sessionId: SID, now: LATER });
    await persistLead({ db, sessionId: SID, fields: { phone: '216-555-0100' }, now: LATER });

    expect(stored(db, SID).confirmed).toBe(true);
  });

  it('records a confirmation even when no extraction was ever stored', async () => {
    const db = fakeDb();
    await confirmLead({ db, sessionId: SID, now: NOW });
    expect(stored(db, SID).confirmed).toBe(true);
  });

  it('ignores a session id the pattern rejects', async () => {
    const db = fakeDb();
    expect((await confirmLead({ db, sessionId: 'nope' })).ok).toBe(false);
    expect(db.docs.size).toBe(0);
  });
});

describe('accumulating a lead across a real conversation', () => {
  it('builds the record up one extraction at a time', async () => {
    const db = fakeDb();
    const steps = [
      { interest: 'nano kava emulsion' },
      { name: 'Jo' },
      { company: 'Acme Beverages' },
      { email: 'jo@acme.co' },
      { reason: 'Q3 seltzer launch', conversation_summary: 'Wants 18nm, 20k units.' },
    ];
    for (const [i, fields] of steps.entries()) {
      await persistLead({ db, sessionId: SID, fields, now: new Date(NOW.getTime() + i * 60000) });
    }

    const doc = stored(db, SID);
    expect(doc).toMatchObject({
      name: 'Jo', company: 'Acme Beverages', email: 'jo@acme.co',
      interest: 'nano kava emulsion', reason: 'Q3 seltzer launch',
      conversationSummary: 'Wants 18nm, 20k units.', confirmed: false,
    });
    expect(doc.firstSeenAt.getTime()).toBe(NOW.getTime());
  });

  it('keeps the newest value when the visitor corrects Sol', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'typo@acme.co' }, now: NOW });
    await persistLead({ db, sessionId: SID, fields: { email: 'jo@acme.co' }, now: LATER });
    expect(stored(db, SID).email).toBe('jo@acme.co');
  });

  it('confirming twice does not move the original confirmation time', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'jo@acme.co' }, now: NOW });
    await confirmLead({ db, sessionId: SID, now: LATER });
    await confirmLead({ db, sessionId: SID, now: new Date('2026-03-01T00:00:00.000Z') });
    expect(stored(db, SID).confirmedAt.getTime()).toBe(LATER.getTime());
  });

  it('coerces a non-string the model invented rather than storing it raw', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { phone: 2165550100, name: null }, now: NOW });
    const doc = stored(db, SID);
    expect(doc.phone).toBe('2165550100');
    expect(doc.name).toBeUndefined();
  });

  it('carries unicode through untouched', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { company: 'Café Grün 🍹', name: 'Zoë' }, now: NOW });
    expect(stored(db, SID)).toMatchObject({ company: 'Café Grün 🍹', name: 'Zoë' });
  });

  it('holds the page from the first extraction, not the last', async () => {
    const db = fakeDb();
    await persistLead({ db, sessionId: SID, fields: { email: 'a@b.co' }, page: '/mushrooms', now: NOW });
    await persistLead({ db, sessionId: SID, fields: { name: 'Jo' }, page: '/contact', now: LATER });
    expect(stored(db, SID).page).toBe('/mushrooms');
  });
});
