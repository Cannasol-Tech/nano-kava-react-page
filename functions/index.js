/**
 * @file: functions/index.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Cloud Function entry points for the Nano Kava site. `sendContactEmail` is
 *     the 1st-gen contact form handler; `chat` is the 2nd-gen SSE endpoint for the
 *     Bula concierge. Both are thin transports — lead capture lives in lib/leads.js
 *     and the streaming chat core in lib/chat.js. See CLAUDE.md for why the
 *     generations differ.
 *
 * @See Also:
 *     functions/lib/leads.js
 *     functions/lib/chat.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const functions = require('firebase-functions');
const { onRequest } = require('firebase-functions/v2/https');
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
      const { name, email, company, phone, inquiryType, message } = req.body;

      const validation = validateLead({ name, email, phone, message });
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }

      // Inquiry types arrive comma-separated for the multi-select.
      const types = inquiryType
        ? inquiryType.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const { mailchimpOk } = await sendLead({ name, email, company, phone, types, message });

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

/** Streams a Bula reply as Server-Sent Events; see CLAUDE.md § Why chat is gen2 and sendContactEmail is not. */
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

    try {
      await streamChat({
        apiKey: googleAiApiKey.value(),
        messages: validation.messages,
        onEvent: send,
      });
    } catch (error) {
      console.error('Chat stream failed:', error);
      send({ type: 'error', message: CHAT_ERROR_MESSAGE });
    }

    return res.end();
  }
);
