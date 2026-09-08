/**
 * @file: functions/lib/chatLeads.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Stores the contact details Sol extracts through send_lead_to_josh, one document per
 *     session at chatLeads/{sessionId}. Deliberately carries NO TTL: a transcript is telemetry
 *     and expires, a prospect is a business record and does not. `confirmed` separates a model's
 *     extraction from a human pressing Send. See CLAUDE.md § The lead record is not the transcript.
 *
 * @See Also:
 *     functions/lib/chatStore.js
 *     functions/lib/chat.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { isValidSessionId, chatDb } = require('./chatStore');

const LEADS_COLLECTION = 'chatLeads';

const MAX_FIELD_CHARS = 200;
const MAX_SUMMARY_CHARS = 2000;
const MAX_PAGE_CHARS = 200;

// Tool arg -> stored field. An allow-list, not a spread: `args` is model-authored from visitor
// text, so anything undeclared (including a __proto__ key) must not reach the document.
const FIELDS = [
  ['name', 'name', MAX_FIELD_CHARS],
  ['company', 'company', MAX_FIELD_CHARS],
  ['email', 'email', MAX_FIELD_CHARS],
  ['phone', 'phone', MAX_FIELD_CHARS],
  ['interest', 'interest', MAX_SUMMARY_CHARS],
  ['reason', 'reason', MAX_SUMMARY_CHARS],
  ['conversation_summary', 'conversationSummary', MAX_SUMMARY_CHARS],
];

const clip = (value, max) => String(value ?? '').trim().slice(0, max);

/** Allow-listed, trimmed and clipped. Blank fields are omitted rather than stored empty. */
function normalizeLead(args) {
  const source = args || {};
  return FIELDS.reduce((acc, [from, to, max]) => {
    const value = clip(Object.prototype.hasOwnProperty.call(source, from) ? source[from] : '', max);
    if (value) acc[to] = value;
    return acc;
  }, {});
}

/**
 * Upserts what Sol has extracted so far. Merges rather than replaces: he learns the email three
 * turns after the name, and a later extraction that omits a field must not erase it.
 */
async function persistLead({ db = chatDb(), sessionId, fields, page, now = new Date() }) {
  if (!isValidSessionId(sessionId)) return { ok: false, reason: 'invalid-session-id' };

  const extracted = normalizeLead(fields);
  if (Object.keys(extracted).length === 0) return { ok: false, reason: 'nothing-to-store' };

  try {
    const ref = db.collection(LEADS_COLLECTION).doc(sessionId);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;

      tx.set(ref, {
        ...(existing || {}),
        ...extracted,
        sessionId,
        page: existing?.page ?? clip(page, MAX_PAGE_CHARS),
        // Never downgraded: a confirmation is a human act and a later extraction cannot undo it.
        confirmed: existing?.confirmed === true,
        firstSeenAt: existing?.firstSeenAt ?? now,
        updatedAt: now,
      });
    });
    return { ok: true };
  } catch (error) {
    console.error('[chatLeads] failed to persist lead:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

/**
 * Records that the visitor actually submitted the card. Creates the document if the lead tool
 * never fired, so a confirmed send is never lost to a missing extraction.
 */
async function confirmLead({ db = chatDb(), sessionId, now = new Date() }) {
  if (!isValidSessionId(sessionId)) return { ok: false, reason: 'invalid-session-id' };

  try {
    const ref = db.collection(LEADS_COLLECTION).doc(sessionId);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists ? snapshot.data() : null;

      tx.set(ref, {
        ...(existing || {}),
        sessionId,
        confirmed: true,
        confirmedAt: existing?.confirmedAt ?? now,
        firstSeenAt: existing?.firstSeenAt ?? now,
        updatedAt: now,
      });
    });
    return { ok: true };
  } catch (error) {
    console.error('[chatLeads] failed to confirm lead:', error.message);
    return { ok: false, reason: 'write-failed' };
  }
}

module.exports = {
  LEADS_COLLECTION,
  normalizeLead,
  persistLead,
  confirmLead,
};
