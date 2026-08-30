import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { initWebVitals } from '../utils/webVitals';

// Mock web-vitals library
vi.mock('web-vitals', () => ({
  onCLS: vi.fn((callback) => {
    // Simulate CLS metric
    callback({
      name: 'CLS',
      delta: 0.05,
      value: 0.05,
      id: 'test-cls-id',
      rating: 'good',
    });
  }),
  onINP: vi.fn((callback) => {
    // Simulate INP metric
    callback({
      name: 'INP',
      delta: 150,
      value: 150,
      id: 'test-inp-id',
      rating: 'good',
    });
  }),
  onLCP: vi.fn((callback) => {
    // Simulate LCP metric
    callback({
      name: 'LCP',
      delta: 2000,
      value: 2000,
      id: 'test-lcp-id',
      rating: 'good',
    });
  }),
  onFCP: vi.fn((callback) => {
    // Simulate FCP metric
    callback({
      name: 'FCP',
      delta: 1500,
      value: 1500,
      id: 'test-fcp-id',
      rating: 'good',
    });
  }),
  onTTFB: vi.fn((callback) => {
    // Simulate TTFB metric
    callback({
      name: 'TTFB',
      delta: 500,
      value: 500,
      id: 'test-ttfb-id',
      rating: 'good',
    });
  }),
}));

describe('Web Vitals Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.dataLayer = [];
  });

  it('should initialize all Web Vitals metrics', () => {
    initWebVitals();

    expect(onCLS).toHaveBeenCalled();
    expect(onINP).toHaveBeenCalled();
    expect(onLCP).toHaveBeenCalled();
    expect(onFCP).toHaveBeenCalled();
    expect(onTTFB).toHaveBeenCalled();
  });

  it('should send CLS metric to GTM dataLayer', () => {
    initWebVitals();

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'web_vitals',
        metric_name: 'CLS',
        metric_value: expect.any(Number),
        metric_id: 'test-cls-id',
        metric_rating: 'good',
      })
    );
  });

  it('should send INP metric to GTM dataLayer', () => {
    initWebVitals();

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'web_vitals',
        metric_name: 'INP',
        metric_value: 150,
        metric_id: 'test-inp-id',
        metric_rating: 'good',
      })
    );
  });

  it('should send LCP metric to GTM dataLayer', () => {
    initWebVitals();

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'web_vitals',
        metric_name: 'LCP',
        metric_value: 2000,
        metric_id: 'test-lcp-id',
        metric_rating: 'good',
      })
    );
  });

  it('should send FCP metric to GTM dataLayer', () => {
    initWebVitals();

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'web_vitals',
        metric_name: 'FCP',
        metric_value: 1500,
        metric_id: 'test-fcp-id',
        metric_rating: 'good',
      })
    );
  });

  it('should send TTFB metric to GTM dataLayer', () => {
    initWebVitals();

    expect(window.dataLayer).toContainEqual(
      expect.objectContaining({
        event: 'web_vitals',
        metric_name: 'TTFB',
        metric_value: 500,
        metric_id: 'test-ttfb-id',
        metric_rating: 'good',
      })
    );
  });
});
