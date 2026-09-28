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

const crypto = require('crypto');
const { chatDb, isValidSessionId } = require('./chatStore');
const { contactKeyFor } = require('./leadIdentity');
const { LEADS_COLLECTION } = require('./chatLeads');

const QUEUE_COLLECTION = 'leadNotifications';

/**
 * The delivery ledger: one document per submission, written in the SAME transaction that queues
 * it and flipped to `emailed` in the same transaction that marks the email sent. The queue says
 * what to send next; the ledger says what has been sent, and is what makes a lost lead
 * impossible rather than unlikely — anything still `queued` past its deadline is put back.
 * See CLAUDE.md § Every submission is ledgered until it is emailed.
 */
const LEDGER_COLLECTION = 'leadSubmissions';

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

/**
 * How long a sweep owns a claimed batch. If it dies mid-send — an instance killed, a timeout —
 * nothing hands the batch back, so the claim itself expires and the next sweep re-sends it. Must
 * stay well above `sendPendingLeads`' 300s timeout, or a slow send is claimed twice.
 */
const LEASE_MINUTES = 10;
const LEASE_MS = LEASE_MINUTES * 60 * 1000;

/**
 * When the reconciler steps in: the quiet period, plus a lease, plus slack for the sweep interval.
 * A submission still `queued` after this has been lost by the queue, not merely delayed by it.
 */
const OVERDUE_MS = QUIET_MS + LEASE_MS + 5 * 60 * 1000;

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
    // The ledger key. Minted here rather than taken from the input: a visitor must not be able
    // to name, and so overwrite, another submission's delivery record.
    id: crypto.randomUUID(),
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

      // Same transaction: a submission is never queued without a ledger entry, or ledgered
      // without being queued.
      tx.set(db.collection(LEDGER_COLLECTION).doc(normalized.id), {
        ...normalized,
        contactKey: contact.key,
        status: 'queued',
        queuedAt: now,
      });
    });

    return {
      ok: true,
      contactKey: contact.key,
      submissionId: normalized.id,
      queued,
      sendsAt: new Date(now.getTime() + QUIET_MS),
    };
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
 *
 * The claim is a LEASE, not a hand-off: `notifyAfter` is set to when it expires rather than
 * removed, so a sweep that dies holding the batch leaves it due again. A later sweep that finds
 * `sending` with an expired lease takes those submissions back into its own batch.
 */
async function claimForSend({ db = chatDb(), contactKey, now = new Date() }) {
  try {
    const ref = db.collection(QUEUE_COLLECTION).doc(contactKey);
    let batch = null;
    let reason = 'nothing-pending';
    let recovered = 0;

    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      const existing = snapshot.data();
      const sending = existing.sending || [];
      const pending = existing.pending || [];

      // Another sweep holds this lead right now. Leave it; the lease says when to look again.
      if (sending.length && toMillis(existing.leaseUntil) > now.getTime()) {
        reason = 'in-flight';
        return;
      }

      const { notifyAfter, leaseUntil, claimedAt, ...rest } = existing;
      const submissions = [...sending, ...pending];

      if (!submissions.length) {
        // Due with nothing to send: drop `notifyAfter` so the sweep stops matching it.
        if (notifyAfter !== undefined) tx.set(ref, { ...rest, sending: [], updatedAt: now });
        return;
      }

      recovered = sending.length;
      batch = mergeSubmissions(contactKey, submissions);
      const lease = new Date(now.getTime() + LEASE_MS);

      tx.set(ref, {
        ...rest,
        pending: [],
        sending: submissions,
        claimedAt: now,
        leaseUntil: lease,
        notifyAfter: lease,
        updatedAt: now,
      });
    });

    if (!batch) return { ok: false, reason };
    if (recovered) {
      console.warn(`[leadQueue] ${contactKey}: recovered ${recovered} submission(s) from an`
        + ' expired claim — the sweep that held them never finished');
    }
    return { ok: true, batch, recovered };
  } catch (error) {
    console.error('[leadQueue] failed to claim a lead:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/**
 * The send landed. Clears the claim and, in the same transaction, stamps every submission in it
 * `emailed` in the ledger and every conversation it carried with `emailedAt` — so "was this
 * emailed?" is answered by a record, never inferred. `notifyCount` is how many emails this
 * person has ever generated.
 */
async function markSent({
  db = chatDb(), contactKey, sessionIds = [], reviewId = null, now = new Date(),
}) {
  try {
    const ref = db.collection(QUEUE_COLLECTION).doc(contactKey);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return;
      const {
        sending = [], claimedAt, leaseUntil, notifyAfter, ...rest
      } = snapshot.data();

      // Reads before writes: Firestore transactions require it.
      const ledgered = sending.filter((s) => s.id);
      const ledgerRefs = ledgered.map((s) => db.collection(LEDGER_COLLECTION).doc(s.id));
      const leadRefs = sessionIds.filter(isValidSessionId)
        .map((id) => db.collection(LEADS_COLLECTION).doc(id));
      const ledger = await Promise.all(ledgerRefs.map((r) => tx.get(r)));
      const leads = await Promise.all(leadRefs.map((r) => tx.get(r)));

      // Anything queued while this batch was in flight keeps its own quiet period.
      const stillPending = (rest.pending || []).length > 0;
      tx.set(ref, {
        ...rest,
        sending: [],
        ...(stillPending
          ? { notifyAfter: new Date(toMillis(rest.lastSubmissionAt) + QUIET_MS) }
          : {}),
        notifiedAt: now,
        firstNotifiedAt: rest.firstNotifiedAt ?? now,
        notifyCount: (rest.notifyCount || 0) + 1,
        updatedAt: now,
      });

      ledgerRefs.forEach((r, i) => {
        const base = ledger[i].exists ? ledger[i].data() : { ...ledgered[i], contactKey };
        tx.set(r, { ...base, status: 'emailed', emailedAt: now, reviewId });
      });
      // Only a lead that exists: a conversation found by session id alone may have none, and
      // this must not invent one.
      leadRefs.forEach((r, i) => {
        if (leads[i].exists) tx.set(r, { ...leads[i].data(), emailedAt: now, reviewId });
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
      const {
        sending = [], claimedAt, leaseUntil, ...rest
      } = snapshot.data();
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

/**
 * The backstop. Finds every submission the ledger still has as `queued` past its deadline and
 * makes sure the queue will send it — putting it back when the queue has lost it, and re-arming
 * `notifyAfter` when the queue holds it but nothing would ever pick it up.
 *
 * Nothing the queue does should leave work for this. It exists because "should" is not a
 * guarantee, and a lead is the one thing here that must not be lost.
 */
async function reconcileLedger({ db = chatDb(), now = new Date(), limit = 200 } = {}) {
  let snapshot;
  try {
    // Equality only, so no composite index: the queued set is small (it drains every sweep),
    // and the age filter runs here.
    snapshot = await db.collection(LEDGER_COLLECTION).where('status', '==', 'queued')
      .limit(limit).get();
  } catch (error) {
    console.error('[leadQueue] failed to read the ledger:', error.message);
    return { ok: false, reason: 'read-failed', requeued: 0 };
  }

  const overdue = snapshot.docs.map((doc) => doc.data())
    .filter((entry) => now.getTime() - toMillis(entry.queuedAt || entry.at) > OVERDUE_MS);

  let requeued = 0;
  for (const entry of overdue) {
    if (!entry.contactKey || !entry.id) continue;
    try {
      const ref = db.collection(QUEUE_COLLECTION).doc(entry.contactKey);
      await db.runTransaction(async (tx) => {
        const current = await tx.get(ref);
        const existing = current.exists ? current.data() : {};
        const pending = existing.pending || [];
        const sending = existing.sending || [];
        const held = [...pending, ...sending].some((s) => s.id === entry.id);
        const armed = existing.notifyAfter !== undefined && existing.notifyAfter !== null;
        if (held && armed) return;

        const { status, queuedAt, contactKey, ...submission } = entry;
        tx.set(ref, {
          ...existing,
          contactKey: entry.contactKey,
          pending: held ? pending : [...pending, submission].slice(-MAX_PENDING),
          sending,
          notifyAfter: now,
          notifyCount: existing.notifyCount || 0,
          updatedAt: now,
        });
        requeued += 1;
      });
    } catch (error) {
      console.error(`[leadQueue] failed to requeue ${entry.id}:`, error.message);
    }
  }

  if (requeued) console.warn(`[leadQueue] reconciler requeued ${requeued} overdue submission(s)`);
  return { ok: true, requeued, overdue: overdue.length };
}

/** Everything the ledger has not seen emailed yet — for the daily report's backstop section. */
async function unsentSubmissions({ db = chatDb(), now = new Date(), olderThanMs = 60 * 60 * 1000 } = {}) {
  try {
    const snapshot = await db.collection(LEDGER_COLLECTION).where('status', '==', 'queued').get();
    const entries = snapshot.docs.map((doc) => doc.data())
      .filter((e) => now.getTime() - toMillis(e.queuedAt || e.at) > olderThanMs)
      .sort((a, b) => toMillis(a.queuedAt || a.at) - toMillis(b.queuedAt || b.at));
    return { ok: true, entries };
  } catch (error) {
    console.error('[leadQueue] failed to read unsent submissions:', error.message);
    return { ok: false, reason: 'read-failed', entries: [] };
  }
}

module.exports = {
  QUEUE_COLLECTION,
  LEDGER_COLLECTION,
  LEASE_MINUTES,
  LEASE_MS,
  OVERDUE_MS,
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
  reconcileLedger,
  unsentSubmissions,
};
