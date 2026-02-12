/**
 * Google Tag Manager event tracking utilities.
 *
 * Events are pushed to window.dataLayer for GTM to pick up.
 * Configure conversion tags and triggers in the GTM console:
 *   https://tagmanager.google.com/
 *
 * Container ID: GTM-57TMCR6T
 *
 * GTM trigger setup (Custom Events):
 *   - "form_submission" → Google Ads Conversion tag for form submits
 *   - "phone_click"     → Google Ads Conversion tag for phone calls
 *   - "email_click"     → Google Ads Conversion tag for email clicks
 */

function pushEvent(event, params = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/** Track virtual page view on SPA route change. */
export function trackPageView(path, title) {
  pushEvent('page_view', {
    page_path: path,
    page_title: title,
    page_location: window.location.origin + path,
  });
}

/** Track contact form submission with user-provided data for enhanced conversions. */
export function trackFormConversion({ email, name, phone, company } = {}) {
  const data = {};
  if (email) data.user_email = email;
  if (name) data.user_name = name;
  if (phone) data.user_phone = phone;
  if (company) data.user_company = company;
  pushEvent('form_submission', data);
}

/** Track phone call click. */
export function trackPhoneConversion() {
  pushEvent('phone_click', {
    click_page: window.location.pathname,
  });
}

/** Track email click. */
export function trackEmailConversion() {
  pushEvent('email_click', {
    click_page: window.location.pathname,
  });
}

/** Generic event tracking for future use. */
export function trackEvent(eventName, eventParams = {}) {
  pushEvent(eventName, eventParams);
}
