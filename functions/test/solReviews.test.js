/**
 * @file: functions/test/solReviews.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The permanent half of the feedback loop: that a conversation is copied out from under the
 *     90-day TTL, that a review attaches to that copy, and that what comes out the other end is
 *     a prompt block LIVEY could be handed as-is. The three properties the corpus is worth
 *     nothing without.
 *
 * @See Also:
 *     functions/lib/solReviews.js
 *     docs/sol-review-loop.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import { describe, it, expect } from 'vitest';
import {
  REVIEWS_COLLECTION,
  TOKENS_COLLECTION,
  normalizeReview,
  hasSubstance,
  verdictFor,
  isValidToken,
  buildTraining,
  archiveForReview,
  resolveReviewToken,
  loadReview,
  saveReview,
  recordRating,
} from '../lib/solReviews.js';

function fakeDb(seed = {}) {
  const docs = new Map(Object.entries(seed));
  return {
    docs,
    collection: (name) => ({
      doc: (id) => ({
        path: `${name}/${id}`,
        async get() {
          return { exists: docs.has(`${name}/${id}`), data: () => docs.get(`${name}/${id}`) };
        },
      }),
    }),
    async runTransaction(fn) {
      return fn({
        get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
        set: (ref, data) => { docs.set(ref.path, data); },
      });
    },
  };
}

const SID = 'session-review01';
const NOW = new Date('2026-09-19T15:00:00.000Z');
const LATER = new Date('2026-09-20T09:00:00.000Z');
const stored = (db) => db.docs.get(`${REVIEWS_COLLECTION}/${SID}`);

const MESSAGES = [
  { role: 'user', text: 'Do you have anything for a sleep seltzer?' },
  { role: 'model', text: 'Nano Kava runs 30 mg/mL and goes clear in water.' },
  { role: 'user', text: 'Will it help me sleep?' },
  { role: 'model', text: "That's a claim I can't make. Josh can talk formulation though." },
];

const archive = (db, now = NOW) => archiveForReview({
  db,
  sessionId: SID,
  lead: { name: 'Priya Raman', company: 'Saltmarsh', interest: 'Kavalactone Nanoemulsion' },
  messages: MESSAGES,
  page: '/mushrooms',
  startedAt: now,
  now,
});

describe('normalizeReview', () => {
  it('keeps the declared answers and drops everything else', () => {
    const review = normalizeReview({
      rating: '4', accuracy: 'mostly', tone: 'pushy', tags: ['pricing', 'nonsense'],
      didWell: '  held the compliance line  ', isAdmin: true, __proto__: { x: 1 },
    });

    expect(review.rating).toBe(4);
    expect(review.verdict).toBe('good');
    expect(review.accuracy).toBe('mostly');
    expect(review.tags).toEqual(['pricing']);
    expect(review.didWell).toBe('held the compliance line');
    expect(review.isAdmin).toBeUndefined();
    expect(review.x).toBeUndefined();
  });

  it('refuses a value that is not one of the offered choices', () => {
    expect(normalizeReview({ tone: 'excellent' }).tone).toBeNull();
    expect(normalizeReview({ rating: 9 }).rating).toBeNull();
    expect(normalizeReview({ rating: 2.5 }).rating).toBeNull();
  });

  it('nulls every absent field, because Firestore throws on undefined', () => {
    const review = normalizeReview({});
    for (const [key, value] of Object.entries(review)) {
      expect(value, `${key} must not be undefined`).not.toBeUndefined();
    }
  });

  it('clips a note somebody pasted a novel into', () => {
    expect(normalizeReview({ idealReply: 'x'.repeat(99999) }).idealReply).toHaveLength(4000);
  });

  it('scores 4-5 good, 3 mixed, 1-2 bad', () => {
    expect([1, 2, 3, 4, 5].map(verdictFor)).toEqual(['bad', 'bad', 'mixed', 'good', 'good']);
    expect(verdictFor(null)).toBeNull();
  });

  it('knows an empty form from a real one', () => {
    expect(hasSubstance(normalizeReview({}))).toBe(false);
    expect(hasSubstance(normalizeReview({ rating: 3 }))).toBe(true);
    expect(hasSubstance(normalizeReview({ doDifferently: 'be shorter' }))).toBe(true);
  });
});

describe('archiving a conversation', () => {
  it('copies the transcript into a document with NO expiry', async () => {
    const db = fakeDb();
    const result = await archive(db);

    expect(result.ok).toBe(true);
    const doc = stored(db);
    expect(doc.messages).toEqual(MESSAGES);
    expect(doc.lead.name).toBe('Priya Raman');
    expect(doc.status).toBe('pending');
    // The whole reason this collection exists — see the file header.
    expect(doc.expiresAt).toBeUndefined();
  });

  it('mints a token that resolves back to the session', async () => {
    const db = fakeDb();
    const { token } = await archive(db);

    expect(isValidToken(token)).toBe(true);
    expect(db.docs.get(`${TOKENS_COLLECTION}/${token}`)).toMatchObject({ sessionId: SID });
    await expect(resolveReviewToken({ db, token })).resolves.toEqual({ ok: true, sessionId: SID });
  });

  it('keeps the same token when the same conversation is archived twice', async () => {
    const db = fakeDb();
    const first = await archive(db);
    const second = await archive(db, LATER);

    expect(second.token).toBe(first.token);
    expect([...db.docs.keys()].filter((k) => k.startsWith(TOKENS_COLLECTION))).toHaveLength(1);
  });

  it('never clobbers a review that has already been filed', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, sessionId: SID, answers: { rating: 2, doDifferently: 'be shorter' }, now: NOW });
    await archive(db, LATER);

    expect(stored(db).review.rating).toBe(2);
    expect(stored(db).status).toBe('reviewed');
  });

  it('turns away a session id that could escape its own document path', async () => {
    const db = fakeDb();
    await expect(archiveForReview({ db, sessionId: '../../etc' }))
      .resolves.toMatchObject({ ok: false, reason: 'invalid-session-id' });
    expect(db.docs.size).toBe(0);
  });

  it('refuses a token it never minted', async () => {
    const db = fakeDb();
    await expect(resolveReviewToken({ db, token: 'not-a-real-token-at-all' }))
      .resolves.toMatchObject({ ok: false, reason: 'unknown-token' });
    await expect(resolveReviewToken({ db, token: '../x' }))
      .resolves.toMatchObject({ ok: false, reason: 'invalid-token' });
  });
});

describe('filing a review', () => {
  it('attaches the verdict to the archived copy and builds the training example', async () => {
    const db = fakeDb();
    await archive(db);

    const saved = await saveReview({
      db,
      sessionId: SID,
      answers: {
        rating: 2, tone: 'pushy', compliance: 'borderline', handoffTiming: 'too-early',
        accuracy: 'mostly', leadQuality: 'real', tags: ['compliance', 'dosing'],
        doDifferently: 'Answer the sleep question by declining, then pivot to format.',
        idealReply: "I can't speak to effects — but for a seltzer, 30 mg/mL goes in clear.",
        reviewer: 'Stephen',
      },
      now: LATER,
    });

    expect(saved.ok).toBe(true);
    const doc = stored(db);
    expect(doc.status).toBe('reviewed');
    expect(doc.reviewedAt).toEqual(LATER);
    expect(doc.review.verdict).toBe('bad');
    // Still the archived conversation, not a second copy of it.
    expect(doc.messages).toEqual(MESSAGES);
    expect(doc.training.conversation).toEqual(MESSAGES);
    expect(doc.expiresAt).toBeUndefined();
  });

  it('renders a prompt block that carries the correction and the warnings', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({
      db,
      sessionId: SID,
      answers: {
        rating: 2, tone: 'pushy', compliance: 'violation', handoffTiming: 'too-early',
        idealReply: 'Decline the effects question, then ask about format.',
        doDifferently: 'Stop selling once they ask a health question.',
        tags: ['compliance'],
      },
      now: LATER,
    });

    const { promptBlock } = stored(db).training;
    expect(promptBlock).toContain('2/5');
    expect(promptBlock).toContain('/mushrooms');
    expect(promptBlock).toContain('Decline the effects question');
    expect(promptBlock).toContain('Health claims and personal dosing advice');
    expect(promptBlock).toContain('Tags: compliance');
    // The transcript has to be IN the block, or the lesson has no situation attached to it.
    expect(promptBlock).toContain('Will it help me sleep?');
  });

  it('stores the text a future embedding would be computed over', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, sessionId: SID, answers: { rating: 3, idealReply: 'Ask about format first.' } });

    const { embeddingText, embedding, embeddingModel } = stored(db).training;
    expect(embeddingText).toContain('Will it help me sleep?');
    expect(embeddingText).toContain('Ask about format first.');
    expect(embedding).toBeNull();
    expect(embeddingModel).toBeNull();
  });

  it('refuses a form with nothing in it', async () => {
    const db = fakeDb();
    await archive(db);
    await expect(saveReview({ db, sessionId: SID, answers: { reviewer: 'Stephen' } }))
      .resolves.toMatchObject({ ok: false, reason: 'empty-review' });
    expect(stored(db).status).toBe('pending');
  });

  it('keeps a one-click rating when the long form omits the score', async () => {
    const db = fakeDb();
    await archive(db);
    await recordRating({ db, sessionId: SID, rating: 5, now: NOW });
    await saveReview({ db, sessionId: SID, answers: { doDifferently: 'nothing' }, now: LATER });

    expect(stored(db).review.rating).toBe(5);
    expect(stored(db).review.verdict).toBe('good');
  });

  it('lets a review be revised without losing the first reviewedAt', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, sessionId: SID, answers: { rating: 2 }, now: NOW });
    await saveReview({ db, sessionId: SID, answers: { rating: 4 }, now: LATER });

    expect(stored(db).review.rating).toBe(4);
    expect(stored(db).reviewedAt).toEqual(NOW);
  });
});

describe('the one-click rating in the email', () => {
  it('stores a score on its own, without a questionnaire', async () => {
    const db = fakeDb();
    await archive(db);
    const result = await recordRating({ db, sessionId: SID, rating: '4', now: LATER });

    expect(result.ok).toBe(true);
    expect(stored(db).review.rating).toBe(4);
    // A tapped star must not read as a filled-in form when the corpus is filtered.
    expect(stored(db).status).toBe('rated');
    expect(stored(db).ratedAt).toEqual(LATER);
  });

  it('cannot demote a conversation that has a full review on it', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, sessionId: SID, answers: { rating: 2, doDifferently: 'x' }, now: NOW });
    await recordRating({ db, sessionId: SID, rating: 5, now: LATER });

    expect(stored(db).status).toBe('reviewed');
    expect(stored(db).review.doDifferently).toBe('x');
  });

  it('ignores a rating outside the scale', async () => {
    const db = fakeDb();
    await archive(db);
    await expect(recordRating({ db, sessionId: SID, rating: '11' }))
      .resolves.toMatchObject({ ok: false, reason: 'invalid-rating' });
  });
});

describe('buildTraining without a stored document', () => {
  it('survives a conversation whose transcript never made it', () => {
    const training = buildTraining({
      sessionId: SID,
      page: null,
      lead: null,
      messages: undefined,
      review: normalizeReview({ rating: 1, tone: 'stiff' }),
      recordedAt: NOW,
    });

    expect(training.conversation).toEqual([]);
    expect(training.verdict).toBe('bad');
    expect(training.promptBlock).toContain('1/5');
  });
});
