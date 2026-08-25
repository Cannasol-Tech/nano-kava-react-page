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

/** Track a lead captured in the Bula chat — deliberately separate from form_submission. */
export function trackChatLeadSubmitted({ email, name, phone, company } = {}) {
  const data = { lead_source: 'bula_chat' };
  if (email) data.user_email = email;
  if (name) data.user_name = name;
  if (phone) data.user_phone = phone;
  if (company) data.user_company = company;
  pushEvent('chat_lead_submitted', data);
}

/**
 * Track phone click with toast notification.
 * Import toast dynamically to avoid circular dependencies.
 */
export function trackPhoneClick() {
  trackPhoneConversion();
  import('react-hot-toast').then(({ default: toast }) => {
    toast('📞 Opening phone dialer...', { duration: 2000 });
  });
}

/**
 * Track email click with toast notification.
 * Import toast dynamically to avoid circular dependencies.
 */
export function trackEmailClick() {
  trackEmailConversion();
  import('react-hot-toast').then(({ default: toast }) => {
    toast('✉️ Opening email client...', { duration: 2000 });
  });
}

/** Generic event tracking for future use. */
export function trackEvent(eventName, eventParams = {}) {
  pushEvent(eventName, eventParams);
}

/** Track scroll depth milestones (25%, 50%, 75%, 100%). */
export function trackScrollDepth(percentage) {
  pushEvent('scroll_depth', {
    depth: percentage,
    page: window.location.pathname,
  });
}

/** Track CTA (Call-to-Action) button clicks. */
export function trackCTAClick(ctaName, location) {
  pushEvent('cta_click', {
    cta_name: ctaName,
    page_location: location || window.location.pathname,
  });
}

/** Track product view interactions. */
export function trackProductView(productName) {
  pushEvent('view_item', {
    item_name: productName,
    page: window.location.pathname,
  });
}

/** Track sample request submissions. */
export function trackSampleRequest(productType) {
  pushEvent('sample_request', {
    product_type: productType,
    page: window.location.pathname,
  });
}
