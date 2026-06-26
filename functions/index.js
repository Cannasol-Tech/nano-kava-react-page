const functions = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');
const cors = require('cors')({ origin: true });

// Define the secrets
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');
const mailchimpApiKey = defineSecret('MAILCHIMP_API_KEY');
const mailchimpAudienceId = defineSecret('MAILCHIMP_AUDIENCE_ID');

/**
 * Add a contact-form lead to the Mailchimp audience.
 *
 * Best-effort by design: this is called independently of the email send so a
 * lead is captured even if SendGrid is unavailable. The caller wraps it in a
 * try/catch; a failure here must never break form submission.
 *
 * @returns {Promise<{ok: boolean, skipped?: boolean}>}
 */
async function addLeadToMailchimp({ email, name, phone, company, types, message }) {
  const apiKey = mailchimpApiKey.value();
  const audienceId = mailchimpAudienceId.value();
  if (!apiKey || !audienceId) {
    console.warn('Mailchimp not configured (missing API key or audience ID); skipping lead capture');
    return { ok: false, skipped: true };
  }

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
    const tags = ['Nano Kava Contact Form', ...types].map(name => ({ name, status: 'active' }));
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

/**
 * Cloud Function to handle contact form submissions
 * Sends email via SendGrid
 */
// NOTE: Mailchimp is temporarily disabled until its secrets (MAILCHIMP_API_KEY,
// MAILCHIMP_AUDIENCE_ID) are created in Secret Manager. To re-enable, add them
// back to the secrets array below and restore the addLeadToMailchimp() call.
exports.sendContactEmail = functions
  .runWith({ secrets: [sendgridApiKey] })
  .https.onRequest((req, res) => {
  // Initialize SendGrid with the secret value
  sgMail.setApiKey(sendgridApiKey.value());
  // Enable CORS
  cors(req, res, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      const { name, email, company, phone, inquiryType, message } = req.body;

      // Validate required fields
      if (!name || !email || !message) {
        return res.status(400).json({
          error: 'Missing required fields: name, email, and message are required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Parse inquiry types (may be comma-separated for multi-select)
      const types = inquiryType
        ? inquiryType.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      const inquiryLabel = types.length > 1
        ? `${types[0]} + ${types.length - 1} more`
        : types[0] || 'General Inquiry';
      const inquiryBadges = types.length > 0
        ? types.map(t =>
            `<span style="display:inline-block;background-color:#d1fae5;color:#065f46;padding:4px 10px;border-radius:12px;font-size:13px;margin:2px 4px 2px 0;">${t}</span>`
          ).join('')
        : '<span style="color:#6b7280;">General</span>';

      // Email to your team
      const emailToTeam = {
        to: ['stephen.boyett@cannasolusa.com', 'josh.detzel@cannasolusa.com'],
        from: {
          email: 'do-not-reply@enjoynano.com', // Must be verified in SendGrid
          name: 'EnjoyNano - Kava Landing Page'
        },
        replyTo: email,
        subject: `New Contact Form Submission: ${inquiryLabel}`,
        text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}
Inquiry Type: ${types.length > 0 ? types.join(', ') : 'General'}

Message:
${message}

---
This email was sent from the Cannasol Nano Kava landing page contact form.
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 10px;">
              New Contact Form Submission
            </h2>

            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              <p style="margin: 10px 0;"><strong>Company:</strong> ${company || 'Not provided'}</p>
              <p style="margin: 10px 0;"><strong>Phone:</strong> ${phone ? `<a href="tel:${phone}">${phone}</a>` : 'Not provided'}</p>
              <p style="margin: 10px 0;"><strong>Inquiry Type:</strong><br>${inquiryBadges}</p>
            </div>

            <div style="margin: 20px 0;">
              <h3 style="color: #374151;">Message:</h3>
              <p style="white-space: pre-wrap; background-color: #f9fafb; padding: 15px; border-left: 4px solid #10b981; border-radius: 4px;">
${message}
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              This email was sent from the Cannasol Nano Kava landing page contact form.
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

            <p>Hi ${name},</p>

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

      // Capture the lead in Mailchimp first, independently of email. This is
      // best-effort and never blocks the response: if it fails the lead is still
      // emailed; if the email later fails, the lead is still safe in Mailchimp.
      // TEMPORARILY DISABLED until Mailchimp secrets are configured (see note above).
      let mailchimpOk = false;
      // try {
      //   const result = await addLeadToMailchimp({ email, name, phone, company, types, message });
      //   mailchimpOk = result.ok;
      // } catch (mcErr) {
      //   console.error('Mailchimp capture failed (lead still emailed):', mcErr.message);
      // }

      // Send both emails (primary path — its success determines the response)
      await Promise.all([
        sgMail.send(emailToTeam),
        sgMail.send(autoReplyToCustomer)
      ]);

      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        mailchimp: mailchimpOk
      });

    } catch (error) {
      console.error('Error sending email:', error);

      // SendGrid specific error handling
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
