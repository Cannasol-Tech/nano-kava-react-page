/**
 * @file: functions/lib/chatStore.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Persists Sol conversations to Firestore, one document per session, capped at 30 turns and
 *     stamped with a 90-day `expiresAt` that a native TTL policy collects. Server-side only —
 *     the browser never writes here. Both bounds exist to stop unbounded growth; see
 *     CLAUDE.md § Transcript persistence.
 *
 * @See Also:
 *     functions/lib/chat.js
 *     functions/index.js
 *     firestore.rules
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { addUsage, usageFrom } = require('./usageCost');

const COLLECTION = 'chatSessions';

// 30 exchanges, and a turn is a message — Stephen, 2026-08-26, choosing pairs over messages.
const MAX_TURNS = 60;
const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const MAX_TURN_CHARS = 2000;
const MAX_PAGE_CHARS = 200;

// Url-safe and length-bounded: this value becomes a document id, so `/` and `..` must not survive.
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// Firestore forbids a document id matching __.*__ , and rejects the write by throwing. Both
// stores swallow throws, so `__proto__` (which the charset above allows) would silently lose
// every turn for that visitor rather than failing loudly. The 8-char floor catches `__id__` by
// accident and nothing longer. Added 2026-08-26 after a pipeline test caught it.
const RESERVED_ID_PATTERN = /^__.*__$/;

const ROLES = new Set(['user', 'model']);

const isValidSessionId = (id) =>
  typeof id === 'string' && SESSION_ID_PATTERN.test(id) && !RESERVED_ID_PATTERN.test(id);

const clip = (value, max) => String(value ?? '').slice(0, max);

/** Keeps only usable turns, clips each, and keeps the most recent MAX_TURNS. */
function capTurns(turns) {
  if (!Array.isArray(turns)) return [];
  return turns
    .filter((t) => t && ROLES.has(t.role) && typeof t.text === 'string' && t.text.trim())
    .map((t) => ({ role: t.role, text: clip(t.text.trim(), MAX_TURN_CHARS) }))
    .slice(-MAX_TURNS);
}

/** Retention runs from creation, not last activity — an active chat still ages out. */
const expiresAtFrom = (createdAt) =>
  new Date((createdAt instanceof Date ? createdAt.getTime() : Number(createdAt)) + RETENTION_MS);

const modelTurn = (text) => ({ role: 'model', text: typeof text === 'string' ? text : '' });

let cachedDb = null;

/** Lazy so importing this module costs a cold start nothing until a chat actually lands. */
function chatDb() {
  if (cachedDb === null) {
    const admin = require('firebase-admin');
    if (admin.apps.length === 0) admin.initializeApp();
    cachedDb = admin.firestore();
  }
  return cachedDb;
}

/**
 * The client replays a sliding window of history every turn, so appending it wholesale would
 * duplicate. An existing document therefore takes only the new exchange; a new one takes the
 * whole window, which is the only chance to capture the client-owned greeting.
 */
function additionsFor(existing, history, reply) {
  const incoming = Array.isArray(history) ? history : [];
  if (!existing) return capTurns([...incoming, modelTurn(reply)]);
  return capTurns([incoming[incoming.length - 1], modelTurn(reply)]);
}

/**
 * Upserts one turn's worth of transcript. Never throws: a lost transcript is telemetry, and the
 * visitor's answer has already streamed by the time this runs.
 */
async function persistTranscript({
  db = chatDb(), sessionId, history, reply, page, usage, now = new Date(),
}) {
  // Absent is ordinary — an old cached bundle sends none. Present-and-wrong is worth a line.
  if (sessionId === null || sessionId === undefined) return { ok: false, reason: 'no-session-id' };
  if (!isValidSessionId(sessionId)) {
    console.warn('[chatStore] rejected: malformed sessionId');
    return { ok: false, reason: 'invalid-session-id' };
  }
  if (additionsFor(null, history, reply).length === 0) {
    return { ok: false, reason: 'nothing-to-store' };
  }

  try {
    const ref = db.collection(COLLECTION).doc(sessionId);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;
      const additions = additionsFor(existing, history, reply);

      // Every fallback is `??`, never `existing ? … : …`: Firestore throws on an undefined field
      // value, and this function swallows throws, so one missing field would silently lose every
      // later turn of that chat. An unstamped document gets stamped rather than left immortal.
      tx.set(ref, {
        sessionId,
        messages: capTurns([...(existing?.messages || []), ...additions]),
        turnCount: (existing?.turnCount || 0) + additions.length,
        page: existing?.page ?? clip(page, MAX_PAGE_CHARS),
        // Tokens and dollars for the whole conversation. Cloud Logging drops the per-turn line
        // after 30 days, so this document is the only durable record — see CLAUDE.md § What a
        // conversation costs.
        usage: addUsage(existing?.usage, usageFrom(usage)),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        expiresAt: existing?.expiresAt ?? expiresAtFrom(now),
      });
    });
    return { ok: true };
  } catch (error) {
    console.error('[chatStore] failed to persist transcript:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/**
 * Wraps the SSE sink so the turn's spoken text can be stored without `streamChat` knowing a
 * database exists. Text frames are the only ones that make it into a transcript.
 */
function createTranscriptRecorder(onEvent) {
  const spoken = [];
  let proposedLead = null;
  let turnUsage = null;

  return {
    emit(event) {
      if (event?.type === 'text' && typeof event.delta === 'string') spoken.push(event.delta);
      // The only frame carrying token counts. A stream that errors never sends one.
      if (event?.type === 'done' && event.usage) turnUsage = event.usage;
      // `lead_proposed` already carries everything the lead tool extracted, so reading it here
      // saves threading a session through chat.js's tool machinery. Last proposal wins.
      if (event?.type === 'lead_proposed' && event.fields) proposedLead = event.fields;
      if (onEvent) onEvent(event);
    },
    reply: () => spoken.join(''),
    lead: () => proposedLead,
    usage: () => turnUsage,
  };
}

module.exports = {
  COLLECTION,
  MAX_TURNS,
  RETENTION_DAYS,
  RETENTION_MS,
  MAX_TURN_CHARS,
  isValidSessionId,
  capTurns,
  expiresAtFrom,
  persistTranscript,
  createTranscriptRecorder,
  chatDb,
};
