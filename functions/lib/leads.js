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
 * @See Also:
 *     functions/index.js
 *     functions/lib/chat.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

const { defineSecret } = require('firebase-functions/params');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const mailchimpApiKey = defineSecret('MAILCHIMP_API_KEY');
const mailchimpAudienceId = defineSecret('MAILCHIMP_AUDIENCE_ID');

const CHAT_LEAD_TYPE = 'Bula Chat';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+()\-\s0-9]{7,20}$/;

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Lead fields can originate from LLM-summarized visitor text; see CLAUDE.md § Lead email escaping.
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

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
    const sourceTag = types.includes(CHAT_LEAD_TYPE) ? 'Nano Kava Bula Chat' : 'Nano Kava Contact Form';
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

/** Emails the lead to the team plus an auto-reply to the visitor; throws only on SendGrid failure. */
async function sendLead({ name, email, company, phone, types, message }) {
  sgMail.setApiKey(sendgridApiKey.value());

  const inquiryLabel = types.length > 1
    ? `${types[0]} + ${types.length - 1} more`
    : types[0] || 'General Inquiry';
  const inquiryBadges = types.length > 0
    ? types.map(t =>
        `<span style="display:inline-block;background-color:#d1fae5;color:#065f46;padding:4px 10px;border-radius:12px;font-size:13px;margin:2px 4px 2px 0;">${escapeHtml(t)}</span>`
      ).join('')
    : '<span style="color:#6b7280;">General</span>';

  const emailHtml = email ? safeLink(email, 'mailto', EMAIL_REGEX) : 'Not provided';
  const phoneHtml = phone ? safeLink(phone, 'tel', PHONE_REGEX) : 'Not provided';

  // Chat leads reach Josh's inbox alongside form leads and must be tellable apart at a glance.
  const isChatLead = types.includes(CHAT_LEAD_TYPE);
  const heading = isChatLead ? 'New Chat Lead (Bula)' : 'New Contact Form Submission';
  const subject = isChatLead
    ? `New Chat Lead (Bula): ${inquiryLabel}`
    : `New Contact Form Submission: ${inquiryLabel}`;
  const sourceLine = isChatLead ? 'Source: Bula chat widget on enjoynano.com\n' : '';
  const sourceRowHtml = isChatLead
    ? '\n              <p style="margin: 10px 0;"><strong>Source:</strong> Bula chat widget on enjoynano.com</p>'
    : '';
  const footerLine = isChatLead
    ? 'This lead came from a conversation with Bula, the chat concierge on the Cannasol Nano Kava landing page.'
    : 'This email was sent from the Cannasol Nano Kava landing page contact form.';

  // Email to your team
  const emailToTeam = {
    to: ['stephen.boyett@cannasolusa.com', 'josh.detzel@cannasolusa.com'],
    from: {
      email: 'do-not-reply@enjoynano.com', // Must be verified in SendGrid
      name: 'EnjoyNano - Kava Landing Page'
    },
    ...(email ? { replyTo: email } : {}),
    subject,
    text: `
${heading}

${sourceLine}Name: ${name}
Email: ${email || 'Not provided'}
Company: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}
Inquiry Type: ${types.length > 0 ? types.join(', ') : 'General'}

Message:
${message}

---
${footerLine}
        `,
    html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
              ${heading}
            </h2>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">${sourceRowHtml}
              <p style="margin: 10px 0;"><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p style="margin: 10px 0;"><strong>Email:</strong> ${emailHtml}</p>
              <p style="margin: 10px 0;"><strong>Company:</strong> ${company ? escapeHtml(company) : 'Not provided'}</p>
              <p style="margin: 10px 0;"><strong>Phone:</strong> ${phoneHtml}</p>
              <p style="margin: 10px 0;"><strong>Inquiry Type:</strong><br>${inquiryBadges}</p>
            </div>

            <div style="margin: 20px 0;">
              <h3 style="color: #374151;">Message:</h3>
              <p style="white-space: pre-wrap; background-color: #f9fafb; padding: 15px; border-left: 4px solid #10b981; border-radius: 4px;">
${escapeHtml(message)}
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              ${footerLine}
            </p>
          </div>
        `,
  };

  // Auto-reply confirmation to customer.
  // Sent from a do-not-reply address, so direct replies to Josh.
  const autoReplyToCustomer = {
    to: email,
    from: {
      email: 'do-not-reply@enjoynano.com',
      name: 'EnjoyNano'
    },
    replyTo: 'josh.detzel@cannasolusa.com',
    subject: 'We received your message — EnjoyNano',
    text: `
Hi ${name},

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

            <p>Hi ${escapeHtml(name)},</p>

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
    const result = await addLeadToMailchimp({ email, name, phone, company, types, message });
    mailchimpOk = result.ok;
  } catch (mcErr) {
    console.error('Mailchimp capture failed (lead still emailed):', mcErr.message);
  }

  // Primary path — its success determines the caller's response.
  const sends = [sgMail.send(emailToTeam)];
  if (email) sends.push(sgMail.send(autoReplyToCustomer));
  await Promise.all(sends);
  return { mailchimpOk };
}

module.exports = {
  sendgridApiKey,
  mailchimpApiKey,
  mailchimpAudienceId,
  validateLead,
  sendLead,
};
