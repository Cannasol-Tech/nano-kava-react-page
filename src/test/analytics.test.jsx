import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KavaLandingPage from '../components/KavaLandingPage';
import { ThemeProvider } from '../context/ThemeContext';
import * as gtag from '../utils/gtag';

// Mock dependencies
vi.mock('../components/NanoScene', () => ({
  default: () => null,
}));

vi.mock('../hooks/useScrollDepth', () => ({
  useScrollDepth: vi.fn(),
}));

vi.mock('../hooks/useScrollTransform', () => ({
  useScrollTransform: () => ({}),
}));

vi.mock('../hooks/useInView', () => ({
  useInView: () => [vi.fn(), true],
}));

describe('Analytics Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.dataLayer = [];
  });

  describe('Scroll Depth Tracking', () => {
    it('should initialize scroll depth hook on mount', () => {
      const { useScrollDepth } = require('../hooks/useScrollDepth');

      render(
        <MemoryRouter>
          <ThemeProvider>
            <KavaLandingPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      expect(useScrollDepth).toHaveBeenCalled();
    });
  });

  describe('CTA Click Tracking', () => {
    it('should track "Get Started" button click in navigation', () => {
      const trackCTAClickSpy = vi.spyOn(gtag, 'trackCTAClick');

      render(
        <MemoryRouter>
          <ThemeProvider>
            <KavaLandingPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const getStartedButton = screen.getByRole('link', { name: /get started/i });
      fireEvent.click(getStartedButton);

      expect(trackCTAClickSpy).toHaveBeenCalledWith('Get Started', 'nav');
    });

    it('should track "Request Sample" button click in hero', () => {
      const trackCTAClickSpy = vi.spyOn(gtag, 'trackCTAClick');

      render(
        <MemoryRouter>
          <ThemeProvider>
            <KavaLandingPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const requestSampleButton = screen.getByRole('link', { name: /request a sample/i });
      fireEvent.click(requestSampleButton);

      expect(trackCTAClickSpy).toHaveBeenCalledWith('Request Sample', 'hero');
    });

    it('should track "Contact Form" button click in CTA section', () => {
      const trackCTAClickSpy = vi.spyOn(gtag, 'trackCTAClick');

      render(
        <MemoryRouter>
          <ThemeProvider>
            <KavaLandingPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const contactFormButtons = screen.getAllByText(/contact form/i);
      fireEvent.click(contactFormButtons[0]);

      expect(trackCTAClickSpy).toHaveBeenCalledWith('Contact Form', 'cta-section');
    });
  });

  describe('GTM Event Pushing', () => {
    it('should push scroll depth events to dataLayer', () => {
      gtag.trackScrollDepth(50);

      expect(window.dataLayer).toContainEqual(
        expect.objectContaining({
          event: 'scroll_depth',
          depth: 50,
          page: expect.any(String),
        })
      );
    });

    it('should push CTA click events to dataLayer', () => {
      gtag.trackCTAClick('Test CTA', '/test');

      expect(window.dataLayer).toContainEqual(
        expect.objectContaining({
          event: 'cta_click',
          cta_name: 'Test CTA',
          page_location: '/test',
        })
      );
    });

    it('should push product view events to dataLayer', () => {
      gtag.trackProductView('Nano Kava');

      expect(window.dataLayer).toContainEqual(
        expect.objectContaining({
          event: 'view_item',
          item_name: 'Nano Kava',
          page: expect.any(String),
        })
      );
    });

    it('should push sample request events to dataLayer', () => {
      gtag.trackSampleRequest('nano-kava');

      expect(window.dataLayer).toContainEqual(
        expect.objectContaining({
          event: 'sample_request',
          product_type: 'nano-kava',
          page: expect.any(String),
        })
      );
    });
  });
});
