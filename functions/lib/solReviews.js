/**
 * @file: functions/lib/solReviews.js
 * @author: Stephen Boyett
 *
 * @description:
 *     The permanent half of the Sol feedback loop. `chatSessions` is telemetry and expires after
 *     90 days; a reviewed conversation is training data and must outlive it, so every lead email
 *     first COPIES its transcript and lead into solReviews/{sessionId}, which carries no TTL.
 *     The emailed questionnaire then attaches a human verdict to that copy, and `buildTraining`
 *     renders both into a block that can be injected into LIVEY's prompt verbatim.
 *
 * @See Also:
 *     functions/lib/reviewForm.js
 *     functions/lib/chatStore.js
 *     docs/sol-review-loop.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const crypto = require('crypto');
const { isValidSessionId, chatDb } = require('./chatStore');
const { labelFor, toDate } = require('./transcript');

const REVIEWS_COLLECTION = 'solReviews';
const TOKENS_COLLECTION = 'solReviewTokens';

// 18 bytes -> 24 url-safe chars. The link is the only credential the form has, so it is sized to
// be unguessable rather than to be typed.
const TOKEN_BYTES = 18;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

const MAX_NOTE_CHARS = 4000;
const MAX_SHORT_CHARS = 200;
const MAX_TAGS = 12;

/**
 * Closed enums, not free text. The point of this corpus is that it can be filtered and, later,
 * clustered — a field whose values are whatever the reviewer typed can do neither.
 */
const CHOICES = {
  accuracy: ['accurate', 'mostly', 'wrong'],
  handoffTiming: ['too-early', 'right', 'too-late', 'missed'],
  tone: ['on-brand', 'pushy', 'stiff', 'chatty'],
  compliance: ['clean', 'borderline', 'violation'],
  leadQuality: ['real', 'maybe', 'junk'],
};

const TAGS = [
  'pricing', 'particle-size', 'dosing', 'compliance', 'samples', 'moq', 'timeline',
  'shipping', 'formulation', 'taste', 'competitors', 'off-topic',
];

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

const pick = (value, allowed) => (allowed.includes(String(value)) ? String(value) : null);

/** 4-5 good, 3 mixed, 1-2 bad. One axis the corpus can always be sorted on. */
function verdictFor(rating) {
  if (!rating) return null;
  if (rating >= 4) return 'good';
  if (rating === 3) return 'mixed';
  return 'bad';
}

function normalizeRating(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

const isValidToken = (token) => typeof token === 'string' && TOKEN_PATTERN.test(token);

const newToken = () => crypto.randomBytes(TOKEN_BYTES).toString('base64url');

/**
 * Allow-listed exactly like `normalizeLead`: these answers arrive from an HTML form over the open
 * internet, so anything undeclared (a `__proto__` key included) must not reach the document.
 */
function normalizeReview(answers) {
  const source = answers || {};
  const rating = normalizeRating(source.rating);

  const tags = (Array.isArray(source.tags) ? source.tags : [source.tags])
    .map((t) => clip(t, 40))
    .filter((t) => TAGS.includes(t));

  const review = {
    rating,
    verdict: verdictFor(rating),
    accuracy: pick(source.accuracy, CHOICES.accuracy),
    handoffTiming: pick(source.handoffTiming, CHOICES.handoffTiming),
    tone: pick(source.tone, CHOICES.tone),
    compliance: pick(source.compliance, CHOICES.compliance),
    leadQuality: pick(source.leadQuality, CHOICES.leadQuality),
    accuracyNotes: clip(source.accuracyNotes, MAX_NOTE_CHARS),
    complianceNotes: clip(source.complianceNotes, MAX_NOTE_CHARS),
    didWell: clip(source.didWell, MAX_NOTE_CHARS),
    doDifferently: clip(source.doDifferently, MAX_NOTE_CHARS),
    idealReply: clip(source.idealReply, MAX_NOTE_CHARS),
    reviewer: clip(source.reviewer, MAX_SHORT_CHARS),
    tags: [...new Set(tags)].slice(0, MAX_TAGS),
  };

  // Firestore throws on undefined, and every caller here swallows throws — so null, never absent.
  return Object.fromEntries(Object.entries(review).map(([k, v]) => [k, v === undefined ? null : v]));
}

/** A review with nothing in it is not a review; the form must not be able to file an empty one. */
function hasSubstance(review) {
  return Boolean(
    review.rating
    || review.accuracy || review.handoffTiming || review.tone || review.compliance
    || review.leadQuality
    || review.accuracyNotes || review.complianceNotes
    || review.didWell || review.doDifferently || review.idealReply
  );
}

const SENTENCE = (label, value) => (value ? `${label}: ${value}` : null);

/** What the reviewer said Sol should learn, as flat sentences a prompt can carry. */
function lessonsFrom(review) {
  return [
    SENTENCE('Did well', review.didWell),
    SENTENCE('Do differently', review.doDifferently),
    SENTENCE('Accuracy', review.accuracyNotes),
    SENTENCE('Compliance', review.complianceNotes),
  ].filter(Boolean);
}

/** The short, mechanical warnings — derived from the enums, so they read identically every time. */
function avoidFrom(review) {
  const avoid = [];
  if (review.tone === 'pushy') avoid.push('Pushing for the handoff harder than the visitor invited.');
  if (review.tone === 'stiff') avoid.push('Answering like a spec sheet instead of a person.');
  if (review.tone === 'chatty') avoid.push('Padding the reply — this one should have been shorter.');
  if (review.accuracy === 'wrong') avoid.push('Stating product facts that are not in the knowledge base.');
  if (review.accuracy === 'mostly') avoid.push('Approximating a number the knowledge base states exactly.');
  if (review.compliance === 'violation') avoid.push('Health claims and personal dosing advice — kava is an ingestible.');
  if (review.compliance === 'borderline') avoid.push('Wording that edges toward a health claim.');
  if (review.handoffTiming === 'too-early') avoid.push('Raising the sample card before the visitor asked to be contacted.');
  if (review.handoffTiming === 'too-late') avoid.push('Waiting past a clear buying signal to raise the sample card.');
  if (review.handoffTiming === 'missed') avoid.push('Letting a buying signal pass without offering the handoff.');
  return avoid;
}

const excerpt = (messages, limit = 6) =>
  (Array.isArray(messages) ? messages : []).slice(-limit)
    .map((m) => `${labelFor(m.role)}: ${m.text}`).join('\n');

/**
 * The deliverable: markdown that can be pasted, or programmatically concatenated, into LIVEY's
 * system instruction with no further shaping. Deliberately reads as a worked example rather than
 * as a database row — that is the form a model actually learns from in-context.
 */
function renderPromptBlock({ review, context, conversation, lessons, avoid, recordedAt }) {
  const date = recordedAt instanceof Date && !Number.isNaN(recordedAt.getTime())
    ? recordedAt.toISOString().slice(0, 10)
    : 'undated';
  const score = review.rating ? `${review.rating}/5` : 'unrated';

  const lines = [
    `### Reviewed conversation — ${date} · ${score}${review.verdict ? ` (${review.verdict})` : ''}`,
    '',
    `Context: visitor on ${context.page || 'the site'}`
      + `${context.interest ? `, interested in ${context.interest}` : ''}`
      + `${context.company ? ` (${context.company})` : ''}.`,
    '',
    'What happened:',
    '```',
    excerpt(conversation),
    '```',
    '',
  ];

  if (lessons.length) lines.push("Reviewer's notes:", ...lessons.map((l) => `- ${l}`), '');
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
function buildEmbeddingText({ review, context, conversation }) {
  return [
    `Page: ${context.page || 'unknown'}`,
    context.interest ? `Interest: ${context.interest}` : null,
    review.tags.length ? `Tags: ${review.tags.join(', ')}` : null,
    'Conversation:',
    excerpt(conversation, 12),
    review.doDifferently ? `Correction: ${review.doDifferently}` : null,
    review.idealReply ? `Ideal reply: ${review.idealReply}` : null,
  ].filter(Boolean).join('\n').slice(0, 8000);
}

/** Joins the archived conversation to the human verdict; this object IS the training example. */
function buildTraining({ sessionId, page, lead, messages, review, recordedAt = new Date() }) {
  const context = {
    page: page || null,
    interest: lead?.interest || null,
    company: lead?.company || null,
    leadQuality: review.leadQuality,
  };
  const conversation = (Array.isArray(messages) ? messages : [])
    .map((m) => ({ role: m.role, text: m.text }));
  const lessons = lessonsFrom(review);
  const avoid = avoidFrom(review);

  return {
    id: sessionId,
    source: 'sol-lead-review',
    recordedAt,
    rating: review.rating,
    verdict: review.verdict,
    context,
    conversation,
    lessons,
    avoid,
    idealReply: review.idealReply || null,
    tags: review.tags,
    promptBlock: renderPromptBlock({ review, context, conversation, lessons, avoid, recordedAt }),
    embeddingText: buildEmbeddingText({ review, context, conversation }),
    // Reserved so the kNN backfill is an UPDATE rather than a schema change. See the doc.
    embedding: null,
    embeddingModel: null,
    embeddedAt: null,
  };
}

/**
 * Copies a conversation somewhere permanent and mints the link the email will carry. Runs at
 * lead-email time rather than at review time on purpose: the transcript it is copying is on a
 * 90-day clock, and a review filed on day 91 would otherwise have nothing to attach itself to.
 *
 * Never overwrites a review that is already there — re-running it is safe.
 */
async function archiveForReview({
  db = chatDb(), sessionId, lead, messages, page, startedAt, usage, now = new Date(),
}) {
  if (!isValidSessionId(sessionId)) return { ok: false, reason: 'invalid-session-id' };

  try {
    const ref = db.collection(REVIEWS_COLLECTION).doc(sessionId);
    let token = null;

    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;
      token = existing?.token || newToken();

      tx.set(ref, {
        ...(existing || {}),
        sessionId,
        token,
        status: existing?.status || 'pending',
        page: existing?.page ?? (page || null),
        startedAt: existing?.startedAt ?? (toDate(startedAt) || now),
        // Re-archived on purpose: the second email of a conversation has more transcript than
        // the first, and the copy is only useful if it is the whole thing.
        lead: lead || existing?.lead || null,
        messages: Array.isArray(messages) ? messages : (existing?.messages || []),
        usage: usage || existing?.usage || null,
        archivedAt: existing?.archivedAt ?? now,
        updatedAt: now,
        // No expiresAt, deliberately. See the file header.
      });

      if (!existing?.token) {
        tx.set(db.collection(TOKENS_COLLECTION).doc(token), { token, sessionId, createdAt: now });
      }
    });

    return { ok: true, token };
  } catch (error) {
    console.error('[solReviews] failed to archive conversation:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/** The emailed link's only credential. Returns the session it unlocks, or nothing. */
async function resolveReviewToken({ db = chatDb(), token }) {
  if (!isValidToken(token)) return { ok: false, reason: 'invalid-token' };
  try {
    const snapshot = await db.collection(TOKENS_COLLECTION).doc(token).get();
    if (!snapshot.exists) return { ok: false, reason: 'unknown-token' };
    const sessionId = snapshot.data()?.sessionId;
    if (!isValidSessionId(sessionId)) return { ok: false, reason: 'unknown-token' };
    return { ok: true, sessionId };
  } catch (error) {
    console.error('[solReviews] failed to resolve token:', error.message);
    return { ok: false, reason: 'read-failed' };
  }
}

/** The archived conversation the form renders, so the reviewer grades what they can see. */
async function loadReview({ db = chatDb(), sessionId }) {
  if (!isValidSessionId(sessionId)) return { ok: false, reason: 'invalid-session-id' };
  try {
    const snapshot = await db.collection(REVIEWS_COLLECTION).doc(sessionId).get();
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
async function saveReview({ db = chatDb(), sessionId, answers, now = new Date() }) {
  if (!isValidSessionId(sessionId)) return { ok: false, reason: 'invalid-session-id' };

  const review = normalizeReview(answers);
  if (!hasSubstance(review)) return { ok: false, reason: 'empty-review' };

  try {
    const ref = db.collection(REVIEWS_COLLECTION).doc(sessionId);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;

      // A rating landed by the one-click stars keeps its value when the full form omits one.
      const merged = { ...review, rating: review.rating ?? existing?.review?.rating ?? null };
      merged.verdict = verdictFor(merged.rating);

      tx.set(ref, {
        ...(existing || {}),
        sessionId,
        status: 'reviewed',
        review: merged,
        training: buildTraining({
          sessionId,
          page: existing?.page,
          lead: existing?.lead,
          messages: existing?.messages,
          review: merged,
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
 * The stars in the email. One click is the most feedback most conversations will ever get, so it
 * is stored on its own rather than being thrown away unless the long form is also filled in.
 */
async function recordRating({ db = chatDb(), sessionId, rating, now = new Date() }) {
  if (!isValidSessionId(sessionId)) return { ok: false, reason: 'invalid-session-id' };
  const value = normalizeRating(rating);
  if (!value) return { ok: false, reason: 'invalid-rating' };

  try {
    const ref = db.collection(REVIEWS_COLLECTION).doc(sessionId);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;
      const review = { ...normalizeReview({}), ...(existing?.review || {}), rating: value };
      review.verdict = verdictFor(value);

      tx.set(ref, {
        ...(existing || {}),
        sessionId,
        // A one-click rating must not look like a filled-in questionnaire in the corpus.
        status: existing?.status === 'reviewed' ? 'reviewed' : 'rated',
        review,
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
  CHOICES,
  TAGS,
  isValidToken,
  newToken,
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
