/**
 * @file: functions/index.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Cloud Function entry points for the Nano Kava site. `sendContactEmail` is
 *     the 1st-gen contact form handler; `chat` is the 2nd-gen SSE endpoint for the
 *     Sol concierge. Both are thin transports — lead capture lives in lib/leads.js
 *     and the streaming chat core in lib/chat.js. `chat` also files each turn to Firestore
 *     through lib/chatStore.js. See CLAUDE.md for why the generations differ.
 *
 * @See Also:
 *     functions/lib/leads.js
 *     functions/lib/chat.js
 *     functions/lib/chatStore.js
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
const { persistLead, confirmLead } = require('./lib/chatLeads');
const { collectReport, sendDailyReport } = require('./lib/dailyReport');

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

      const { mailchimpOk } = await sendLead({ name, email, company, phone, types, message });

      // Only chat leads carry a sessionId; the contact form sends none and skips this quietly.
      if (sessionId) await confirmLead({ sessionId });

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
