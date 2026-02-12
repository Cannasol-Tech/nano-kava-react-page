# GTM Conversion Tracking Setup Guide

**Container ID:** `GTM-PWRXHZ8S`

The GTM container is installed on the site and our code is already pushing events. Follow these steps to connect them to Google Ads conversions.

---

## Prerequisites — Google Ads Conversion Actions

Go to **Google Ads > Goals > Conversions > Summary** and create 3 conversion actions:

1. **Form Submission**
2. **Phone Call Click**
3. **Email Click**

Each one will give you:
- A **Conversion ID** (same for all 3, format: `AW-XXXXXXXXXX`)
- A **Conversion Label** (unique per action)

Keep these handy for Step 2.

---

## Step 1 — Create 3 Triggers in GTM

Go to [tagmanager.google.com](https://tagmanager.google.com/) > your container > **Triggers > New > Custom Event**

| Trigger Name | Event Name (enter exactly) |
|---|---|
| Form Submission | `form_submission` |
| Phone Click | `phone_click` |
| Email Click | `email_click` |

---

## Step 2 — Create 3 Tags in GTM

Go to **Tags > New > Google Ads Conversion Tracking**

| Tag Name | Conversion ID | Conversion Label | Firing Trigger |
|---|---|---|---|
| Ads - Form Submission | `AW-XXXXXXXXXX` | *(from Google Ads)* | Form Submission |
| Ads - Phone Click | `AW-XXXXXXXXXX` | *(from Google Ads)* | Phone Click |
| Ads - Email Click | `AW-XXXXXXXXXX` | *(from Google Ads)* | Email Click |

---

## Step 3 — Preview & Test

1. Click **Preview** in GTM
2. Open the site — navigate between pages, click a phone link, submit a test form
3. In the **Tag Assistant** panel, verify each tag fires on the correct event

---

## Step 4 — Publish

1. Go back to GTM
2. Click **Submit**
3. Name the version "Initial conversion tracking"
4. Click **Publish**

---

## Step 5 — Verify in Google Ads

Go to **Google Ads > Conversions**. Test conversions should appear within 1-3 hours. Status will change from "Unverified" to "Recording conversions."

---

## Event Reference

These are the events our code pushes to `dataLayer`:

| Event | When It Fires | Where |
|---|---|---|
| `page_view` | Every route change | All pages |
| `form_submission` | Successful contact form submit | Contact page |
| `phone_click` | Click on any phone link | All pages (8 links) |
| `email_click` | Click on any email link | Contact + Kava pages (2 links) |

No code changes are needed — everything is handled in GTM.
