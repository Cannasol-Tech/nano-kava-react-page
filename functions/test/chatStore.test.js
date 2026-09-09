/**
 * @file: functions/test/chatStore.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Transcript persistence is unbounded-growth surface twice over — per document (turns) and
 *     per collection (documents) — so the cap and the TTL stamp are the tests that matter. Also
 *     covers the append rule, the session-id gate, and that a Firestore failure cannot take the
 *     chat stream down with it.
 *
 * @See Also:
 *     functions/lib/chatStore.js
 *     functions/lib/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import {
  MAX_TURNS,
  RETENTION_DAYS,
  COLLECTION,
  MAX_TURN_CHARS,
  isValidSessionId,
  capTurns,
  expiresAtFrom,
  persistTranscript,
  createTranscriptRecorder,
} from '../lib/chatStore.js';

const turn = (i, role = i % 2 === 0 ? 'user' : 'model') => ({ role, text: `turn ${i}` });
const conversation = (n) => Array.from({ length: n }, (_, i) => turn(i));

/** In-memory stand-in for the Firestore handle; enough surface for a read-modify-write txn. */
function fakeDb(seed = {}) {
  const docs = new Map(Object.entries(seed));
  return {
    docs,
    writes: 0,
    collection(name) {
      const db = this;
      return { doc: (id) => ({ path: `${name}/${id}`, db }) };
    },
    async runTransaction(fn) {
      return fn({
        get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
        set: (ref, data) => { docs.set(ref.path, data); },
      });
    },
  };
}

const failingDb = () => ({
  collection: () => ({ doc: (id) => ({ path: `x/${id}` }) }),
  runTransaction: async () => { throw new Error('PERMISSION_DENIED'); },
});

const stored = (db, sessionId) => db.docs.get(`${COLLECTION}/${sessionId}`);

describe('capTurns', () => {
  it('keeps a conversation that fits untouched', () => {
    const kept = capTurns(conversation(4));
    expect(kept).toHaveLength(4);
    expect(kept[0]).toEqual({ role: 'user', text: 'turn 0' });
  });

  it('caps a long conversation at MAX_TURNS, keeping the most recent', () => {
    const kept = capTurns(conversation(MAX_TURNS + 25));
    expect(kept).toHaveLength(MAX_TURNS);
    expect(kept.at(-1).text).toBe(`turn ${MAX_TURNS + 24}`);
    expect(kept[0].text).toBe(`turn ${25}`);
  });

  it('caps at 30 exchanges — 60 messages, because a turn is a message', () => {
    // Stephen, 2026-08-26: "30 turns" means 30 user<->Sol pairs, not 30 messages.
    expect(MAX_TURNS).toBe(60);
  });

  it('drops entries that are not usable turns', () => {
    const kept = capTurns([
      { role: 'user', text: 'real' },
      { role: 'user', text: '   ' },
      { role: 'nonsense', text: 'wrong role' },
      { role: 'model', text: 42 },
      null,
      { role: 'model', text: 'also real' },
    ]);
    expect(kept).toEqual([
      { role: 'user', text: 'real' },
      { role: 'model', text: 'also real' },
    ]);
  });

  it('clips a single oversized turn rather than storing it whole', () => {
    const [only] = capTurns([{ role: 'user', text: 'x'.repeat(MAX_TURN_CHARS + 500) }]);
    expect(only.text).toHaveLength(MAX_TURN_CHARS);
  });

  it('survives a non-array', () => {
    expect(capTurns(undefined)).toEqual([]);
    expect(capTurns('nope')).toEqual([]);
  });
});

describe('expiresAtFrom', () => {
  it('is 90 days after the moment the chat was created', () => {
    expect(RETENTION_DAYS).toBe(90);
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    expect(expiresAtFrom(createdAt).toISOString()).toBe('2026-04-01T00:00:00.000Z');
  });

  it('accepts a millisecond stamp as readily as a Date', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    expect(expiresAtFrom(createdAt.getTime()).getTime()).toBe(expiresAtFrom(createdAt).getTime());
  });
});

describe('isValidSessionId', () => {
  it('accepts an opaque url-safe id', () => {
    expect(isValidSessionId('7f3a9c21-4b1e-4a77-9d0c-2b8e5f6a1d34')).toBe(true);
    expect(isValidSessionId('AbC_123-xyz789')).toBe(true);
  });

  it('rejects a Firestore-reserved id, which the charset alone lets through', () => {
    // Firestore forbids any document id matching __.*__ . Such a write THROWS, and
    // persistTranscript swallows throws, so this would silently lose every turn for that
    // visitor. The 8-char floor happens to catch __id__ but not __proto__ or __admin__.
    expect(isValidSessionId('__proto__')).toBe(false);
    expect(isValidSessionId('__admin__')).toBe(false);
    expect(isValidSessionId('__firestore_internal__')).toBe(false);
    // Not reserved: only a matched double-underscore pair at BOTH ends is.
    expect(isValidSessionId('__leading-only')).toBe(true);
    expect(isValidSessionId('trailing-only__')).toBe(true);
  });

  it('rejects anything that could steer a document path or blow the key length', () => {
    expect(isValidSessionId('short')).toBe(false);
    expect(isValidSessionId('has/slash/inside')).toBe(false);
    expect(isValidSessionId('has spaces here')).toBe(false);
    expect(isValidSessionId('..')).toBe(false);
    expect(isValidSessionId('a'.repeat(200))).toBe(false);
    expect(isValidSessionId('')).toBe(false);
    expect(isValidSessionId(undefined)).toBe(false);
    expect(isValidSessionId(123456789)).toBe(false);
  });
});

describe('persistTranscript — first write', () => {
  const now = new Date('2026-02-01T12:00:00.000Z');

  it('stores the whole opening history plus the reply', async () => {
    const db = fakeDb();
    await persistTranscript({
      db,
      sessionId: 'session-aaaaaaaa',
      history: [{ role: 'model', text: 'greeting' }, { role: 'user', text: 'hi' }],
      reply: 'hello back',
      page: '/mushrooms',
      now,
    });

    const doc = stored(db, 'session-aaaaaaaa');
    expect(doc.messages).toEqual([
      { role: 'model', text: 'greeting' },
      { role: 'user', text: 'hi' },
      { role: 'model', text: 'hello back' },
    ]);
    expect(doc.sessionId).toBe('session-aaaaaaaa');
    expect(doc.page).toBe('/mushrooms');
    expect(doc.turnCount).toBe(3);
  });

  it('stamps createdAt, updatedAt and the 90-day expiresAt the TTL policy reads', async () => {
    const db = fakeDb();
    await persistTranscript({ db, sessionId: 'session-bbbbbbbb', history: [{ role: 'user', text: 'hi' }], reply: 'yo', now });

    const doc = stored(db, 'session-bbbbbbbb');
    expect(doc.createdAt.getTime()).toBe(now.getTime());
    expect(doc.updatedAt.getTime()).toBe(now.getTime());
    expect(doc.expiresAt.toISOString()).toBe('2026-05-02T12:00:00.000Z');
  });

  it('caps the opening write too — a client may open with a long replayed history', async () => {
    const db = fakeDb();
    await persistTranscript({ db, sessionId: 'session-cccccccc', history: conversation(60), reply: 'ok', now });
    expect(stored(db, 'session-cccccccc').messages).toHaveLength(MAX_TURNS);
    expect(stored(db, 'session-cccccccc').messages.at(-1)).toEqual({ role: 'model', text: 'ok' });
  });

  it('refuses a malformed session id rather than writing to a path it was handed', async () => {
    const db = fakeDb();
    const result = await persistTranscript({ db, sessionId: '../../admin', history: [{ role: 'user', text: 'hi' }], reply: 'yo', now });
    expect(result.ok).toBe(false);
    expect(db.docs.size).toBe(0);
  });

  it('writes nothing when the turn produced no reply and no history', async () => {
    const db = fakeDb();
    const result = await persistTranscript({ db, sessionId: 'session-dddddddd', history: [], reply: '', now });
    expect(result.ok).toBe(false);
    expect(db.docs.size).toBe(0);
  });
});

describe('persistTranscript — subsequent writes', () => {
  const createdAt = new Date('2026-02-01T12:00:00.000Z');
  const later = new Date('2026-02-01T12:05:00.000Z');

  const seeded = (messages, extra = {}) => fakeDb({
    [`${COLLECTION}/session-eeeeeeee`]: {
      sessionId: 'session-eeeeeeee',
      messages,
      turnCount: messages.length,
      createdAt,
      updatedAt: createdAt,
      expiresAt: expiresAtFrom(createdAt),
      ...extra,
    },
  });

  it('appends only the new exchange, not the whole replayed window', async () => {
    const db = seeded([{ role: 'model', text: 'greeting' }, { role: 'user', text: 'hi' }, { role: 'model', text: 'hello back' }]);
    await persistTranscript({
      db,
      sessionId: 'session-eeeeeeee',
      history: [{ role: 'model', text: 'greeting' }, { role: 'user', text: 'hi' }, { role: 'model', text: 'hello back' }, { role: 'user', text: 'second question' }],
      reply: 'second answer',
      now: later,
    });

    expect(stored(db, 'session-eeeeeeee').messages).toEqual([
      { role: 'model', text: 'greeting' },
      { role: 'user', text: 'hi' },
      { role: 'model', text: 'hello back' },
      { role: 'user', text: 'second question' },
      { role: 'model', text: 'second answer' },
    ]);
  });

  it('drops the oldest turns once the document is at the cap', async () => {
    const db = seeded(conversation(MAX_TURNS));
    await persistTranscript({
      db,
      sessionId: 'session-eeeeeeee',
      history: [...conversation(MAX_TURNS), { role: 'user', text: 'newest question' }],
      reply: 'newest answer',
      now: later,
    });

    const doc = stored(db, 'session-eeeeeeee');
    expect(doc.messages).toHaveLength(MAX_TURNS);
    expect(doc.messages.at(-2)).toEqual({ role: 'user', text: 'newest question' });
    expect(doc.messages.at(-1)).toEqual({ role: 'model', text: 'newest answer' });
    expect(doc.messages.some((m) => m.text === 'turn 0')).toBe(false);
  });

  it('counts every turn the chat ever had, even the ones the cap discarded', async () => {
    const db = seeded(conversation(MAX_TURNS), { turnCount: 44 });
    await persistTranscript({
      db,
      sessionId: 'session-eeeeeeee',
      history: [...conversation(MAX_TURNS), { role: 'user', text: 'q' }],
      reply: 'a',
      now: later,
    });
    expect(stored(db, 'session-eeeeeeee').turnCount).toBe(46);
  });

  it('leaves createdAt and expiresAt alone — retention runs from the start, not the last message', async () => {
    const db = seeded([{ role: 'user', text: 'hi' }]);
    await persistTranscript({
      db,
      sessionId: 'session-eeeeeeee',
      history: [{ role: 'user', text: 'hi' }, { role: 'user', text: 'again' }],
      reply: 'sure',
      now: later,
    });

    const doc = stored(db, 'session-eeeeeeee');
    expect(doc.createdAt.getTime()).toBe(createdAt.getTime());
    expect(doc.expiresAt.getTime()).toBe(expiresAtFrom(createdAt).getTime());
    expect(doc.updatedAt.getTime()).toBe(later.getTime());
  });
});

describe('persistTranscript failure', () => {
  beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('reports failure without throwing — a lost transcript must not cost the visitor their answer', async () => {
    const result = await persistTranscript({
      db: failingDb(),
      sessionId: 'session-ffffffff',
      history: [{ role: 'user', text: 'hi' }],
      reply: 'yo',
    });
    expect(result.ok).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});

describe('createTranscriptRecorder', () => {
  it('passes every frame through untouched — the visitor must not notice it is there', () => {
    const send = vi.fn();
    const recorder = createTranscriptRecorder(send);
    const frames = [
      { type: 'text', delta: 'Nano kava ' },
      { type: 'lead_proposed', fields: { interest: 'seltzer' } },
      { type: 'done', usage: { totalTokenCount: 12 } },
    ];
    frames.forEach(recorder.emit);
    expect(send.mock.calls.map(([f]) => f)).toEqual(frames);
  });

  it('accumulates only the spoken text, in order', () => {
    const recorder = createTranscriptRecorder(() => {});
    [
      { type: 'text', delta: 'Nano kava ' },
      { type: 'tool', name: 'show_nano_explainer', status: 'shown' },
      { type: 'text', delta: 'sits around 18nm.' },
      { type: 'done' },
    ].forEach(recorder.emit);
    expect(recorder.reply()).toBe('Nano kava sits around 18nm.');
  });

  it('reports an empty reply for a turn that only ran tools', () => {
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'sample_quiz' });
    expect(recorder.reply()).toBe('');
  });

  it('works with no downstream sink at all', () => {
    const recorder = createTranscriptRecorder();
    expect(() => recorder.emit({ type: 'text', delta: 'hi' })).not.toThrow();
    expect(recorder.reply()).toBe('hi');
  });
});

describe('persistTranscript session id absence', () => {
  beforeEach(() => { vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('skips quietly when a client simply sent none', async () => {
    const db = fakeDb();
    const result = await persistTranscript({ db, sessionId: null, history: [{ role: 'user', text: 'hi' }], reply: 'yo' });
    expect(result).toEqual({ ok: false, reason: 'no-session-id' });
    expect(console.warn).not.toHaveBeenCalled();
    expect(db.docs.size).toBe(0);
  });

  it('still warns about one that was sent and was wrong', async () => {
    await persistTranscript({ db: fakeDb(), sessionId: '../../admin', history: [{ role: 'user', text: 'hi' }], reply: 'yo' });
    expect(console.warn).toHaveBeenCalled();
  });
});

// Firestore hands back Timestamp, not Date. The update path copies createdAt/expiresAt forward
// verbatim, so this asserts the copy survives the round trip — a Date written over expiresAt
// would still work, but a mangled one would silently disable TTL collection for that document.
describe('persistTranscript against real Firestore Timestamps', () => {
  it('carries a stored Timestamp forward unchanged, and writes a Date the SDK can convert', async () => {
    const { Timestamp } = createRequire(import.meta.url)('firebase-admin/firestore');
    const createdAt = Timestamp.fromDate(new Date('2026-02-01T12:00:00.000Z'));
    const expiresAt = Timestamp.fromDate(new Date('2026-05-02T12:00:00.000Z'));

    const db = fakeDb({
      [`${COLLECTION}/session-99999999`]: {
        sessionId: 'session-99999999', messages: [{ role: 'user', text: 'hi' }],
        turnCount: 1, page: '/', createdAt, updatedAt: createdAt, expiresAt,
      },
    });

    await persistTranscript({
      db,
      sessionId: 'session-99999999',
      history: [{ role: 'user', text: 'hi' }, { role: 'user', text: 'more' }],
      reply: 'sure',
      now: new Date('2026-02-01T12:05:00.000Z'),
    });

    const doc = stored(db, 'session-99999999');
    expect(doc.expiresAt).toBeInstanceOf(Timestamp);
    expect(doc.expiresAt.toDate().toISOString()).toBe('2026-05-02T12:00:00.000Z');
    expect(doc.createdAt.toDate().toISOString()).toBe('2026-02-01T12:00:00.000Z');
  });

  it('stamps a fresh document with a Date that converts to the Timestamp TTL needs', async () => {
    const { Timestamp } = createRequire(import.meta.url)('firebase-admin/firestore');
    const db = fakeDb();
    const now = new Date('2026-02-01T12:00:00.000Z');
    await persistTranscript({ db, sessionId: 'session-88888888', history: [{ role: 'user', text: 'hi' }], reply: 'yo', now });

    const { expiresAt } = stored(db, 'session-88888888');
    expect(expiresAt).toBeInstanceOf(Date);
    expect(Timestamp.fromDate(expiresAt).toDate().toISOString()).toBe('2026-05-02T12:00:00.000Z');
  });
});

// Firestore throws on an undefined field value rather than storing null, and persistTranscript
// swallows throws — so a doc missing a field would lose every subsequent turn *silently*.
describe('persistTranscript against an incomplete existing document', () => {
  it('never writes an undefined field forward', async () => {
    const db = fakeDb({
      [`${COLLECTION}/session-77777777`]: { sessionId: 'session-77777777', messages: [{ role: 'user', text: 'hi' }] },
    });
    const now = new Date('2026-03-01T00:00:00.000Z');

    const result = await persistTranscript({
      db,
      sessionId: 'session-77777777',
      history: [{ role: 'user', text: 'hi' }, { role: 'user', text: 'more' }],
      reply: 'sure',
      page: '/faq',
      now,
    });

    expect(result.ok).toBe(true);
    const doc = stored(db, 'session-77777777');
    expect(Object.entries(doc).filter(([, v]) => v === undefined)).toEqual([]);
  });

  it('back-fills the retention stamps so an unstamped document still expires', async () => {
    const db = fakeDb({
      [`${COLLECTION}/session-66666666`]: { sessionId: 'session-66666666', messages: [{ role: 'user', text: 'hi' }] },
    });
    const now = new Date('2026-03-01T00:00:00.000Z');
    await persistTranscript({ db, sessionId: 'session-66666666', history: [{ role: 'user', text: 'hi' }], reply: 'sure', now });

    const doc = stored(db, 'session-66666666');
    expect(doc.createdAt.getTime()).toBe(now.getTime());
    expect(doc.expiresAt.toISOString()).toBe('2026-05-30T00:00:00.000Z');
  });
});

// The recorder already wraps the SSE sink, and `lead_proposed` already carries every field Sol
// extracted — so the lead record needs no new plumbing through chat.js's tool machinery.
describe('createTranscriptRecorder lead capture', () => {
  it('reports no lead for an ordinary turn', () => {
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'text', delta: 'hello' });
    recorder.emit({ type: 'done' });
    expect(recorder.lead()).toBeNull();
  });

  it('captures the fields Sol extracted when the card is proposed', () => {
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'text', delta: 'Let me get those to Josh. ' });
    recorder.emit({
      type: 'lead_proposed',
      fields: { name: 'Jo', email: 'jo@brand.co', interest: 'nano kava emulsion' },
    });
    expect(recorder.lead()).toEqual({ name: 'Jo', email: 'jo@brand.co', interest: 'nano kava emulsion' });
  });

  it('keeps the most recent proposal when the model corrects itself', () => {
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'lead_proposed', fields: { email: 'wrong@x.co' } });
    recorder.emit({ type: 'lead_proposed', fields: { email: 'right@x.co' } });
    expect(recorder.lead().email).toBe('right@x.co');
  });

  it('still forwards the frame to the panel — capture must not swallow it', () => {
    const seen = [];
    const recorder = createTranscriptRecorder((e) => seen.push(e));
    recorder.emit({ type: 'lead_proposed', fields: { email: 'jo@brand.co' } });
    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('lead_proposed');
  });

  it('survives a malformed frame carrying no fields', () => {
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'lead_proposed' });
    expect(recorder.lead()).toBeNull();
  });
});

/**
 * Cost tracking, added 2026-09-09. Usage was logged per turn and thrown away: Cloud Logging
 * drops it after 30 days, so nothing could say what a conversation or a lead had cost.
 * See CLAUDE.md § What a conversation costs.
 */
describe('what a conversation cost', () => {
  const SESSION = 'session-costaaaa';
  const USAGE = { promptTokenCount: 11159, candidatesTokenCount: 102, cachedContentTokenCount: 8148 };

  it('records the turn the recorder saw on the done frame', () => {
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'text', delta: 'hello' });
    recorder.emit({ type: 'done', usage: USAGE });

    expect(recorder.usage()).toEqual(USAGE);
  });

  it('has no usage to report when the stream failed before the done frame', () => {
    const recorder = createTranscriptRecorder(() => {});
    recorder.emit({ type: 'error', message: 'boom' });

    expect(recorder.usage()).toBeNull();
  });

  it('stores tokens and dollars on the session', async () => {
    const db = fakeDb();
    await persistTranscript({
      db, sessionId: SESSION, history: [{ role: 'user', text: 'hi' }], reply: 'hello', usage: USAGE,
    });

    const stored = db.docs.get(`${COLLECTION}/${SESSION}`);
    expect(stored.usage.promptTokens).toBe(11159);
    expect(stored.usage.cachedTokens).toBe(8148);
    expect(stored.usage.outputTokens).toBe(102);
    expect(stored.usage.turns).toBe(1);
    expect(stored.usage.costUsd).toBeCloseTo(0.0032518, 7);   // gemini-3.8-flash launch rates
  });

  it('accumulates across the turns of one conversation', async () => {
    const db = fakeDb();
    for (const text of ['one', 'two', 'three']) {
      await persistTranscript({
        db, sessionId: SESSION, history: [{ role: 'user', text }], reply: 'ok', usage: USAGE,
      });
    }

    const stored = db.docs.get(`${COLLECTION}/${SESSION}`);
    expect(stored.usage.turns).toBe(3);
    expect(stored.usage.costUsd).toBeCloseTo(0.0032518 * 3, 6);
  });

  // Every session written before this shipped has no usage field; adding to it must not NaN.
  it('starts a total on a document that predates cost tracking', async () => {
    const db = fakeDb({ [`${COLLECTION}/${SESSION}`]: { sessionId: SESSION, messages: [], turnCount: 0 } });
    await persistTranscript({
      db, sessionId: SESSION, history: [{ role: 'user', text: 'hi' }], reply: 'hello', usage: USAGE,
    });

    expect(db.docs.get(`${COLLECTION}/${SESSION}`).usage.turns).toBe(1);
  });

  it('stores a zeroed total rather than nothing when a turn reports no usage', async () => {
    const db = fakeDb();
    await persistTranscript({
      db, sessionId: SESSION, history: [{ role: 'user', text: 'hi' }], reply: 'hello',
    });

    expect(db.docs.get(`${COLLECTION}/${SESSION}`).usage).toEqual(
      { promptTokens: 0, cachedTokens: 0, outputTokens: 0, costUsd: 0, turns: 0 }
    );
  });
});
