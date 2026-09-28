/**
 * @file: functions/index.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Cloud Function entry points for the Nano Kava site. `sendContactEmail` is
 *     the 1st-gen contact form handler; `chat` is the 2nd-gen SSE endpoint for the
 *     Sol concierge; `solReview` serves the questionnaire that lead email links to. All are
 *     thin transports — lead capture lives in lib/leads.js, the streaming chat core in
 *     lib/chat.js, and the permanent review corpus in lib/solReviews.js. `chat` also files each
 *     turn to Firestore through lib/chatStore.js. See CLAUDE.md for why the generations differ.
 *
 * @See Also:
 *     functions/lib/leads.js
 *     functions/lib/chat.js
 *     functions/lib/chatStore.js
 *     functions/lib/solReviews.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const functions = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const cors = require('cors')({ origin: true });

const {
  sendgridApiKey,
  mailchimpApiKey,
  mailchimpAudienceId,
  validateLead,
  sendLead,
} = require('./lib/leads');
const { streamChat, validateChatRequest, rateLimit } = require('./lib/chat');
const { persistTranscript, createTranscriptRecorder } = require('./lib/chatStore');
const { persistLead } = require('./lib/chatLeads');
const { sweepDueLeads } = require('./lib/leadHandoff');
const { enqueueSubmission, QUIET_MINUTES } = require('./lib/leadQueue');
const { collectReport, sendDailyReport } = require('./lib/dailyReport');
const { resolveReviewToken, loadReview, saveReview, recordRating } = require('./lib/solReviews');
const { renderForm, renderSaved, renderProblem } = require('./lib/reviewForm');

const googleAiApiKey = defineSecret('GOOGLE_AI_API_KEY');

const CHAT_ERROR_MESSAGE =
  'Something went wrong on my end. Try again, or reach the team through the contact form.';

/**
 * Contact form and chat-card submissions. It QUEUES and sends nothing — `sendPendingLeads` is
 * what emails a lead, once the person has stopped submitting. See CLAUDE.md § Why chat is gen2
 * and sendContactEmail is not for why the URL cannot change.
 *
 * It declares no secrets any more, deliberately: it no longer touches SendGrid or Mailchimp, and
 * a grant nothing uses is blast radius for free. They moved to `sendPendingLeads`.
 */
exports.sendContactEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { name, email, company, phone, inquiryType, message, sessionId, source } = req.body;

      const validation = validateLead({ name, email, phone, message });
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      // Inquiry types arrive comma-separated for the multi-select.
      const types = inquiryType
        ? inquiryType.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      // Nothing is emailed here. The submission is filed against the PERSON who made it and
      // the notification is held for the quiet period, so a second submission from the same
      // person joins this email instead of starting another one. `sendPendingLeads` below is
      // what actually sends. See lib/CLAUDE.md § One email per lead, after the quiet period.
      const queued = await enqueueSubmission({
        submission: {
          // An older cached bundle sends no `source`; before the contact form carried a session
          // id, having one meant a chat lead, so that inference is still the right fallback.
          source: source || (sessionId ? 'chat' : 'form'),
          name, email, phone, company, types, message, sessionId,
        },
      });

      if (!queued.ok) {
        // The only way this fails on a validated lead is a Firestore outage, and a prospect must
        // not be lost to one — say so loudly rather than telling the visitor it worked.
        console.error(`[lead] could not queue submission: ${queued.reason}`);
        return res.status(500).json({ error: 'Failed to send email', details: queued.reason });
      }

      console.info(`[lead] queued for ${queued.contactKey} (${queued.queued} pending,`
        + ` sends after ${QUIET_MINUTES}m quiet)`);

      return res.status(200).json({
        success: true,
        message: 'Message received',
        queued: true,
      });

    } catch (error) {
      console.error('Error sending email:', error);

      if (error.response) {
        console.error('SendGrid Error:', error.response.body);
      }

      return res.status(500).json({
        error: 'Failed to send email',
        details: error.message
      });
    }
  });
});

function clientIp(req) {
  if (req.ip) return req.ip;
  const forwarded = req.headers['x-forwarded-for'];
  return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
}

/** Streams a Sol reply as Server-Sent Events; see CLAUDE.md § Why chat is gen2 and sendContactEmail is not. */
exports.chat = onRequest(
  {
    cors: true,
    secrets: [googleAiApiKey],
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const limit = rateLimit(clientIp(req));
    if (!limit.ok) {
      return res.status(429).json({ error: 'Too many messages. Try again shortly.', retryAfter: limit.retryAfter });
    }

    const validation = validateChatRequest(req.body);
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    res.set('Content-Type', 'text/event-stream');
    res.set('Cache-Control', 'no-cache');
    res.set('Connection', 'keep-alive');
    res.set('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    const recorder = createTranscriptRecorder(send);

    try {
      await streamChat({
        apiKey: googleAiApiKey.value(),
        messages: validation.messages,
        quizAnswered: validation.quizAnswered,
        onEvent: recorder.emit,
      });
    } catch (error) {
      console.error('Chat stream failed:', error);
      send({ type: 'error', message: CHAT_ERROR_MESSAGE });
    }

    // After the stream: the visitor already has their answer, so a slow or failed write costs
    // them nothing. Neither call throws. See lib/CLAUDE.md § Transcript persistence.
    await persistTranscript({
      sessionId: validation.sessionId,
      history: validation.messages,
      reply: recorder.reply(),
      usage: recorder.usage(),
      page: validation.page,
    });

    // Awaited, not fired and forgotten: once res.end() runs the instance may be frozen mid-write.
    const proposed = recorder.lead();
    if (proposed) {
      await persistLead({ sessionId: validation.sessionId, fields: proposed, page: validation.page });
    }

    return res.end();
  }
);


/**
 * Sends every lead that has gone quiet. This is the ONLY place a lead email is sent — the
 * request path only queues — so that one person's chat card and contact form twenty minutes
 * apart arrive as one email rather than two. See lib/CLAUDE.md § One email per lead, after the
 * quiet period.
 *
 * Every two minutes, not every twenty: the sweep's job is to notice a window that has already
 * closed, so its interval is the delay ON TOP of the quiet period and should stay small.
 */
exports.sendPendingLeads = onSchedule(
  {
    schedule: 'every 2 minutes',
    secrets: [sendgridApiKey, mailchimpApiKey, mailchimpAudienceId],
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const result = await sweepDueLeads({ send: sendLead });

    if (!result.ok) throw new Error('[sendPendingLeads] could not read the queue');

    // Thrown so the run is marked failed and visible. The batches are already requeued, so the
    // next sweep retries them whether or not Cloud Scheduler retries this one.
    if (result.failures.length) {
      throw new Error(`[sendPendingLeads] ${result.failures.length} of ${result.considered}`
        + ` failed: ${result.failures.join(' | ')}`);
    }

    if (result.sent) console.info(`[sendPendingLeads] ${result.sent} lead email(s) sent`);
  }
);


/**
 * The questionnaire the lead email links to. 1st gen on purpose: hosting can rewrite
 * /sol-review straight onto a 1st-gen function by name, which is what keeps the link in the
 * email an enjoynano.com URL. It is also why this must not be "modernized" to gen2 — see
 * CLAUDE.md § Why chat is gen2 and sendContactEmail is not.
 *
 * The token IS the credential. It is 144 bits of randomness that only ever appeared in an email
 * to two people, so there is nothing further to authenticate against — and nothing here reveals
 * anything a holder of that link was not already sent.
 */
exports.solReview = functions.https.onRequest(async (req, res) => {
  // A private, token-addressed page: never indexed, never cached, and no token in a referrer.
  // No CORS wrapper either — this is a top-level navigation and a same-origin form post, so an
  // Access-Control-Allow-Origin header would only widen what a leaked token is worth.
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Cache-Control', 'no-store');
  res.set('Referrer-Policy', 'no-referrer');
  res.set('Content-Type', 'text/html; charset=utf-8');

  const problem = (status, message) => res.status(status).send(renderProblem(message));

  if (req.method !== 'GET' && req.method !== 'POST') {
    return problem(405, 'That method is not supported here.');
  }

  try {
    const token = String(req.query?.token || req.body?.token || '');
    const resolved = await resolveReviewToken({ token });
    if (!resolved.ok) {
      return problem(
        resolved.reason === 'read-failed' ? 500 : 404,
        'This review link is not one we recognise. It may have been mistyped, or truncated by '
        + 'an email client — try copying the whole URL out of the message.',
      );
    }

    const { reviewId } = resolved;

    if (req.method === 'POST') {
      const saved = await saveReview({ reviewId, answers: req.body || {} });
      if (!saved.ok) {
        const record = await loadReview({ reviewId });
        return res.status(saved.reason === 'empty-review' ? 400 : 500).send(renderForm({
          record: record.ok ? record.review : null,
          token,
          error: saved.reason === 'empty-review'
            ? 'Nothing was filled in — give it a score at least, and it will save.'
            : 'Something went wrong saving that. Try once more.',
        }));
      }
      console.info(`[solReview] review saved for ${reviewId}`);
      return res.status(200).send(renderSaved({ rating: Number(req.body?.rating) || null }));
    }

    // A star tapped straight from the inbox. Recorded before the form renders, so one click is
    // enough even if they never scroll — see docs/sol-review-loop.md § Why the stars are links.
    if (req.query?.rating) {
      const rated = await recordRating({ reviewId, rating: req.query.rating });
      if (rated.ok) console.info(`[solReview] one-click rating for ${reviewId}`);
    }

    const record = await loadReview({ reviewId });
    if (!record.ok) return problem(404, 'That lead is no longer on file.');

    return res.status(200).send(renderForm({ record: record.review, token }));
  } catch (error) {
    console.error('[solReview] request failed:', error);
    return problem(500, 'Something went wrong on our end. Try the link again shortly.');
  }
});


/**
 * The once-a-day review of every Sol conversation. It REPLACED the per-conversation digest
 * beacon, so it is now the only path a conversation takes to a human — which is why it sends on
 * silent days and retries. See lib/CLAUDE.md § The daily report replaced the digest.
 */
exports.dailyChatReport = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'America/New_York',
    secrets: [sendgridApiKey],
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async () => {
    const report = await collectReport({});
    const result = await sendDailyReport(report);

    const summary = `conversations=${report.conversations} submitted=${report.confirmedLeads}`
      + ` unconfirmed=${report.extractedOnly} attempts=${result.attempts}`;

    // Thrown, not swallowed: Cloud Scheduler retries a failed run, and a report nobody received
    // is the one failure mode this whole job exists to prevent.
    if (!result.ok) throw new Error(`[dailyReport] gave up after ${result.attempts}: ${result.error}`);

    console.info(`[dailyReport] sent: ${summary}`);
  }
);
