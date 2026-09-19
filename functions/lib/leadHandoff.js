/**
 * @file: functions/lib/leadHandoff.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Everything that happens when a visitor presses Send on a chat lead, in the order it has to
 *     happen in: confirm the human act, claim the one email the conversation is allowed to send,
 *     copy the transcript somewhere permanent, and hand back what the email needs. Lives here
 *     rather than in index.js because the ORDER is the design — see CLAUDE.md § One lead, one
 *     email — and an order nobody can test is an order that drifts.
 *
 * @See Also:
 *     functions/lib/solReviews.js
 *     functions/lib/chatLeads.js
 *     functions/index.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { chatDb, loadTranscript } = require('./chatStore');
const { confirmLead, loadLead, claimLeadEmail, releaseLeadEmailClaim } = require('./chatLeads');
const { archiveForReview } = require('./solReviews');

/**
 * `confirmLead` first: a human pressing Send is true whether or not the mail then goes out, and
 * the daily report's SUBMITTED/unconfirmed split depends on it.
 *
 * The claim second, and before the send rather than after it, because two submissions racing is
 * exactly the case a post-hoc check cannot catch. `alreadyEmailed` is the caller's cue to answer
 * success and send nothing.
 *
 * The archive third, still before the send: it copies a transcript that is on a 90-day clock into
 * a collection with no TTL, and the review link in the email has to resolve long after that.
 *
 * Nothing here throws. A lead is emailed even when every one of these fails — a prospect lost to
 * a bookkeeping error is the one outcome none of this is worth.
 */
async function prepareChatLead({ db = chatDb(), sessionId, now = new Date() }) {
  await confirmLead({ db, sessionId, now });

  const claim = await claimLeadEmail({ db, sessionId, now });
  if (!claim.claimed) return { alreadyEmailed: true, transcript: null, reviewToken: null };

  const [transcriptResult, leadResult] = await Promise.all([
    loadTranscript({ db, sessionId }),
    loadLead({ db, sessionId }),
  ]);
  const transcript = transcriptResult.ok ? transcriptResult.transcript : null;

  const archived = await archiveForReview({
    db,
    sessionId,
    lead: leadResult.ok ? leadResult.lead : null,
    messages: transcript?.messages || [],
    page: transcript?.page || null,
    startedAt: transcript?.startedAt || null,
    usage: transcript?.usage || null,
    now,
  });

  return {
    alreadyEmailed: false,
    // The lead rides along so the markdown attachment stands on its own — it gets read months
    // later, out of the email that named the prospect.
    transcript: transcript ? { ...transcript, lead: leadResult.ok ? leadResult.lead : null } : null,
    reviewToken: archived.ok ? archived.token : null,
  };
}

/** The other half of the claim. Called only when the send threw; see chatLeads.js. */
async function abandonChatLead({ db = chatDb(), sessionId, now = new Date() }) {
  return releaseLeadEmailClaim({ db, sessionId, now });
}

module.exports = { prepareChatLead, abandonChatLead };
