/**
 * @file: functions/lib/leads.js
 * @author: Stephen Boyett
 *
 * @description:
 *     Transport-agnostic lead capture: validates a lead, emails the team and an
 *     auto-reply to the visitor via SendGrid, and best-effort upserts the contact
 *     into Mailchimp. Shared by the contact form function and the chat tool call.
 *     Owns the SendGrid and Mailchimp secret handles both functions must declare.
 *
 *     A chat lead's team email is the ONLY email that conversation produces: it carries the
 *     whole transcript inline, the same transcript as a markdown attachment, and the review CTA
 *     that feeds functions/lib/solReviews.js. See CLAUDE.md § One lead, one email.
 *
 * @See Also:
 *     functions/index.js
 *     functions/lib/chat.js
 *     functions/lib/transcript.js
 *     functions/lib/solReviews.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { defineSecret } = require('firebase-functions/params');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const { transcriptHtml, transcriptText, transcriptMarkdown } = require('./transcript');

const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const mailchimpApiKey = defineSecret('MAILCHIMP_API_KEY');
const mailchimpAudienceId = defineSecret('MAILCHIMP_AUDIENCE_ID');

const CHAT_LEAD_TYPE = 'Sol Chat';

const TEAM_RECIPIENTS = ['stephen.boyett@cannasolusa.com', 'josh.detzel@cannasolusa.com'];

// Lowercased once so the auto-reply suppression below is a set lookup, not a scan.
const TEAM_ADDRESSES = new Set(TEAM_RECIPIENTS.map((a) => a.toLowerCase()));

/** Nobody needs "we received your message" for a lead they submitted themselves while testing. */
const isTeamAddress = (address) => TEAM_ADDRESSES.has(String(address ?? '').trim().toLowerCase());

// Rewritten in firebase.json to the `solReview` function, so the link in the email is a real
// enjoynano.com URL rather than a cloudfunctions.net one. Overridable for a staging project.
const REVIEW_URL_BASE = process.env.SOL_REVIEW_URL || 'https://enjoynano.com/sol-review';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+()\-\s0-9]{7,20}$/;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Lead fields can originate from LLM-summarized visitor text; see CLAUDE.md § Lead email escaping.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

const MAX_SUBJECT_COMPANY = 60;

// A subject is a mail header, not markup: a CR/LF forges headers, so strip rather than escape.
const subjectSafe = (value) =>
  String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_SUBJECT_COMPANY).trim();

/**
 * Which forms this lead came through. `sources` is what the queue merged; a lead with no sources
 * recorded falls back to the inquiry type, which is how a lead looked before the queue existed.
 */
function resolvedSources(sources, types) {
  if (Array.isArray(sources) && sources.length) return sources;
  return types.includes(CHAT_LEAD_TYPE) ? ['chat'] : ['form'];
}

/** The line at the top of the email. A lead that used both is ONE lead that says it used both. */
function headingFor(sources = [], types = []) {
  const from = resolvedSources(sources, types);
  if (from.includes('chat') && from.includes('form')) return 'New Lead (Sol chat + contact form)';
  return from.includes('chat') ? 'New Chat Lead (Sol)' : 'New Contact Form Submission';
}

/** The Source: row, or nothing for a plain contact-form lead that has no story to tell. */
function sourceLine(sources = [], types = []) {
  const from = resolvedSources(sources, types);
  if (from.includes('chat') && from.includes('form')) {
    return 'Sol chat widget AND the contact form on enjoynano.com — same person, one lead';
  }
  return from.includes('chat') ? 'Sol chat widget on enjoynano.com' : '';
}

/** Builds the team email subject, naming the company when the lead carries one. */
function teamSubject({ types = [], company, sources } = {}) {
  const inquiryLabel = types.length > 1
    ? `${types[0]} + ${types.length - 1} more`
    : types[0] || 'General Inquiry';
  const prefix = headingFor(sources, types).replace(/^New /, 'New ');
  const org = subjectSafe(company);
  return org ? `${prefix}: ${org} \u2014 ${inquiryLabel}` : `${prefix}: ${inquiryLabel}`;
}

/** Renders a link only when the value is well-formed, so a hostile value cannot forge an href. */
function safeLink(value, scheme, pattern) {
  const escaped = escapeHtml(value);
  return pattern.test(value) ? `<a href="${scheme}:${escaped}">${escaped}</a>` : escaped;
}

/** Rejects a lead the transports must not attempt to send; see CLAUDE.md § Phone-only leads. */
function validateLead({ name, email, phone, message }) {
  if (!name || !message) {
    return { ok: false, error: 'Missing required fields: name, email, and message are required' };
  }
  if (!email && !phone) {
    return { ok: false, error: 'Missing required fields: name, email, and message are required' };
  }
  if (email && !EMAIL_REGEX.test(email)) {
    return { ok: false, error: 'Invalid email format' };
  }
  return { ok: true };
}

/** Best-effort Mailchimp upsert, tag and note; see CLAUDE.md § Mailchimp capture is best-effort. */
async function addLeadToMailchimp({ email, name, phone, company, types, message }) {
  const apiKey = mailchimpApiKey.value();
  const audienceId = mailchimpAudienceId.value();
  if (!apiKey || !audienceId) {
    console.warn('Mailchimp not configured (missing API key or audience ID); skipping lead capture');
    return { ok: false, skipped: true };
  }
  // Members are keyed by email; a phone-only lead is emailed but cannot join the audience.
  if (!email) return { ok: false, skipped: true };

  // Mailchimp API keys are suffixed with their data center, e.g. "...-us21"
  const dc = apiKey.split('-').pop();
  const base = `https://${dc}.api.mailchimp.com/3.0`;
  const headers = {
    Authorization: 'Basic ' + Buffer.from(`anystring:${apiKey}`).toString('base64'),
    'Content-Type': 'application/json',
  };
  // Member endpoints are keyed by the MD5 hash of the lowercased email
  const subscriberHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
  const memberUrl = `${base}/lists/${audienceId}/members/${subscriberHash}`;

  // Split the single name field into first / last for standard merge fields
  const [firstName, ...rest] = name.trim().split(/\s+/);
  const lastName = rest.join(' ');
  const mergeFields = {};
  if (firstName) mergeFields.FNAME = firstName;
  if (lastName) mergeFields.LNAME = lastName;
  if (phone) mergeFields.PHONE = phone;

  // 1) Upsert the contact. status_if_new only sets status on first add, so we
  //    never re-subscribe someone who previously unsubscribed.
  const upsertRes = await fetch(memberUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      email_address: email,
      status_if_new: 'subscribed',
      merge_fields: mergeFields,
    }),
  });
  if (!upsertRes.ok) {
    throw new Error(`Mailchimp upsert failed (${upsertRes.status}): ${await upsertRes.text()}`);
  }

  // 2) Tag the contact (source + inquiry types) for segmentation. Best-effort.
  try {
    const sourceTag = types.includes(CHAT_LEAD_TYPE) ? 'Nano Kava Sol Chat' : 'Nano Kava Contact Form';
    const tags = [sourceTag, ...types].map(name => ({ name, status: 'active' }));
    const tagRes = await fetch(`${memberUrl}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tags }),
    });
    if (!tagRes.ok) console.warn(`Mailchimp tagging failed (${tagRes.status}): ${await tagRes.text()}`);
  } catch (e) {
    console.warn('Mailchimp tagging error:', e.message);
  }

  // 3) Store company + message as a note so the full inquiry is on the contact.
  //    Best-effort; Mailchimp caps notes at 1000 characters.
  try {
    const noteParts = [];
    if (company) noteParts.push(`Company: ${company}`);
    if (types.length) noteParts.push(`Inquiry: ${types.join(', ')}`);
    if (message) noteParts.push(`Message: ${message}`);
    if (noteParts.length) {
      const noteRes = await fetch(`${memberUrl}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ note: noteParts.join('\n').slice(0, 1000) }),
      });
      if (!noteRes.ok) console.warn(`Mailchimp note failed (${noteRes.status}): ${await noteRes.text()}`);
    }
  } catch (e) {
    console.warn('Mailchimp note error:', e.message);
  }

  return { ok: true };
}

/** The token is the only credential the review page has, so it travels in the query string. */
function reviewUrl(token, params = {}) {
  const query = new URLSearchParams({ token, ...params }).toString();
  return `${REVIEW_URL_BASE}?${query}`;
}

/**
 * The CTA. Each star links to the questionnaire with that score already picked, one tap from
 * Save. The link itself records nothing: Microsoft 365 scans every link in an email before a
 * human opens it, and a link that saved on GET would score every lead on its own. See
 * docs/sol-review-loop.md § Why the stars preselect and do not save.
 */
function reviewCtaHtml(token) {
  const stars = [1, 2, 3, 4, 5].map((n) => `
              <a href="${escapeHtml(reviewUrl(token, { rating: String(n) }))}"
                 style="display:inline-block;width:38px;text-align:center;padding:9px 0;margin-right:6px;border-radius:8px;background:#ffffff;border:1px solid #99f6e4;color:#0f766e;font-weight:700;font-size:15px;text-decoration:none;">${n}</a>`).join('');

  return `
          <div style="margin:24px 0;padding:18px 20px;background:#f0fdfa;border:1px solid #99f6e4;border-radius:10px;">
            <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#0f766e;">How did Sol do on this one?</p>
            <p style="margin:0 0 12px;font-size:13px;color:#115e59;">
              Tap an overall score &mdash; 1 poor, 5 excellent. It opens the short review with that
              score picked; press Save to record it, or add knowledge, tone and handoff first. It
              becomes training material for Sol.
            </p>
            <div style="margin-bottom:12px;">${stars}</div>
            <a href="${escapeHtml(reviewUrl(token))}"
               style="display:inline-block;padding:11px 20px;border-radius:8px;background:#0d9488;color:#ffffff;font-weight:700;font-size:13px;text-decoration:none;">
              Review this conversation &rarr;
            </a>
          </div>`;
}

const reviewCtaText = (token) =>
  `\nHow did Sol do? Four taps — overall, knowledge, tone, handoff. It becomes training\n`
  + `material for Sol:\n${reviewUrl(token)}\n`;

const SOURCE_LABEL = { chat: 'Sol chat card', form: 'Contact form' };

const submissionTime = (at) => {
  const date = at instanceof Date ? at : (at?.toDate?.() || new Date(at));
  return Number.isNaN(date.getTime())
    ? '' : ` &middot; ${date.toISOString().replace('T', ' ').slice(0, 16)} UTC`;
};

/**
 * What the person actually sent, once per submission. A lead can be a chat card at 5:34 and a
 * contact form at 5:52 — they are one lead and one email, but they are two things they said,
 * and collapsing them into one blob would lose which came from where.
 */
function submissionsHtml(submissions) {
  if (!Array.isArray(submissions) || submissions.length === 0) return '';
  const blocks = submissions.map((s) => `
              <div style="margin:0 0 14px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#0f766e;text-transform:uppercase;letter-spacing:.05em;">
                  ${escapeHtml(SOURCE_LABEL[s.source] || s.source)}${submissionTime(s.at)}
                </p>
                <p style="margin:0;white-space:pre-wrap;background-color:#f9fafb;padding:14px;border-left:4px solid #10b981;border-radius:4px;">
${escapeHtml(s.message || '(no message)')}
                </p>
              </div>`).join('');

  return `
            <div style="margin: 20px 0;">
              <h3 style="color:#374151;margin:0 0 10px;font-size:15px;">
                What they sent
                ${submissions.length > 1
    ? `<span style="font-weight:400;color:#6b7280;font-size:13px;">&middot; ${submissions.length} submissions, one lead</span>`
    : ''}
              </h3>
              ${blocks}
            </div>`;
}

const submissionsText = (submissions) => (Array.isArray(submissions) ? submissions : [])
  .map((s) => `--- ${SOURCE_LABEL[s.source] || s.source} ---\n${s.message || '(no message)'}`)
  .join('\n\n');

/** Every conversation this person has had with Sol, inline. Also attached as markdown. */
function conversationsHtml(conversations) {
  if (!Array.isArray(conversations) || conversations.length === 0) return '';
  const count = conversations.reduce((n, c) => n + (c.messages?.length || 0), 0);

  const blocks = conversations.map((c) => `
              <p style="margin:12px 0 4px;font-size:12px;color:#6b7280;">
                ${escapeHtml(c.page || 'unknown page')} &middot; ${(c.messages || []).length} messages
              </p>
              ${transcriptHtml(c.messages)}`).join('');

  return `
            <div style="margin: 20px 0;">
              <h3 style="color:#374151;margin:0 0 4px;font-size:15px;">
                The conversation
                <span style="font-weight:400;color:#6b7280;font-size:13px;">
                  &middot; ${count} message${count === 1 ? '' : 's'}${
  conversations.length > 1 ? ` across ${conversations.length} chats` : ''} &middot; also attached as markdown
                </span>
              </h3>
              ${blocks}
            </div>`;
}

const conversationsText = (conversations) => (Array.isArray(conversations) ? conversations : [])
  .map((c) => `--- Sol conversation on ${c.page || 'unknown page'} ---\n${transcriptText(c.messages)}`)
  .join('\n\n');

/** One file, however many chats — an attachment per conversation is a filing problem, not a help. */
function conversationsAttachment({ conversations, lead }) {
  const body = conversations.map((c) => transcriptMarkdown({
    sessionId: c.sessionId, page: c.page, startedAt: c.startedAt, messages: c.messages,
  })).join('\n\n---\n\n');

  const header = [
    `# Lead — ${lead.name || 'unnamed'}${lead.company ? ` (${lead.company})` : ''}`,
    '',
    `- Email: ${lead.email || 'not provided'}`,
    `- Phone: ${lead.phone || 'not provided'}`,
    `- Asked about: ${(lead.types || []).join(', ') || 'not stated'}`,
    `- Submissions: ${(lead.submissions || []).length}`,
    '',
  ].join('\n');

  const slug = String(lead.email || lead.phone || 'lead')
    .replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 40);

  return {
    content: Buffer.from(`${header}\n${body}`, 'utf8').toString('base64'),
    filename: `sol-conversation-${slug}.md`,
    type: 'text/markdown',
    disposition: 'attachment',
  };
}

/**
 * Emails ONE lead to the team, plus — for a visitor who is not one of us — a single auto-reply.
 * `lead` is a merged batch from lib/leadQueue.js: one person, every submission they made inside
 * the quiet window, and every Sol conversation belonging to them. Throws only on SendGrid
 * failure. See CLAUDE.md § One email per lead, after the quiet period.
 */
async function sendLead({ lead, conversations = [], reviewToken = null }) {
  sgMail.setApiKey(sendgridApiKey.value());

  const { name, email, company, phone, types = [], sources = [], submissions = [] } = lead;

  const inquiryBadges = types.length > 0
    ? types.map(t =>
        `<span style="display:inline-block;background-color:#d1fae5;color:#065f46;padding:4px 10px;border-radius:12px;font-size:13px;margin:2px 4px 2px 0;">${escapeHtml(t)}</span>`
      ).join('')
    : '<span style="color:#6b7280;">General</span>';

  const emailHtml = email ? safeLink(email, 'mailto', EMAIL_REGEX) : 'Not provided';
  const phoneHtml = phone ? safeLink(phone, 'tel', PHONE_REGEX) : 'Not provided';

  // Chat leads reach Josh's inbox alongside form leads and must be tellable apart at a glance —
  // and a lead that did both is one lead that says so, not two emails.
  const heading = headingFor(sources, types);
  const subject = teamSubject({ types, company, sources });
  const sourceText = sourceLine(sources, types);
  const sourceRowHtml = sourceText
    ? `\n              <p style="margin: 10px 0;"><strong>Source:</strong> ${escapeHtml(sourceText)}</p>`
    : '';
  const footerLine = resolvedSources(sources, types).includes('chat')
    ? 'This lead came from a conversation with Sol, the chat concierge on the Cannasol Nano Kava landing page.'
    : 'This email was sent from the Cannasol Nano Kava landing page contact form.';

  const hasConversation = conversations.length > 0
    && conversations.some((c) => c.messages?.length);
  const conversationSection = hasConversation ? conversationsHtml(conversations) : '';
  const conversationLines = hasConversation ? `\n${conversationsText(conversations)}\n` : '';
  const ctaSection = reviewToken ? reviewCtaHtml(reviewToken) : '';
  const ctaLines = reviewToken ? reviewCtaText(reviewToken) : '';
  const attachments = hasConversation
    ? [conversationsAttachment({ conversations, lead })]
    : [];

  const emailToTeam = {
    to: TEAM_RECIPIENTS,
    from: {
      email: 'do-not-reply@enjoynano.com', // Must be verified in SendGrid
      name: 'EnjoyNano - Kava Landing Page'
    },
    ...(email ? { replyTo: email } : {}),
    ...(attachments.length ? { attachments } : {}),
    subject,
    text: `
${heading}

${sourceText ? `Source: ${sourceText}\n` : ''}Name: ${name || 'Not provided'}
Email: ${email || 'Not provided'}
Company: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}
Inquiry Type: ${types.length > 0 ? types.join(', ') : 'General'}

What they sent:
${submissionsText(submissions)}
${conversationLines}${ctaLines}
---
${footerLine}
        `,
    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
              ${heading}
            </h2>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">${sourceRowHtml}
              <p style="margin: 10px 0;"><strong>Name:</strong> ${escapeHtml(name || 'Not provided')}</p>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${emailHtml}</p>
              <p style="margin: 10px 0;"><strong>Company:</strong> ${company ? escapeHtml(company) : 'Not provided'}</p>
              <p style="margin: 10px 0;"><strong>Phone:</strong> ${phoneHtml}</p>
              <p style="margin: 10px 0;"><strong>Inquiry Type:</strong><br>${inquiryBadges}</p>
            </div>
${submissionsHtml(submissions)}${conversationSection}${ctaSection}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              ${footerLine}
            </p>
          </div>
        `,
  };

  // Auto-reply confirmation to customer. Sent from a do-not-reply address, so direct replies
  // to Josh — and skipped entirely when the "customer" is one of us, which is what made a test
  // lead arrive twice. See CLAUDE.md § One email per lead, after the quiet period.
  const autoReplyToCustomer = {
    to: email,
    from: {
      email: 'do-not-reply@enjoynano.com',
      name: 'EnjoyNano'
    },
    replyTo: 'josh.detzel@cannasolusa.com',
    subject: 'We received your message — EnjoyNano',
    text: `
Hi ${name || 'there'},

Thanks for reaching out to EnjoyNano about our Nano Kava products. This note confirms we've received your message and a member of our team will get back to you within 24 hours.

Please note this message was sent from an unmonitored address. If you have any further questions in the meantime, email Josh directly at josh.detzel@cannasolusa.com or call us at (216) 921-2240.

Best regards,
The EnjoyNano Team

---
This is an automated confirmation email. Please do not reply to this message.
        `,
    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">We Received Your Message!</h2>

            <p>Hi ${escapeHtml(name || 'there')},</p>

            <p>Thanks for reaching out to EnjoyNano about our Nano Kava products. This note confirms we've received your message and a member of our team will get back to you within 24 hours.</p>

            <p>Have a further question in the meantime? Email Josh directly at
              <a href="mailto:josh.detzel@cannasolusa.com" style="color: #10b981;">josh.detzel@cannasolusa.com</a>
              or call us at <a href="tel:+12169212240" style="color: #10b981;">(216) 921-2240</a>.</p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The EnjoyNano Team</strong>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 12px;">
              This is an automated confirmation email sent from an unmonitored address — please do not reply.
              For questions, email <a href="mailto:josh.detzel@cannasolusa.com" style="color: #6b7280;">josh.detzel@cannasolusa.com</a>.
            </p>
          </div>
        `,
  };

  // Captured before the email so a lead survives a SendGrid outage, and vice versa.
  let mailchimpOk = false;
  try {
    const result = await addLeadToMailchimp({
      email, name, phone, company, types, message: submissionsText(submissions),
    });
    mailchimpOk = result.ok;
  } catch (mcErr) {
    console.error('Mailchimp capture failed (lead still emailed):', mcErr.message);
  }

  // Primary path — its success determines the caller's response.
  const sends = [sgMail.send(emailToTeam)];
  if (email && !isTeamAddress(email)) sends.push(sgMail.send(autoReplyToCustomer));
  await Promise.all(sends);
  return { mailchimpOk, autoReplied: sends.length > 1 };
}

module.exports = {
  sendgridApiKey,
  mailchimpApiKey,
  mailchimpAudienceId,
  TEAM_RECIPIENTS,
  REVIEW_URL_BASE,
  isTeamAddress,
  headingFor,
  sourceLine,
  reviewUrl,
  validateLead,
  teamSubject,
  sendLead,
};
