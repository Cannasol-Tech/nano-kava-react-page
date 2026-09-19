/**
 * @file: functions/lib/solReviews.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The permanent half of the Sol feedback loop. `chatSessions` is telemetry and expires after
 *     90 days; a reviewed conversation is training data and must outlive it, so every lead email
 *     first COPIES its conversations and submissions into solReviews/{reviewId}, which carries
 *     no TTL. The emailed questionnaire then attaches a human verdict to that copy, scored 1-5
 *     on a fixed set of categories so two reviews a month apart are comparable, and
 *     `buildTraining` renders both into a block LIVEY can be handed verbatim.
 *
 * @See Also:
 *     functions/lib/reviewForm.js
 *     functions/lib/leadHandoff.js
 *     docs/sol-review-loop.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const crypto = require('crypto');
const { chatDb } = require('./chatStore');
const { labelFor, toDate } = require('./transcript');

const REVIEWS_COLLECTION = 'solReviews';
const TOKENS_COLLECTION = 'solReviewTokens';

// 18 bytes -> 24 url-safe chars. The link is the only credential the form has, so it is sized to
// be unguessable rather than to be typed.
const TOKEN_BYTES = 18;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const REVIEW_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const RESERVED_ID_PATTERN = /^__.*__$/;

const MAX_NOTE_CHARS = 4000;
const MAX_SHORT_CHARS = 200;
const MAX_TAGS = 12;

/**
 * Every question is 1-5 and **5 is always good**, compliance included. A scale that flips
 * direction halfway down the page is the reliable way to get a corpus nobody can average.
 *
 * `aboutLead` marks the one question that grades the prospect rather than Sol; it is kept out of
 * the average for the same reason a junk lead is not Sol's fault.
 */
const SCALES = [
  {
    key: 'overall', label: 'Overall',
    question: 'Overall, how well did Sol handle this one?',
    low: 'badly', high: 'excellently',
  },
  {
    key: 'knowledge', label: 'Knowledge',
    question: 'Did it get the product facts right?',
    low: 'got things wrong', high: 'spot on',
    weakness: 'Stating product facts that are not in the knowledge base.',
  },
  {
    key: 'tone', label: 'Tone',
    question: 'Did it sound like us?',
    low: 'off brand', high: 'sounded like us',
    weakness: 'Drifting off the house voice — read the tone notes above.',
  },
  {
    key: 'listening', label: 'Listening',
    question: 'Did it answer what was actually asked?',
    low: 'talked past them', high: 'answered it',
    weakness: 'Answering the question you wanted rather than the one they asked.',
  },
  {
    key: 'compliance', label: 'Compliance',
    question: 'Did it stay clear of health claims and personal dosing advice?',
    low: 'crossed the line', high: 'clean',
    weakness: 'Health claims and personal dosing advice — kava is an ingestible.',
  },
  {
    key: 'handoff', label: 'Handoff',
    question: 'Did it ask for the lead at the right moment?',
    low: 'badly timed', high: 'well judged',
    weakness: 'Raising the sample card at the wrong moment — too eager, or too late.',
  },
  {
    key: 'clarity', label: 'Clarity',
    question: 'Was it easy to follow, and the right length?',
    low: 'waffly', high: 'crisp',
    weakness: 'Padding the reply — this one needed to be shorter and plainer.',
  },
  {
    key: 'leadQuality', label: 'Lead quality',
    question: 'Is this lead worth chasing?',
    low: 'junk', high: 'real buyer',
    aboutLead: true,
  },
];

const SCALE_KEYS = SCALES.map((s) => s.key);
const SOL_SCALES = SCALES.filter((s) => !s.aboutLead);

// A score at or below this is a complaint, and becomes an explicit Avoid line in the prompt.
const WEAK_AT = 2;

const TAGS = [
  'pricing', 'particle-size', 'dosing', 'compliance', 'samples', 'moq', 'timeline',
  'shipping', 'formulation', 'taste', 'competitors', 'off-topic',
];

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

const isValidToken = (token) => typeof token === 'string' && TOKEN_PATTERN.test(token);

const isValidReviewId = (id) =>
  typeof id === 'string' && REVIEW_ID_PATTERN.test(id) && !RESERVED_ID_PATTERN.test(id);

const newToken = () => crypto.randomBytes(TOKEN_BYTES).toString('base64url');

/** One review per email sent, so a second email to the same person is a second review. */
const reviewIdFor = (contactKey, sequence = 0) => `${contactKey}_${Number(sequence) || 0}`;

function normalizeScore(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Sol's own scales only. Lead quality grades the prospect and must not move Sol's average. */
function averageOf(scores) {
  const given = SOL_SCALES.map((s) => scores[s.key]).filter((v) => v !== null && v !== undefined);
  if (given.length === 0) return null;
  return Math.round((given.reduce((a, b) => a + b, 0) / given.length) * 100) / 100;
}

/** Overall when it was answered, otherwise the average of whatever was. */
function verdictFor(scores) {
  const basis = scores.overall ?? averageOf(scores);
  if (basis === null || basis === undefined) return null;
  if (basis >= 4) return 'good';
  if (basis >= 3) return 'mixed';
  return 'bad';
}

/**
 * Allow-listed exactly like `normalizeLead`: these answers arrive from an HTML form over the open
 * internet, so anything undeclared (a `__proto__` key included) must not reach the document.
 */
function normalizeReview(answers) {
  const source = answers || {};

  const scores = {};
  const comments = {};
  for (const { key } of SCALES) {
    scores[key] = normalizeScore(source[key]);
    comments[key] = clip(source[`${key}Comment`], MAX_NOTE_CHARS);
  }

  const tags = (Array.isArray(source.tags) ? source.tags : [source.tags])
    .map((t) => clip(t, 40))
    .filter((t) => TAGS.includes(t));

  return {
    scores,
    comments,
    average: averageOf(scores),
    verdict: verdictFor(scores),
    idealReply: clip(source.idealReply, MAX_NOTE_CHARS),
    doDifferently: clip(source.doDifferently, MAX_NOTE_CHARS),
    reviewer: clip(source.reviewer, MAX_SHORT_CHARS),
    tags: [...new Set(tags)].slice(0, MAX_TAGS),
  };
}

/** A review with nothing in it is not a review; the form must not be able to file an empty one. */
function hasSubstance(review) {
  return Boolean(
    SCALE_KEYS.some((k) => review.scores[k])
    || SCALE_KEYS.some((k) => review.comments[k])
    || review.idealReply
    || review.doDifferently
  );
}

/** A score a human actually gave, keeping the tapped overall when the long form omitted one. */
function mergeScores(incoming, existing) {
  const scores = { ...incoming.scores };
  const comments = { ...incoming.comments };
  for (const key of SCALE_KEYS) {
    if (scores[key] === null && existing?.scores?.[key]) scores[key] = existing.scores[key];
    if (!comments[key] && existing?.comments?.[key]) comments[key] = existing.comments[key];
  }
  return { ...incoming, scores, comments, average: averageOf(scores), verdict: verdictFor(scores) };
}

const excerpt = (messages, limit = 8) =>
  (Array.isArray(messages) ? messages : []).slice(-limit)
    .map((m) => `${labelFor(m.role)}: ${m.text}`).join('\n');

/** Every conversation in the batch, oldest first, as one readable block. */
function conversationText(conversations, limit) {
  return (Array.isArray(conversations) ? conversations : [])
    .map((c) => excerpt(c.messages, limit))
    .filter(Boolean)
    .join('\n---\n');
}

/** The scored lines, in the order the form asks them, skipping anything left blank. */
function scoreLines(review) {
  return SCALES
    .filter(({ key }) => review.scores[key] || review.comments[key])
    .map(({ key, label }) => {
      const score = review.scores[key] ? `${review.scores[key]}/5` : 'not scored';
      const comment = review.comments[key] ? ` — ${review.comments[key]}` : '';
      return `${label}: ${score}${comment}`;
    });
}

/** Derived from the scores, so a complaint reads identically however it was phrased. */
function avoidFrom(review) {
  return SCALES
    .filter((s) => s.weakness && review.scores[s.key] && review.scores[s.key] <= WEAK_AT)
    .map((s) => s.weakness);
}

/**
 * The deliverable: markdown that can be pasted, or programmatically concatenated, into LIVEY's
 * system instruction with no further shaping. Deliberately reads as a worked example rather than
 * as a database row — that is the form a model actually learns from in-context.
 */
function renderPromptBlock({ review, context, conversations, scores, avoid, recordedAt }) {
  const date = recordedAt instanceof Date && !Number.isNaN(recordedAt.getTime())
    ? recordedAt.toISOString().slice(0, 10)
    : 'undated';
  const headline = review.scores.overall
    ? `${review.scores.overall}/5`
    : (review.average ? `avg ${review.average}/5` : 'unscored');

  const lines = [
    `### Reviewed conversation — ${date} · ${headline}${review.verdict ? ` (${review.verdict})` : ''}`,
    '',
    `Context: visitor on ${context.page || 'the site'}`
      + `${context.interest ? `, interested in ${context.interest}` : ''}`
      + `${context.company ? ` (${context.company})` : ''}.`,
    '',
    'What happened:',
    '```',
    conversationText(conversations),
    '```',
    '',
  ];

  if (scores.length) lines.push("Reviewer's scores:", ...scores.map((l) => `- ${l}`), '');
  if (review.doDifferently) {
    lines.push('Do differently:', `- ${review.doDifferently}`, '');
  }
  if (review.idealReply) {
    lines.push('What Sol should have said instead:', `> ${review.idealReply.replace(/\n/g, '\n> ')}`, '');
  }
  if (avoid.length) lines.push('Avoid:', ...avoid.map((a) => `- ${a}`), '');
  if (review.tags.length) lines.push(`Tags: ${review.tags.join(', ')}`);

  return lines.join('\n').trim();
}

/**
 * The text a future embedding would be computed over. Stored now, embedded later: getting the
 * shape right while the corpus is small is what makes the kNN backfill a job rather than a
 * migration. See docs/sol-review-loop.md § Vector retrieval.
 */
function buildEmbeddingText({ review, context, conversations }) {
  return [
    `Page: ${context.page || 'unknown'}`,
    context.interest ? `Interest: ${context.interest}` : null,
    review.tags.length ? `Tags: ${review.tags.join(', ')}` : null,
    'Conversation:',
    conversationText(conversations, 14),
    review.doDifferently ? `Correction: ${review.doDifferently}` : null,
    review.idealReply ? `Ideal reply: ${review.idealReply}` : null,
  ].filter(Boolean).join('\n').slice(0, 8000);
}

/** Joins the archived conversations to the human verdict; this object IS the training example. */
function buildTraining({ reviewId, contact, conversations, review, recordedAt = new Date() }) {
  const context = {
    page: conversations?.[0]?.page || null,
    interest: contact?.types?.join(', ') || null,
    company: contact?.company || null,
    leadQuality: review.scores.leadQuality,
  };
  const copied = (Array.isArray(conversations) ? conversations : []).map((c) => ({
    sessionId: c.sessionId || null,
    page: c.page || null,
    messages: (c.messages || []).map((m) => ({ role: m.role, text: m.text })),
  }));
  const scores = scoreLines(review);
  const avoid = avoidFrom(review);

  return {
    id: reviewId,
    source: 'sol-lead-review',
    recordedAt,
    scores: review.scores,
    comments: review.comments,
    average: review.average,
    verdict: review.verdict,
    context,
    conversations: copied,
    avoid,
    idealReply: review.idealReply || null,
    doDifferently: review.doDifferently || null,
    tags: review.tags,
    promptBlock: renderPromptBlock({
      review, context, conversations: copied, scores, avoid, recordedAt,
    }),
    embeddingText: buildEmbeddingText({ review, context, conversations: copied }),
    // Reserved so the kNN backfill is an UPDATE rather than a schema change. See the doc.
    embedding: null,
    embeddingModel: null,
    embeddedAt: null,
  };
}

/**
 * Copies a lead's conversations somewhere permanent and mints the link the email will carry.
 * Runs at send time rather than at review time on purpose: the transcripts it is copying are on
 * a 90-day clock, and a review filed on day 91 would otherwise have nothing to attach itself to.
 *
 * Never overwrites a review that is already there — re-running it is safe.
 */
async function archiveForReview({
  db = chatDb(), contactKey, sequence = 0, contact, submissions, conversations, now = new Date(),
}) {
  const reviewId = reviewIdFor(contactKey, sequence);
  if (!isValidReviewId(reviewId)) return { ok: false, reason: 'invalid-review-id' };

  try {
    const ref = db.collection(REVIEWS_COLLECTION).doc(reviewId);
    let token = null;

    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;
      token = existing?.token || newToken();

      tx.set(ref, {
        ...(existing || {}),
        reviewId,
        contactKey,
        sequence: Number(sequence) || 0,
        token,
        status: existing?.status || 'pending',
        contact: contact || existing?.contact || null,
        submissions: Array.isArray(submissions) ? submissions : (existing?.submissions || []),
        conversations: Array.isArray(conversations)
          ? conversations.map((c) => ({
            sessionId: c.sessionId || null,
            page: c.page || null,
            startedAt: toDate(c.startedAt) || null,
            messages: Array.isArray(c.messages) ? c.messages : [],
          }))
          : (existing?.conversations || []),
        archivedAt: existing?.archivedAt ?? now,
        updatedAt: now,
        // No expiresAt, deliberately. See the file header.
      });

      if (!existing?.token) {
        tx.set(db.collection(TOKENS_COLLECTION).doc(token), { token, reviewId, createdAt: now });
      }
    });

    return { ok: true, token, reviewId };
  } catch (error) {
    console.error('[solReviews] failed to archive conversation:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/** The emailed link's only credential. Returns the review it unlocks, or nothing. */
async function resolveReviewToken({ db = chatDb(), token }) {
  if (!isValidToken(token)) return { ok: false, reason: 'invalid-token' };
  try {
    const snapshot = await db.collection(TOKENS_COLLECTION).doc(token).get();
    if (!snapshot.exists) return { ok: false, reason: 'unknown-token' };
    const reviewId = snapshot.data()?.reviewId;
    if (!isValidReviewId(reviewId)) return { ok: false, reason: 'unknown-token' };
    return { ok: true, reviewId };
  } catch (error) {
    console.error('[solReviews] failed to resolve token:', error.message);
    return { ok: false, reason: 'read-failed' };
  }
}

/** The archived lead the form renders, so the reviewer grades what they can see. */
async function loadReview({ db = chatDb(), reviewId }) {
  if (!isValidReviewId(reviewId)) return { ok: false, reason: 'invalid-review-id' };
  try {
    const snapshot = await db.collection(REVIEWS_COLLECTION).doc(reviewId).get();
    if (!snapshot.exists) return { ok: false, reason: 'not-found' };
    return { ok: true, review: snapshot.data() };
  } catch (error) {
    console.error('[solReviews] failed to load review:', error.message);
    return { ok: false, reason: 'read-failed' };
  }
}

/**
 * Attaches the human verdict to the archived copy and renders the training example beside it.
 * Both are written in the same transaction: a review whose training block was never built is a
 * row nobody will ever find again.
 */
async function saveReview({ db = chatDb(), reviewId, answers, now = new Date() }) {
  if (!isValidReviewId(reviewId)) return { ok: false, reason: 'invalid-review-id' };

  const submitted = normalizeReview(answers);
  if (!hasSubstance(submitted)) return { ok: false, reason: 'empty-review' };

  try {
    const ref = db.collection(REVIEWS_COLLECTION).doc(reviewId);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;
      const review = mergeScores(submitted, existing?.review);

      tx.set(ref, {
        ...(existing || {}),
        reviewId,
        status: 'reviewed',
        review,
        training: buildTraining({
          reviewId,
          contact: existing?.contact,
          conversations: existing?.conversations,
          review,
          recordedAt: now,
        }),
        reviewedAt: existing?.reviewedAt ?? now,
        updatedAt: now,
      });
    });
    return { ok: true };
  } catch (error) {
    console.error('[solReviews] failed to save review:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/**
 * The stars in the email, which score `overall` and nothing else. One click is the most feedback
 * most leads will ever get, so it is stored on its own rather than discarded unless the long
 * form is also filled in.
 */
async function recordRating({ db = chatDb(), reviewId, rating, now = new Date() }) {
  if (!isValidReviewId(reviewId)) return { ok: false, reason: 'invalid-review-id' };
  const value = normalizeScore(rating);
  if (!value) return { ok: false, reason: 'invalid-rating' };

  try {
    const ref = db.collection(REVIEWS_COLLECTION).doc(reviewId);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;
      const base = existing?.review || normalizeReview({});
      const scores = { ...base.scores, overall: value };

      tx.set(ref, {
        ...(existing || {}),
        reviewId,
        // A tapped star must not read as a filled-in questionnaire when the corpus is filtered.
        status: existing?.status === 'reviewed' ? 'reviewed' : 'rated',
        review: { ...base, scores, average: averageOf(scores), verdict: verdictFor(scores) },
        ratedAt: existing?.ratedAt ?? now,
        updatedAt: now,
      });
    });
    return { ok: true };
  } catch (error) {
    console.error('[solReviews] failed to record rating:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

module.exports = {
  REVIEWS_COLLECTION,
  TOKENS_COLLECTION,
  SCALES,
  SCALE_KEYS,
  SOL_SCALES,
  TAGS,
  WEAK_AT,
  isValidToken,
  isValidReviewId,
  reviewIdFor,
  newToken,
  averageOf,
  verdictFor,
  normalizeReview,
  hasSubstance,
  buildTraining,
  renderPromptBlock,
  buildEmbeddingText,
  archiveForReview,
  resolveReviewToken,
  loadReview,
  saveReview,
  recordRating,
};
