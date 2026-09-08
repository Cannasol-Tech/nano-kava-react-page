# Stephen's Action Items: Google Analytics, GTM & Google Ads Setup

This checklist outlines the exact steps to configure conversion tracking for EnjoyNano across Google Analytics 4 (GA4), Google Tag Manager (GTM), and Google Ads.

---

## 📌 Reference Data
- **GTM Container ID:** `GTM-57TMCR6T`
- **Frontend Events Already Dispatched:**
  - `chat_lead_submitted` — Sol chat sample request submitted (Send pressed)
  - `form_submission` — Contact page form submitted
  - `phone_click` — Phone number clicked / dialer opened
  - `email_click` — Email link clicked
  - `sol_chat_open` — Sol chat widget opened (launcher, dwell, or scroll trigger)

---

## 1. Google Tag Manager (GTM) Setup

🔗 Open: [tagmanager.google.com](https://tagmanager.google.com/) (Container: `GTM-57TMCR6T`)

### A. Create Custom Event Triggers
Create a trigger for each key user action:
1. Navigate to **Triggers** > **New**.
2. Click **Trigger Configuration** > choose **Custom Event**.
3. Configure the following:
   - **Trigger 1 (Sol Chat Lead):**
     - Event Name: `chat_lead_submitted`
     - Trigger Name: `Custom Event - Sol Chat Lead`
   - **Trigger 2 (Contact Form Lead):**
     - Event Name: `form_submission`
     - Trigger Name: `Custom Event - Contact Form`
   - **Trigger 3 (Phone Call):**
     - Event Name: `phone_click`
     - Trigger Name: `Custom Event - Phone Click`
   - **Trigger 4 (Email Click):**
     - Event Name: `email_click`
     - Trigger Name: `Custom Event - Email Click`
4. Click **Save** on each.

### B. Create GA4 Event Tags
1. Navigate to **Tags** > **New**.
2. Click **Tag Configuration** > select **Google Analytics: GA4 Event**.
3. Select your GA4 Configuration Tag (or enter your `G-XXXXXXXXXX` Measurement ID).
4. Configure tag pairs:
   - **Tag 1:**
     - Event Name: `chat_lead_submitted`
     - Trigger: `Custom Event - Sol Chat Lead`
     - Tag Name: `GA4 Event - Sol Chat Lead Submitted`
   - **Tag 2:**
     - Event Name: `form_submission`
     - Trigger: `Custom Event - Contact Form`
     - Tag Name: `GA4 Event - Contact Form Submitted`
   - **Tag 3:**
     - Event Name: `phone_click`
     - Trigger: `Custom Event - Phone Click`
     - Tag Name: `GA4 Event - Phone Click`
5. Click **Submit** (top right) and **Publish** the workspace.

---

## 2. Google Analytics 4 (GA4) Key Events Setup

🔗 Open: [analytics.google.com](https://analytics.google.com/)

1. Click the **Admin** gear icon (bottom-left).
2. Under **Data display**, select **Events** (or **Key Events** / **Conversions**).
3. If the events have already fired recently, find them in the list and toggle **Mark as key event**.
4. If they have not fired yet:
   - Click **New key event** (or **Create event**).
   - Enter exact event names:
     - `chat_lead_submitted`
     - `form_submission`
     - `phone_click`
   - Save each as a Key Event / Conversion.

---

## 3. Google Ads Conversion Tracking

🔗 Open: [ads.google.com](https://ads.google.com/)

### Method A: Direct Import from GA4 (Recommended & Fastest)
1. In Google Ads, go to **Goals** > **Conversions** > **Summary**.
2. Click **+ New conversion action**.
3. Choose **Import** > **Google Analytics (GA4)** > **Web**.
4. Select `chat_lead_submitted` and `form_submission`.
5. Click **Import and continue**.
6. Set **Count** to `One` (so repeat submissions by one visitor in one session count as 1 conversion).

### Method B: Native Google Ads Tag via GTM (Alternative)
1. In Google Ads, click **+ New conversion action** > **Website**.
2. Name the conversion (e.g., `Nano Kava Sample Request`).
3. Copy the **Conversion ID** and **Conversion Label**.
4. In GTM:
   - Create a **Conversion Linker** tag (fires on *All Pages*).
   - Create a **Google Ads Conversion Tracking** tag:
     - Paste Conversion ID & Conversion Label.
     - Set Trigger to `Custom Event - Sol Chat Lead`.
5. Publish GTM container.

---

## 4. Verification Checklist

- [ ] Open [enjoynano.com](https://enjoynano.com) in Chrome with Google Tag Assistant / GA4 DebugView open.
- [ ] Send a test message to Sol, request a sample, and click Send on the sample card.
- [ ] Verify `chat_lead_submitted` fires in GTM Preview mode and appears in GA4 DebugView.
- [ ] Submit a test message on `/contact` and verify `form_submission` fires.
- [ ] Click phone link and verify `phone_click` fires.
- [ ] Confirm email received at `stephen.boyett@cannasolusa.com` and `josh.detzel@cannasolusa.com`.
