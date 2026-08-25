import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from './renderWithProviders';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import ContactPage from '../components/ContactPage';
import KavaLandingPage from '../components/KavaLandingPage';
import { ThemeProvider } from '../context/ThemeContext';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

// Mock gtag utilities
vi.mock('../utils/gtag', () => ({
  trackFormConversion: vi.fn(),
  trackPhoneClick: vi.fn(),
  trackEmailClick: vi.fn(),
  trackCTAClick: vi.fn(),
}));

// Mock NanoScene component
vi.mock('../components/NanoScene', () => ({
  default: () => null,
}));

// Mock scroll depth hook
vi.mock('../hooks/useScrollDepth', () => ({
  useScrollDepth: () => null,
}));

// Mock scroll transform hook
vi.mock('../hooks/useScrollTransform', () => ({
  useScrollTransform: () => ({}),
}));

// Mock IntersectionObserver
vi.mock('../hooks/useInView', () => ({
  useInView: () => [vi.fn(), true],
}));

describe('Toast Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('ContactPage Form', () => {
    it('should show success toast on successful form submission', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithProviders(<ContactPage />);

      // Fill out form
      fireEvent.change(screen.getByLabelText(/your name/i), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'test@example.com' },
      });

      // Select inquiry type
      const sampleCheckbox = screen.getByLabelText(/request samples/i);
      fireEvent.click(sampleCheckbox);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Message sent successfully'),
          expect.any(Object)
        );
      });
    });

    it('should show error toast on failed form submission', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<ContactPage />);

      // Fill out form
      fireEvent.change(screen.getByLabelText(/your name/i), {
        target: { value: 'Test User' },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: 'test@example.com' },
      });

      // Select inquiry type
      const sampleCheckbox = screen.getByLabelText(/request samples/i);
      fireEvent.click(sampleCheckbox);

      // Submit form
      const submitButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to send message'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Phone and Email Click Tracking', () => {
    it('should track phone clicks in KavaLandingPage', () => {
      const { trackPhoneClick } = require('../utils/gtag');

      renderWithProviders(<KavaLandingPage />);

      // Find and click phone link (using aria-label or text content)
      const phoneLinks = screen.getAllByText(/216.*921.*2240/i);
      fireEvent.click(phoneLinks[0]);

      expect(trackPhoneClick).toHaveBeenCalled();
    });

    it('should track email clicks in KavaLandingPage', () => {
      const { trackEmailClick } = require('../utils/gtag');

      renderWithProviders(<KavaLandingPage />);

      // Find and click email link
      const emailLink = screen.getByText(/email us/i);
      fireEvent.click(emailLink);

      expect(trackEmailClick).toHaveBeenCalled();
    });
  });
});
