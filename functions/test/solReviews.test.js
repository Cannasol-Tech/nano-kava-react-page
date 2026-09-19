/**
 * @file: functions/test/solReviews.test.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The permanent half of the feedback loop: that a lead's conversations are copied out from
 *     under the 90-day TTL, that a scored review attaches to that copy, and that what comes out
 *     the other end is a prompt block LIVEY could be handed as-is. Also pins the scoring rules
 *     that make a month of reviews comparable — one direction, a fixed set of questions, and an
 *     average that excludes the question about the prospect rather than Sol.
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
  SCALES,
  SOL_SCALES,
  normalizeReview,
  hasSubstance,
  verdictFor,
  averageOf,
  isValidToken,
  reviewIdFor,
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

const CONTACT_KEY = 'e_0123456789abcdef0123456789abcdef';
const REVIEW_ID = reviewIdFor(CONTACT_KEY, 0);
const NOW = new Date('2026-09-19T15:00:00.000Z');
const LATER = new Date('2026-09-20T09:00:00.000Z');
const stored = (db, id = REVIEW_ID) => db.docs.get(`${REVIEWS_COLLECTION}/${id}`);

const MESSAGES = [
  { role: 'user', text: 'Do you have anything for a sleep seltzer?' },
  { role: 'model', text: 'Nano Kava runs 30 mg/mL and goes clear in water.' },
  { role: 'user', text: 'Will it help me sleep?' },
  { role: 'model', text: "That's a claim I can't make. Josh can talk formulation though." },
];

const archive = (db, overrides = {}) => archiveForReview({
  db,
  contactKey: CONTACT_KEY,
  sequence: 0,
  contact: {
    name: 'Kelsy Bass', company: 'TreeOf12', email: 'kelsy@treeof12.co',
    types: ['Request Samples', 'Partnership Inquiry'],
  },
  submissions: [
    { source: 'chat', at: NOW, message: 'Kavalactone Nanoemulsion' },
    { source: 'form', at: NOW, message: 'I want to go business-to-business.' },
  ],
  conversations: [{ sessionId: 'session-aaaaaaa1', page: '/mushrooms', startedAt: NOW, messages: MESSAGES }],
  now: NOW,
  ...overrides,
});

describe('the scoring rules', () => {
  it('asks the same fixed set of questions every time', () => {
    // Comparability is the whole point: a question added here changes what the corpus means.
    expect(SCALES.map((s) => s.key)).toEqual([
      'overall', 'knowledge', 'tone', 'listening', 'compliance', 'handoff', 'clarity', 'leadQuality',
    ]);
  });

  it('runs every scale in the same direction, so 5 is always good', () => {
    for (const scale of SCALES) {
      expect(scale.low, `${scale.key} has no low label`).toBeTruthy();
      expect(scale.high, `${scale.key} has no high label`).toBeTruthy();
    }
    // Compliance is the one most likely to get flipped by a well-meaning edit.
    const compliance = SCALES.find((s) => s.key === 'compliance');
    expect(compliance.high).toBe('clean');
  });

  it('keeps lead quality out of the average — a junk lead is not Sol failing', () => {
    expect(SOL_SCALES.map((s) => s.key)).not.toContain('leadQuality');

    const scores = { overall: 4, knowledge: 4, leadQuality: 1 };
    expect(averageOf(scores)).toBe(4);
  });

  it('averages only the questions that were actually answered', () => {
    expect(averageOf({ overall: 2, knowledge: 4 })).toBe(3);
    expect(averageOf({ overall: null, knowledge: null })).toBeNull();
  });

  it('reads the verdict off overall, falling back to the average', () => {
    expect(verdictFor({ overall: 5 })).toBe('good');
    expect(verdictFor({ overall: 3 })).toBe('mixed');
    expect(verdictFor({ overall: 1 })).toBe('bad');
    expect(verdictFor({ overall: null, knowledge: 2, tone: 2 })).toBe('bad');
    expect(verdictFor({})).toBeNull();
  });
});

describe('normalizeReview', () => {
  it('keeps a score with its comment and drops everything undeclared', () => {
    const review = normalizeReview({
      overall: '2', tone: '1', toneComment: '  Too salesy.  ',
      tags: ['compliance', 'nonsense'], isAdmin: true, __proto__: { x: 1 },
    });

    expect(review.scores.overall).toBe(2);
    expect(review.scores.tone).toBe(1);
    expect(review.comments.tone).toBe('Too salesy.');
    expect(review.tags).toEqual(['compliance']);
    expect(review.isAdmin).toBeUndefined();
    expect(review.x).toBeUndefined();
  });

  it('refuses a score off the scale', () => {
    expect(normalizeReview({ overall: 9 }).scores.overall).toBeNull();
    expect(normalizeReview({ overall: 0 }).scores.overall).toBeNull();
    expect(normalizeReview({ overall: 2.5 }).scores.overall).toBeNull();
    expect(normalizeReview({ overall: 'excellent' }).scores.overall).toBeNull();
  });

  it('nulls every absent score, because Firestore throws on undefined', () => {
    const review = normalizeReview({});
    for (const [key, value] of Object.entries(review.scores)) {
      expect(value, `scores.${key} must not be undefined`).toBeNull();
    }
    for (const [key, value] of Object.entries(review.comments)) {
      expect(value, `comments.${key} must not be undefined`).toBe('');
    }
  });

  it('clips a comment somebody pasted a novel into', () => {
    expect(normalizeReview({ toneComment: 'x'.repeat(99999) }).comments.tone).toHaveLength(4000);
    expect(normalizeReview({ idealReply: 'x'.repeat(99999) }).idealReply).toHaveLength(4000);
  });

  it('knows an empty form from a real one', () => {
    expect(hasSubstance(normalizeReview({}))).toBe(false);
    expect(hasSubstance(normalizeReview({ reviewer: 'Stephen' }))).toBe(false);
    expect(hasSubstance(normalizeReview({ overall: 3 }))).toBe(true);
    // A comment with no score is still feedback.
    expect(hasSubstance(normalizeReview({ toneComment: 'too pushy' }))).toBe(true);
    expect(hasSubstance(normalizeReview({ doDifferently: 'be shorter' }))).toBe(true);
  });
});

describe('archiving a lead', () => {
  it('copies every conversation into a document with NO expiry', async () => {
    const db = fakeDb();
    const result = await archive(db);

    expect(result.ok).toBe(true);
    const doc = stored(db);
    expect(doc.conversations[0].messages).toEqual(MESSAGES);
    expect(doc.contact.name).toBe('Kelsy Bass');
    expect(doc.submissions).toHaveLength(2);
    expect(doc.status).toBe('pending');
    // The whole reason this collection exists — see the file header.
    expect(doc.expiresAt).toBeUndefined();
  });

  it('mints a token that resolves back to the review', async () => {
    const db = fakeDb();
    const { token } = await archive(db);

    expect(isValidToken(token)).toBe(true);
    expect(db.docs.get(`${TOKENS_COLLECTION}/${token}`)).toMatchObject({ reviewId: REVIEW_ID });
    await expect(resolveReviewToken({ db, token }))
      .resolves.toEqual({ ok: true, reviewId: REVIEW_ID });
  });

  it('gives a second email to the same person its own review', async () => {
    const db = fakeDb();
    const first = await archive(db);
    const second = await archive(db, { sequence: 1 });

    expect(second.reviewId).toBe(reviewIdFor(CONTACT_KEY, 1));
    expect(second.token).not.toBe(first.token);
    expect(stored(db, second.reviewId)).toBeDefined();
  });

  it('keeps the same token when the same email is archived twice', async () => {
    const db = fakeDb();
    const first = await archive(db);
    const second = await archive(db);

    expect(second.token).toBe(first.token);
    expect([...db.docs.keys()].filter((k) => k.startsWith(TOKENS_COLLECTION))).toHaveLength(1);
  });

  it('never clobbers a review that has already been filed', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, reviewId: REVIEW_ID, answers: { overall: 2 }, now: NOW });
    await archive(db);

    expect(stored(db).review.scores.overall).toBe(2);
    expect(stored(db).status).toBe('reviewed');
  });

  it('turns away a contact key that could escape its own document path', async () => {
    const db = fakeDb();
    await expect(archiveForReview({ db, contactKey: '../../etc', sequence: 0 }))
      .resolves.toMatchObject({ ok: false, reason: 'invalid-review-id' });
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
  it('attaches the scores to the archived copy and builds the training example', async () => {
    const db = fakeDb();
    await archive(db);

    const saved = await saveReview({
      db,
      reviewId: REVIEW_ID,
      answers: {
        overall: 2, knowledge: 4, tone: 2, toneComment: 'Read like a brochure.',
        listening: 2, compliance: 2, complianceComment: 'Nearly answered the sleep question.',
        handoff: 3, clarity: 4, leadQuality: 5,
        tags: ['compliance', 'dosing'],
        doDifferently: 'Decline the effects question, then pivot to format.',
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
    expect(doc.review.average).toBeCloseTo(2.71, 2);
    // Still the archived conversation, not a second copy of it.
    expect(doc.conversations[0].messages).toEqual(MESSAGES);
    expect(doc.training.conversations[0].messages).toEqual(MESSAGES);
    expect(doc.expiresAt).toBeUndefined();
  });

  it('renders a prompt block carrying the scores, the correction and the warnings', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({
      db,
      reviewId: REVIEW_ID,
      answers: {
        overall: 2, tone: 1, toneComment: 'Read like a brochure.', compliance: 1, handoff: 2,
        idealReply: 'Decline the effects question, then ask about format.',
        doDifferently: 'Stop selling once they ask a health question.',
        tags: ['compliance'],
      },
      now: LATER,
    });

    const { promptBlock } = stored(db).training;
    expect(promptBlock).toContain('2/5');
    expect(promptBlock).toContain('/mushrooms');
    expect(promptBlock).toContain('Tone: 1/5 — Read like a brochure.');
    expect(promptBlock).toContain('Decline the effects question');
    expect(promptBlock).toContain('Stop selling once they ask a health question.');
    expect(promptBlock).toContain('Health claims and personal dosing advice');
    expect(promptBlock).toContain('Tags: compliance');
    // The transcript has to be IN the block, or the lesson has no situation attached to it.
    expect(promptBlock).toContain('Will it help me sleep?');
  });

  it('turns a low score into an Avoid line, and leaves a good one alone', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, reviewId: REVIEW_ID, answers: { clarity: 1, knowledge: 5 } });

    const { avoid } = stored(db).training;
    expect(avoid.join(' ')).toContain('needed to be shorter');
    expect(avoid.join(' ')).not.toContain('knowledge base');
  });

  it('stores the text a future embedding would be computed over', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, reviewId: REVIEW_ID, answers: { overall: 3, idealReply: 'Ask about format first.' } });

    const { embeddingText, embedding, embeddingModel } = stored(db).training;
    expect(embeddingText).toContain('Will it help me sleep?');
    expect(embeddingText).toContain('Ask about format first.');
    expect(embedding).toBeNull();
    expect(embeddingModel).toBeNull();
  });

  it('refuses a form with nothing in it', async () => {
    const db = fakeDb();
    await archive(db);
    await expect(saveReview({ db, reviewId: REVIEW_ID, answers: { reviewer: 'Stephen' } }))
      .resolves.toMatchObject({ ok: false, reason: 'empty-review' });
    expect(stored(db).status).toBe('pending');
  });

  it('keeps a one-click score when the long form omits it', async () => {
    const db = fakeDb();
    await archive(db);
    await recordRating({ db, reviewId: REVIEW_ID, rating: 5, now: NOW });
    await saveReview({ db, reviewId: REVIEW_ID, answers: { tone: 4 }, now: LATER });

    expect(stored(db).review.scores.overall).toBe(5);
    expect(stored(db).review.scores.tone).toBe(4);
    expect(stored(db).review.verdict).toBe('good');
  });

  it('keeps a comment the reviser left blank', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, reviewId: REVIEW_ID, answers: { tone: 2, toneComment: 'brochure' } });
    await saveReview({ db, reviewId: REVIEW_ID, answers: { tone: 3 } });

    expect(stored(db).review.scores.tone).toBe(3);
    expect(stored(db).review.comments.tone).toBe('brochure');
  });

  it('lets a review be revised without losing the first reviewedAt', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, reviewId: REVIEW_ID, answers: { overall: 2 }, now: NOW });
    await saveReview({ db, reviewId: REVIEW_ID, answers: { overall: 4 }, now: LATER });

    expect(stored(db).review.scores.overall).toBe(4);
    expect(stored(db).reviewedAt).toEqual(NOW);
  });
});

describe('the one-click score in the email', () => {
  it('stores an overall on its own, without a questionnaire', async () => {
    const db = fakeDb();
    await archive(db);
    const result = await recordRating({ db, reviewId: REVIEW_ID, rating: '4', now: LATER });

    expect(result.ok).toBe(true);
    expect(stored(db).review.scores.overall).toBe(4);
    // A tapped star must not read as a filled-in form when the corpus is filtered.
    expect(stored(db).status).toBe('rated');
    expect(stored(db).ratedAt).toEqual(LATER);
  });

  it('cannot demote a lead that has a full review on it', async () => {
    const db = fakeDb();
    await archive(db);
    await saveReview({ db, reviewId: REVIEW_ID, answers: { overall: 2, doDifferently: 'x' }, now: NOW });
    await recordRating({ db, reviewId: REVIEW_ID, rating: 5, now: LATER });

    expect(stored(db).status).toBe('reviewed');
    expect(stored(db).review.doDifferently).toBe('x');
  });

  it('ignores a rating outside the scale', async () => {
    const db = fakeDb();
    await archive(db);
    await expect(recordRating({ db, reviewId: REVIEW_ID, rating: '11' }))
      .resolves.toMatchObject({ ok: false, reason: 'invalid-rating' });
  });
});

describe('buildTraining without a stored document', () => {
  it('survives a lead whose transcript never made it', () => {
    const training = buildTraining({
      reviewId: REVIEW_ID,
      contact: null,
      conversations: undefined,
      review: normalizeReview({ overall: 1, clarity: 1 }),
      recordedAt: NOW,
    });

    expect(training.conversations).toEqual([]);
    expect(training.verdict).toBe('bad');
    expect(training.promptBlock).toContain('1/5');
  });
});
