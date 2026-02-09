const functions = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const sgMail = require('@sendgrid/mail');
const cors = require('cors')({ origin: true });

// Define the secret
const sendgridApiKey = defineSecret('SENDGRID_API_KEY');

/**
 * Cloud Function to handle contact form submissions
 * Sends email via SendGrid
 */
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

      // Email to your team
      const emailToTeam = {
        to: ['stephen.boyett@cannasolusa.com', 'josh.detzel@cannasolusa.com'],
        from: {
          email: 'support@cannasolusa.com', // Must be verified in SendGrid
          name: 'Cannasol Technologies - Kava Landing Page'
        },
        replyTo: email,
        subject: `New Contact Form Submission: ${inquiryType || 'General Inquiry'}`,
        text: `
New Contact Form Submission

Name: ${name}
Email: ${email}
Company: ${company || 'Not provided'}
Phone: ${phone || 'Not provided'}
Inquiry Type: ${inquiryType || 'General'}

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
              <p style="margin: 10px 0;"><strong>Inquiry Type:</strong> ${inquiryType || 'General'}</p>
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

      // Optional: Auto-reply to customer
      const autoReplyToCustomer = {
        to: email,
        from: {
          email: 'support@cannasolusa.com',
          name: 'Cannasol Technologies'
        },
        subject: 'Thank you for contacting Cannasol Technologies',
        text: `
Hi ${name},

Thank you for reaching out to Cannasol Technologies regarding our Nano Kava products.

We've received your message and will get back to you within 24 hours. If you need immediate assistance, please feel free to call us at (216) 921-2240.

Best regards,
The Cannasol Technologies Team

---
This is an automated confirmation email.
        `,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Thank You for Contacting Us!</h2>

            <p>Hi ${name},</p>

            <p>Thank you for reaching out to Cannasol Technologies regarding our Nano Kava products.</p>

            <p>We've received your message and will get back to you within 24 hours. If you need immediate assistance, please feel free to call us at <a href="tel:+12169212240" style="color: #10b981;">(216) 921-2240</a>.</p>

            <p style="margin-top: 30px;">
              Best regards,<br>
              <strong>The Cannasol Technologies Team</strong>
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

            <p style="color: #6b7280; font-size: 12px;">
              This is an automated confirmation email.
            </p>
          </div>
        `,
      };

      // Send both emails
      await Promise.all([
        sgMail.send(emailToTeam),
        sgMail.send(autoReplyToCustomer)
      ]);

      return res.status(200).json({
        success: true,
        message: 'Email sent successfully'
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
