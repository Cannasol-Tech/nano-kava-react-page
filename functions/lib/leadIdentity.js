/**
 * @file: functions/lib/leadIdentity.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Who a lead IS, as opposed to which form they happened to use. A lead is a person, so it is
 *     keyed on a normalised email (or a phone when that is all they gave) — never on a session
 *     id, which identifies a browser. Also finds the Sol conversations belonging to that person,
 *     so a contact-form submission from somebody who chatted first still arrives with the chat
 *     attached. See CLAUDE.md § A lead is a person, not a submission.
 *
 * @See Also:
 *     functions/lib/leadQueue.js
 *     functions/lib/chatLeads.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const crypto = require('crypto');
const { chatDb, isValidSessionId } = require('./chatStore');
const { LEADS_COLLECTION } = require('./chatLeads');

// A key becomes a document id, so it is hashed rather than stored raw: an email contains `.`
// and `/` is legal in a local part, and neither survives a Firestore path.
const keyOf = (kind, value) =>
  `${kind}_${crypto.createHash('sha256').update(value).digest('hex').slice(0, 32)}`;

const normalizeEmail = (email) => String(email ?? '').trim().toLowerCase();

/**
 * Digits only, and the last 10 of them. `(216) 921-2240`, `216-921-2240` and `+1 216 921 2240`
 * are one person; keeping punctuation or a country code would make them three.
 */
function normalizePhone(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : '';
}

/**
 * Email wins when present. It is the field people type consistently, it is what Mailchimp keys
 * on, and a phone typed once with an extension and once without would otherwise split the lead.
 * A phone-only lead (§ Phone-only leads) still gets a stable key.
 */
function contactKeyFor({ email, phone } = {}) {
  const normalizedEmail = normalizeEmail(email);
  if (normalizedEmail) return { ok: true, key: keyOf('e', normalizedEmail), by: 'email' };

  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone) return { ok: true, key: keyOf('p', normalizedPhone), by: 'phone' };

  return { ok: false, reason: 'no-contact-method' };
}

/**
 * Every Sol conversation this person has had. Two joins, because they catch different people:
 *
 *   - the session id, which the chat widget keeps in localStorage and the contact form now sends
 *     too, so one browser's chat and form submission meet even when the details were typed
 *     differently in each;
 *   - the email and phone on the stored lead, which catches the same person on another device.
 *
 * Never throws. A lead must still be emailed when the join fails — an email with no transcript
 * beats no email.
 */
async function sessionsForContact({ db = chatDb(), email, phone, sessionIds = [] } = {}) {
  const found = new Set(sessionIds.filter(isValidSessionId));

  const queries = [];
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  // Stored exactly as the visitor typed it, so the query matches on the raw value; a visitor who
  // typed a different case or format on the form is caught by the session-id join instead.
  if (email) queries.push(['email', String(email).trim()]);
  if (normalizedEmail && normalizedEmail !== String(email ?? '').trim()) {
    queries.push(['email', normalizedEmail]);
  }
  if (phone) queries.push(['phone', String(phone).trim()]);

  for (const [field, value] of queries) {
    try {
      const snapshot = await db.collection(LEADS_COLLECTION).where(field, '==', value).get();
      for (const doc of snapshot.docs) {
        const id = doc.data()?.sessionId;
        if (isValidSessionId(id)) found.add(id);
      }
    } catch (error) {
      console.error(`[leadIdentity] ${field} lookup failed:`, error.message);
    }
  }

  void normalizedPhone; // normalised only for the key; chatLeads stores the typed form.
  return [...found];
}

module.exports = {
  normalizeEmail,
  normalizePhone,
  contactKeyFor,
  sessionsForContact,
};
