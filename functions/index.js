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
const { prepareChatLead, abandonChatLead } = require('./lib/leadHandoff');
const { collectReport, sendDailyReport } = require('./lib/dailyReport');
const { resolveReviewToken, loadReview, saveReview, recordRating } = require('./lib/solReviews');
const { renderForm, renderSaved, renderProblem } = require('./lib/reviewForm');

const googleAiApiKey = defineSecret('GOOGLE_AI_API_KEY');

const CHAT_ERROR_MESSAGE =
  'Something went wrong on my end. Try again, or reach the team through the contact form.';

/** Contact form submissions: emails the team plus an auto-reply, and captures the lead. */
exports.sendContactEmail = functions
  .runWith({ secrets: [sendgridApiKey, mailchimpApiKey, mailchimpAudienceId] })
  .https.onRequest((req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { name, email, company, phone, inquiryType, message, sessionId } = req.body;

      const validation = validateLead({ name, email, phone, message });
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      // Inquiry types arrive comma-separated for the multi-select.
      const types = inquiryType
        ? inquiryType.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      // Only chat leads carry a sessionId; the contact form sends none and skips all of this.
      const chatLead = sessionId ? await prepareChatLead({ sessionId }) : null;
      if (chatLead?.alreadyEmailed) {
        console.info('[lead] already emailed this session; not sending a second time');
        return res.status(200).json({ success: true, message: 'Already sent', duplicate: true });
      }

      let mailchimpOk = false;
      try {
        ({ mailchimpOk } = await sendLead({
          name, email, company, phone, types, message,
          transcript: chatLead?.transcript || null,
          reviewToken: chatLead?.reviewToken || null,
        }));
      } catch (sendError) {
        // Give the claim back, or the visitor's retry would be swallowed as a duplicate.
        if (sessionId) await abandonChatLead({ sessionId });
        throw sendError;
      }

      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        mailchimp: mailchimpOk
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

    const { sessionId } = resolved;

    if (req.method === 'POST') {
      const saved = await saveReview({ sessionId, answers: req.body || {} });
      if (!saved.ok) {
        const record = await loadReview({ sessionId });
        return res.status(saved.reason === 'empty-review' ? 400 : 500).send(renderForm({
          record: record.ok ? record.review : null,
          token,
          error: saved.reason === 'empty-review'
            ? 'Nothing was filled in — give it a score at least, and it will save.'
            : 'Something went wrong saving that. Try once more.',
        }));
      }
      console.info(`[solReview] review saved for ${sessionId}`);
      return res.status(200).send(renderSaved({ rating: Number(req.body?.rating) || null }));
    }

    // A star tapped straight from the inbox. Recorded before the form renders, so one click is
    // enough even if they never scroll — see docs/sol-review-loop.md § Why the stars are links.
    if (req.query?.rating) {
      const rated = await recordRating({ sessionId, rating: req.query.rating });
      if (rated.ok) console.info(`[solReview] one-click rating for ${sessionId}`);
    }

    const record = await loadReview({ sessionId });
    if (!record.ok) return problem(404, 'That conversation is no longer on file.');

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
