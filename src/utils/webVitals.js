/**
 * Web Vitals monitoring and reporting.
 *
 * Tracks Core Web Vitals (CLS, INP, LCP) and additional metrics (FCP, TTFB)
 * and sends them to Google Tag Manager for performance analysis.
 *
 * Metrics:
 * - CLS (Cumulative Layout Shift): Visual stability (good < 0.1)
 * - INP (Interaction to Next Paint): Interactivity (good < 200ms) [replaces FID in web-vitals v5]
 * - LCP (Largest Contentful Paint): Loading performance (good < 2.5s)
 * - FCP (First Contentful Paint): Initial render (good < 1.8s)
 * - TTFB (Time to First Byte): Server response (good < 600ms)
 */

import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

/**
 * Send Web Vital metric to Google Tag Manager.
 */
function sendToGTM({ name, delta, value, id, rating }) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'web_vitals',
    metric_name: name,
    metric_value: Math.round(name === 'CLS' ? delta * 1000 : delta), // CLS: report as milliseconds
    metric_id: id,
    metric_rating: rating, // 'good', 'needs-improvement', 'poor'
  });

  // Optional: Log in development
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      delta: Math.round(delta),
      rating,
    });
  }
}

/**
 * Initialize Web Vitals tracking.
 * Call this once when the app loads.
 */
export function initWebVitals() {
  onCLS(sendToGTM);
  onINP(sendToGTM);
  onLCP(sendToGTM);
  onFCP(sendToGTM);
  onTTFB(sendToGTM);
}
