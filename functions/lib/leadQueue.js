/**
 * @file: functions/lib/leadQueue.js
 * @author: Stephen Boyett
 *
 * @description:
 *     One email per lead, built by waiting. Every submission — chat card or contact form — is
 *     filed against the person who made it and the notification is held for a quiet period; a
 *     further submission from the same person inside that window joins the same email rather
 *     than starting a second one. A scheduled sweep sends whatever has gone quiet.
 *
 *     The wait is the feature, not a compromise: it is also what makes the attached transcript
 *     the WHOLE conversation rather than however much of it existed at the moment Send was
 *     pressed. See CLAUDE.md § One email per lead, after the quiet period.
 *
 * @See Also:
 *     functions/lib/leadIdentity.js
 *     functions/lib/leadHandoff.js
 *     functions/index.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { chatDb, isValidSessionId } = require('./chatStore');
const { contactKeyFor } = require('./leadIdentity');

const QUEUE_COLLECTION = 'leadNotifications';

/**
 * How long a lead has to stay quiet before it is emailed. 20 minutes because the case this was
 * built for — Sol's card at 5:34, the contact form at 5:52 — is 18 of them, and a window that
 * does not cover the observed gap solves nothing.
 *
 * The cost is that Josh sees a lead up to ~22 minutes late. That buys back an email that is
 * whole rather than one of two halves, and the site promises a reply within 24 hours, so the
 * delay is invisible to the visitor. Overridable per deploy without a code change.
 */
const QUIET_MINUTES = Number(process.env.LEAD_QUIET_MINUTES) > 0
  ? Number(process.env.LEAD_QUIET_MINUTES)
  : 20;
const QUIET_MS = QUIET_MINUTES * 60 * 1000;

// A send that failed is retried by the next sweep rather than on the full quiet period again.
const RETRY_MINUTES = 5;

const MAX_PENDING = 20;
const MAX_MESSAGE_CHARS = 8000;
const MAX_FIELD_CHARS = 200;
const MAX_TYPES = 12;
const SWEEP_LIMIT = 25;

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

const SOURCES = new Set(['chat', 'form']);

/** Allow-listed and clipped, like every other model- or visitor-authored payload in lib/. */
function normalizeSubmission(input = {}, now = new Date()) {
  const types = (Array.isArray(input.types) ? input.types : [])
    .map((t) => clip(t, MAX_FIELD_CHARS))
    .filter(Boolean)
    .slice(0, MAX_TYPES);

  return {
    at: input.at instanceof Date ? input.at : now,
    source: SOURCES.has(input.source) ? input.source : 'form',
    name: clip(input.name, MAX_FIELD_CHARS),
    email: clip(input.email, MAX_FIELD_CHARS),
    phone: clip(input.phone, MAX_FIELD_CHARS),
    company: clip(input.company, MAX_FIELD_CHARS),
    types,
    message: clip(input.message, MAX_MESSAGE_CHARS),
    sessionId: isValidSessionId(input.sessionId) ? input.sessionId : null,
  };
}

/** Later submissions win for a scalar, but only when they actually said something. */
const latest = (submissions, field) =>
  submissions.reduce((best, s) => (s[field] ? s[field] : best), '');

/** Union, in first-seen order — Josh reads these as one list of what the person asked about. */
function mergeTypes(submissions) {
  const seen = [];
  for (const s of submissions) {
    for (const t of s.types) if (!seen.includes(t)) seen.push(t);
  }
  return seen.slice(0, MAX_TYPES);
}

/** The single object the email is rendered from, however many submissions went into it. */
function mergeSubmissions(contactKey, submissions) {
  const ordered = [...submissions].sort(
    (a, b) => toMillis(a.at) - toMillis(b.at));

  return {
    contactKey,
    name: latest(ordered, 'name'),
    email: latest(ordered, 'email'),
    phone: latest(ordered, 'phone'),
    company: latest(ordered, 'company'),
    types: mergeTypes(ordered),
    sources: [...new Set(ordered.map((s) => s.source))],
    sessionIds: [...new Set(ordered.map((s) => s.sessionId).filter(Boolean))],
    submissions: ordered,
  };
}

const toMillis = (value) => {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Files a submission against its person and pushes the send back to now + the quiet period.
 *
 * `notifyAfter` is the queue: its PRESENCE is what the sweep selects on, so it is left off the
 * document entirely once nothing is pending. A null would be worse than useless — Firestore
 * orders null below every timestamp, so `notifyAfter <= now` would match it and the sweep would
 * pick up leads it has already sent, forever.
 */
async function enqueueSubmission({ db = chatDb(), submission, now = new Date() }) {
  const normalized = normalizeSubmission(submission, now);
  const contact = contactKeyFor(normalized);
  if (!contact.ok) return { ok: false, reason: contact.reason };

  try {
    const ref = db.collection(QUEUE_COLLECTION).doc(contact.key);
    let queued = 0;

    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;

      const pending = [...(existing?.pending || []), normalized].slice(-MAX_PENDING);
      queued = pending.length;

      tx.set(ref, {
        ...(existing || {}),
        contactKey: contact.key,
        keyedBy: contact.by,
        pending,
        // Every new submission pushes the send out again: the window is quiet-time, not a fixed
        // bucket, so a conversation that is still going never gets emailed half-finished.
        notifyAfter: new Date(now.getTime() + QUIET_MS),
        sessionIds: [...new Set([
          ...(existing?.sessionIds || []),
          ...(normalized.sessionId ? [normalized.sessionId] : []),
        ])],
        firstSeenAt: existing?.firstSeenAt ?? now,
        lastSubmissionAt: now,
        notifyCount: existing?.notifyCount || 0,
        updatedAt: now,
      });
    });

    return { ok: true, contactKey: contact.key, queued, sendsAt: new Date(now.getTime() + QUIET_MS) };
  } catch (error) {
    console.error('[leadQueue] failed to queue submission:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/** Leads that have gone quiet. Documents with no `notifyAfter` are not in the queue at all. */
async function dueLeads({ db = chatDb(), now = new Date(), limit = SWEEP_LIMIT } = {}) {
  try {
    const snapshot = await db.collection(QUEUE_COLLECTION)
      .where('notifyAfter', '<=', now)
      .limit(limit)
      .get();
    return { ok: true, leads: snapshot.docs.map((doc) => doc.data()) };
  } catch (error) {
    console.error('[leadQueue] failed to read the queue:', error.message);
    return { ok: false, reason: 'read-failed', leads: [] };
  }
}

/**
 * Takes the batch out of the queue in one transaction, so a second sweep running beside this one
 * finds nothing to send. Whatever is claimed is the caller's to deliver or hand back.
 */
async function claimForSend({ db = chatDb(), contactKey, now = new Date() }) {
  try {
    const ref = db.collection(QUEUE_COLLECTION).doc(contactKey);
    let batch = null;

    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      const existing = snapshot.data();
      if (!existing.pending?.length) return;

      batch = mergeSubmissions(contactKey, existing.pending);

      const { notifyAfter, ...rest } = existing;
      tx.set(ref, {
        ...rest,
        pending: [],
        sending: existing.pending,
        claimedAt: now,
        updatedAt: now,
      });
    });

    return batch ? { ok: true, batch } : { ok: false, reason: 'nothing-pending' };
  } catch (error) {
    console.error('[leadQueue] failed to claim a lead:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/** The send landed. `notifyCount` is how many emails this person has ever generated. */
async function markSent({ db = chatDb(), contactKey, now = new Date() }) {
  try {
    const ref = db.collection(QUEUE_COLLECTION).doc(contactKey);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      const { sending, claimedAt, ...rest } = snapshot.data();
      tx.set(ref, {
        ...rest,
        sending: [],
        notifiedAt: now,
        firstNotifiedAt: rest.firstNotifiedAt ?? now,
        notifyCount: (rest.notifyCount || 0) + 1,
        updatedAt: now,
      });
    });
    return { ok: true };
  } catch (error) {
    console.error('[leadQueue] failed to mark a lead sent:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/**
 * The send failed, so the batch goes back. Put in front of anything queued since rather than
 * after it, because these submissions are older — and re-armed on the short retry, not the full
 * quiet period, so a SendGrid blip costs minutes rather than another twenty.
 */
async function returnToQueue({ db = chatDb(), contactKey, now = new Date() }) {
  try {
    const ref = db.collection(QUEUE_COLLECTION).doc(contactKey);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      const { sending = [], claimedAt, ...rest } = snapshot.data();
      if (!sending.length) return;

      tx.set(ref, {
        ...rest,
        pending: [...sending, ...(rest.pending || [])].slice(-MAX_PENDING),
        sending: [],
        notifyAfter: new Date(now.getTime() + RETRY_MINUTES * 60 * 1000),
        updatedAt: now,
      });
    });
    return { ok: true };
  } catch (error) {
    console.error('[leadQueue] failed to return a lead to the queue:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

module.exports = {
  QUEUE_COLLECTION,
  QUIET_MINUTES,
  QUIET_MS,
  RETRY_MINUTES,
  MAX_PENDING,
  normalizeSubmission,
  mergeSubmissions,
  enqueueSubmission,
  dueLeads,
  claimForSend,
  markSent,
  returnToQueue,
};
