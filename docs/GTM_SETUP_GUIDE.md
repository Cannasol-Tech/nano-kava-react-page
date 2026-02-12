# GTM Conversion Tracking Setup Guide

**Container ID:** `GTM-57TMCR6T`

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

---

## Code Implementation Reference

### Files Modified

#### 1. `index.html` — GTM Container Snippet

Two snippets installed per Google's instructions:

- **Head snippet** (line 6-12): Loads the GTM container `GTM-57TMCR6T` asynchronously. Initializes `window.dataLayer` array that all tracking events are pushed to.
- **Body noscript** (line 175-178): Fallback iframe for users with JavaScript disabled. Required by Google for complete GTM installation.

#### 2. `src/utils/gtag.js` — Event Tracking Utility (new file)

Central module for all tracking. Every exported function pushes an object to `window.dataLayer`.

```
pushEvent(event, params)     — internal helper, pushes { event, ...params } to dataLayer
trackPageView(path, title)   — pushes 'page_view' with path, title, and full URL
trackFormConversion({ email })— pushes 'form_submission' with optional user_email
trackPhoneConversion()       — pushes 'phone_click'
trackEmailConversion()       — pushes 'email_click'
trackEvent(name, params)     — generic, for future use
```

The `window.dataLayer = window.dataLayer || []` guard in `pushEvent` ensures calls never throw, even if GTM hasn't loaded yet (ad blockers, test environments, SSR). Events are queued in the array and GTM processes them when it loads.

#### 3. `src/App.jsx` — SPA Page View Tracking

Added `useLocation` hook and a `useEffect` that fires `trackPageView` on every route change.

```jsx
useEffect(() => {
  const id = setTimeout(() => trackPageView(location.pathname, document.title), 0);
  return () => clearTimeout(id);
}, [location.pathname]);
```

The `setTimeout(..., 0)` is intentional: `react-helmet-async` updates `document.title` asynchronously after render. Without the delay, `document.title` would still be the previous page's title when the event fires. The cleanup `clearTimeout` prevents double-fires on rapid navigation.

#### 4. `src/components/ContactPage.jsx` — Form + Phone + Email

- **Import**: `trackFormConversion`, `trackPhoneConversion`, `trackEmailConversion`
- **Form conversion** (line 100): `trackFormConversion({ email: formData.email })` fires after `setStatus('success')` — only on confirmed successful POST response from the Cloud Function. The email is passed as `user_email` in the dataLayer push for potential enhanced conversion matching in Google Ads.
- **Phone links** (lines 133, 450): onClick handlers on the success-message inline link and the sidebar "Call Us" card.
- **Email link** (line 460): onClick handler on the sidebar "Email Us" card.
- **ContactInfoCard component** (line 313): Updated to accept and pass through an `onClick` prop to the anchor tag.

#### 5. `src/components/KavaLandingPage.jsx` — Phone + Email

- **Import**: `trackPhoneConversion`, `trackEmailConversion`
- **Phone links** (lines 384, 513, 905): Hero CTA, "What is Nano Kava?" section CTA, and bottom CTA section.
- **Email link** (line 915): Bottom CTA "Email Us" button.

#### 6. `src/components/FAQPage.jsx` — Phone

- **Import**: `trackPhoneConversion`
- **Phone link** (line 347): Bottom CTA "Call: (216) 921-2240" button.

#### 7. `src/components/MushroomsLandingPage.jsx` — Phone

- **Import**: `trackPhoneConversion`
- **Phone links** (lines 225, 413): Hero CTA and bottom CTA section.

### Coverage Summary

| Link Type | Total Links | Files | All Tracked? |
|---|---|---|---|
| `tel:+12169212240` | 8 | ContactPage, KavaLandingPage, FAQPage, MushroomsLandingPage | Yes (8/8) |
| `mailto:josh.detzel@cannasolusa.com` | 2 | ContactPage, KavaLandingPage | Yes (2/2) |
| Contact form submit | 1 | ContactPage | Yes (1/1) |
| SPA page views | 4 routes | App.jsx (all routes) | Yes |

### How onClick Tracking Works

All `tel:` and `mailto:` links use a simple pattern:

```jsx
<a href="tel:+12169212240" onClick={() => trackPhoneConversion()}>
```

- No `preventDefault()` — the browser navigates normally (opens phone dialer / email client)
- The dataLayer push happens synchronously before navigation
- `dataLayer.push()` is a simple array operation — it never blocks or delays the click

### Zero Dependencies Added

No npm packages were added. GTM is loaded via a script tag in `index.html`, and all tracking uses the native `window.dataLayer` array that GTM provides.
