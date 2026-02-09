# Firebase Hosting + Cloud Functions Setup Guide

This guide will help you deploy your Nano Kava landing page to Firebase Hosting with SendGrid email integration for the contact form.

## Prerequisites

1. **Firebase Account**: Create one at [firebase.google.com](https://firebase.google.com)
2. **SendGrid Account**: Create one at [sendgrid.com](https://sendgrid.com)
3. **Node.js**: Version 18 or higher
4. **Firebase CLI**: Install globally

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

## Step 3: SendGrid Setup

### 3.1 Create SendGrid API Key
1. Go to [SendGrid Dashboard](https://app.sendgrid.com/)
2. Navigate to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it "Nano Kava Contact Form"
5. Give it **Full Access** (or at least Mail Send permissions)
6. Copy the API key (you'll only see it once!)

### 3.2 Verify Sender Email
1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Add `noreply@cannasoltechnologies.com` (or your preferred email)
4. Complete verification process
5. **Important**: The "from" email in the Cloud Function must match this verified email

## Step 4: Set Firebase Environment Variables

Set your SendGrid API key as a Firebase environment variable:

```bash
firebase functions:config:set sendgrid.key="YOUR_SENDGRID_API_KEY_HERE"
```

Verify it was set:
```bash
firebase functions:config:get
```

## Step 5: Install Functions Dependencies

```bash
cd functions
npm install
cd ..
```

## Step 6: Build Your React App

```bash
npm run build
```

This creates the `dist` folder that Firebase will deploy.

## Step 7: Deploy to Firebase

Deploy everything (hosting + functions):
```bash
firebase deploy
```

Or deploy separately:
```bash
# Deploy hosting only
firebase deploy --only hosting

# Deploy functions only
firebase deploy --only functions
```

## Step 8: Update Contact Form Endpoint

The Cloud Function will be available at:
```
https://us-central1-nano-kava-landing-page.cloudfunctions.net/sendContactEmail
```

The ContactPage component needs to be updated to submit to this endpoint instead of Netlify.

## Configuration Files Created

- **`firebase.json`**: Firebase hosting and functions configuration
- **`.firebaserc`**: Links to your Firebase project
- **`functions/package.json`**: Cloud Functions dependencies
- **`functions/index.js`**: Contact form email handler

## Customization

### Change Recipient Email
Edit `functions/index.js` line 35:
```javascript
to: 'your-email@yourdomain.com',
```

### Change From Email
Edit `functions/index.js` line 36-39 (must be verified in SendGrid):
```javascript
from: {
  email: 'noreply@yourdomain.com',
  name: 'Your Company Name'
}
```

### Disable Auto-Reply
Comment out lines 93-95 in `functions/index.js`:
```javascript
// await Promise.all([
//   sgMail.send(emailToTeam),
//   sgMail.send(autoReplyToCustomer)  // Remove this line
// ]);

// Replace with:
await sgMail.send(emailToTeam);
```

## Testing Locally

### Test Functions Locally
```bash
# Start Firebase emulators
firebase emulators:start

# Your function will be available at:
# http://localhost:5001/nano-kava-landing-page/us-central1/sendContactEmail
```

### Test the Contact Form
Update the ContactPage submit URL to point to your local emulator for testing.

## Troubleshooting

### Error: "Unauthorized" from SendGrid
- Verify your SendGrid API key is correct
- Check that the API key has Mail Send permissions
- Ensure the "from" email is verified in SendGrid

### Error: "Function deployment failed"
- Make sure you're in the project root directory
- Run `cd functions && npm install` to ensure dependencies are installed
- Check that Node.js version is 18+

### Error: "Permission denied"
- Run `firebase login` to re-authenticate
- Ensure you have owner/editor permissions on the Firebase project

### Contact Form Not Working
- Check browser console for errors
- Verify the Cloud Function URL is correct
- Check Firebase Functions logs: `firebase functions:log`

## Monitoring & Logs

View function logs:
```bash
# View recent logs
firebase functions:log

# View logs for specific function
firebase functions:log --only sendContactEmail
```

Or view in Firebase Console:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Functions** → **Logs**

## Cost Estimate

Firebase Free Plan (Spark) includes:
- Hosting: 10 GB storage, 360 MB/day transfer
- Functions: 125K invocations/month, 40K GB-seconds, 40K CPU-seconds

SendGrid Free Plan includes:
- 100 emails/day

For a contact form, these free tiers should be more than sufficient!

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [SendGrid Documentation](https://docs.sendgrid.com)
- [Firebase Functions Logs](https://console.firebase.google.com)
