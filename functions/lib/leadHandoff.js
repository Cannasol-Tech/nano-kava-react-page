/**
 * @file: functions/lib/leadHandoff.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Turns a claimed queue batch into the one email that lead produces: finds every Sol
 *     conversation belonging to the person, loads those transcripts, copies them somewhere
 *     permanent for review, and hands back a single object the templates render. Lives here
 *     rather than in index.js because the ORDER is the design — see CLAUDE.md § One email per
 *     lead, after the quiet period.
 *
 * @See Also:
 *     functions/lib/leadQueue.js
 *     functions/lib/leadIdentity.js
 *     functions/lib/solReviews.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { chatDb, loadTranscript } = require('./chatStore');
const { confirmLead, loadLead } = require('./chatLeads');
const { sessionsForContact } = require('./leadIdentity');
const { archiveForReview } = require('./solReviews');
const { dueLeads, claimForSend, markSent, returnToQueue } = require('./leadQueue');

// A person with more conversations than this is a returning visitor, not a lead: take the most
// recent, or one email carries a year of chat.
const MAX_CONVERSATIONS = 4;

const startedMs = (transcript) => {
  const value = transcript?.startedAt;
  if (value instanceof Date) return value.getTime();
  if (value && typeof value.toDate === 'function') return value.toDate().getTime();
  return 0;
};

/**
 * Everything the email needs, in the order it has to happen.
 *
 * The session join runs FIRST and widens what follows: a contact-form submission carries no
 * conversation of its own, and the whole point is that the person's chat is attached to it
 * anyway. `confirmLead` then marks each of those sessions as submitted by a human — that is
 * true the moment they pressed Send, and the daily report's SUBMITTED / unconfirmed split reads
 * it. The archive is last, and still before the send, because it copies transcripts that are on
 * a 90-day clock into a collection with none.
 *
 * Nothing here throws. A lead is emailed even when every one of these fails; a prospect lost to
 * a bookkeeping error is the one outcome none of this machinery is worth.
 */
async function prepareLeadEmail({ db = chatDb(), batch, now = new Date() }) {
  const sessionIds = await sessionsForContact({
    db,
    email: batch.email,
    phone: batch.phone,
    sessionIds: batch.sessionIds,
  });

  for (const sessionId of sessionIds) {
    await confirmLead({ db, sessionId, now });
  }

  const loaded = await Promise.all(sessionIds.map(async (sessionId) => {
    const [transcript, lead] = await Promise.all([
      loadTranscript({ db, sessionId }),
      loadLead({ db, sessionId }),
    ]);
    if (!transcript.ok || !transcript.transcript.messages.length) return null;
    return { ...transcript.transcript, lead: lead.ok ? lead.lead : null };
  }));

  const conversations = loaded
    .filter(Boolean)
    .sort((a, b) => startedMs(a) - startedMs(b))
    .slice(-MAX_CONVERSATIONS);

  const archived = await archiveForReview({
    db,
    contactKey: batch.contactKey,
    sequence: batch.sequence || 0,
    contact: {
      name: batch.name, email: batch.email, phone: batch.phone, company: batch.company,
      types: batch.types,
    },
    submissions: batch.submissions,
    conversations,
    now,
  });

  return {
    conversations,
    sessionIds,
    reviewToken: archived.ok ? archived.token : null,
    reviewId: archived.ok ? archived.reviewId : null,
  };
}

/**
 * Sends every lead that has gone quiet. `send` is injected rather than imported so this module
 * stays transport-agnostic and the whole loop is testable without a SendGrid stub reaching into
 * lib/leads.js's module cache.
 *
 * A claim that comes back empty is not an error: another sweep took it, which is exactly what
 * the claim is for. A send that throws goes back on the queue rather than being dropped — this
 * is the only path a lead has to a human, so a swallowed failure loses a prospect outright.
 */
async function sweepDueLeads({ db = chatDb(), send, now = new Date() }) {
  const due = await dueLeads({ db, now });
  if (!due.ok) return { ok: false, reason: 'read-failed', sent: 0, failures: [] };

  let sent = 0;
  const failures = [];

  for (const queued of due.leads) {
    const claim = await claimForSend({ db, contactKey: queued.contactKey, now });
    if (!claim.ok) continue;

    const batch = { ...claim.batch, sequence: queued.notifyCount || 0 };

    try {
      const prepared = await prepareLeadEmail({ db, batch, now });
      await send({
        lead: batch,
        conversations: prepared.conversations,
        reviewToken: prepared.reviewToken,
      });
      await markSent({ db, contactKey: batch.contactKey, now });
      sent += 1;
      console.info(`[leadSweep] sent ${batch.contactKey}: ${batch.submissions.length} submission(s),`
        + ` ${prepared.conversations.length} conversation(s)`);
    } catch (error) {
      await returnToQueue({ db, contactKey: batch.contactKey, now });
      failures.push(`${batch.contactKey}: ${error.message}`);
      console.error(`[leadSweep] ${batch.contactKey} failed, requeued:`, error.message);
    }
  }

  return { ok: true, sent, failures, considered: due.leads.length };
}

module.exports = { prepareLeadEmail, sweepDueLeads, MAX_CONVERSATIONS };
