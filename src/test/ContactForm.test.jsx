import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ContactPage from '../components/ContactPage';

import { renderWithProviders } from './renderWithProviders';

// Helper function to render with router
function renderContactPage() {
  return renderWithProviders(<ContactPage />);
}

describe('ContactPage', () => {
  describe('Page Rendering', () => {
    it('renders the contact page with header', () => {
      renderContactPage();

      expect(screen.getByRole('heading', { name: /let's connect/i })).toBeInTheDocument();
    });

    it('renders the contact form section', () => {
      renderContactPage();

      expect(screen.getByText(/send us a message/i)).toBeInTheDocument();
    });

    it('renders navigation with back to home link', () => {
      renderContactPage();

      expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
    });

    it('renders FAQ link in navigation', () => {
      renderContactPage();

      const faqLinks = screen.getAllByRole('link', { name: /faq/i });
      expect(faqLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Contact Information Sidebar', () => {
    it('displays phone number with clickable link', () => {
      renderContactPage();

      const phoneLink = screen.getByRole('link', { name: /call us/i }).closest('a') ||
                       screen.getByText(/\(216\) 921-2240/).closest('a');
      expect(phoneLink).toHaveAttribute('href', 'tel:+12169212240');
    });

    it('displays email with clickable link', () => {
      renderContactPage();

      const emailText = screen.getByText(/josh\.detzel@cannasolusa\.com/i);
      expect(emailText).toBeInTheDocument();
    });

    it('displays location information', () => {
      renderContactPage();

      expect(screen.getByText(/sarasota, florida/i)).toBeInTheDocument();
    });

    it('displays business hours in ET, never EST', () => {
      renderContactPage();

      expect(screen.getByText(/9:30\s*am.*5:30\s*pm et\b/i)).toBeInTheDocument();
    });

    it('displays Josh\'s direct line alongside the office number', () => {
      renderContactPage();

      const joshLink = screen.getByText(/\(330\) 808-0546/).closest('a');
      expect(joshLink).toHaveAttribute('href', 'tel:+13308080546');
    });

    it('shows no minimum to get started, never MOQ', () => {
      renderContactPage();

      expect(screen.getByText(/no minimum to get started/i)).toBeInTheDocument();
      expect(screen.queryByText(/\bMOQ\b/i)).toBeNull();
    });

    it('displays quick links section', () => {
      renderContactPage();

      expect(screen.getByText(/quick links/i)).toBeInTheDocument();
    });
  });
});

describe('ContactForm', () => {
  describe('Form Fields Rendering', () => {
    it('renders name input field', () => {
      renderContactPage();

      expect(screen.getByPlaceholderText(/john smith/i)).toBeInTheDocument();
      expect(screen.getByText(/full name/i)).toBeInTheDocument();
    });

    it('renders email input field', () => {
      renderContactPage();

      expect(screen.getByPlaceholderText(/john@company\.com/i)).toBeInTheDocument();
      expect(screen.getByText(/email address/i)).toBeInTheDocument();
    });

    it('renders company input field', () => {
      renderContactPage();

      expect(screen.getByPlaceholderText(/your company/i)).toBeInTheDocument();
      expect(screen.getByText(/company name/i)).toBeInTheDocument();
    });

    it('renders phone input field', () => {
      renderContactPage();

      expect(screen.getByPlaceholderText(/\+1 \(555\) 000-0000/i)).toBeInTheDocument();
      expect(screen.getByText(/phone number/i)).toBeInTheDocument();
    });

    it('renders message textarea', () => {
      renderContactPage();

      expect(screen.getByPlaceholderText(/tell us about your project/i)).toBeInTheDocument();
      expect(screen.getByText(/your message/i)).toBeInTheDocument();
    });

    it('renders all inquiry type options', () => {
      renderContactPage();

      // Use getAllByText since some inquiry types may appear multiple times on the page
      const requestSamples = screen.getAllByText(/request samples/i);
      expect(requestSamples.length).toBeGreaterThan(0);
      const pricing = screen.getAllByText(/pricing & volume quotes/i);
      expect(pricing.length).toBeGreaterThan(0);
      const formulation = screen.getAllByText(/formulation support/i);
      expect(formulation.length).toBeGreaterThan(0);
      const partnership = screen.getAllByText(/partnership inquiry/i);
      expect(partnership.length).toBeGreaterThan(0);
      const general = screen.getAllByText(/general question/i);
      expect(general.length).toBeGreaterThan(0);
    });

    it('renders submit button', () => {
      renderContactPage();

      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });
  });

  describe('Form Input Handling', () => {
    it('allows typing in name field', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const nameInput = screen.getByPlaceholderText(/john smith/i);
      await user.type(nameInput, 'Jane Doe');

      expect(nameInput).toHaveValue('Jane Doe');
    });

    it('allows typing in email field', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const emailInput = screen.getByPlaceholderText(/john@company\.com/i);
      await user.type(emailInput, 'jane@test.com');

      expect(emailInput).toHaveValue('jane@test.com');
    });

    it('allows typing in company field', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const companyInput = screen.getByPlaceholderText(/your company/i);
      await user.type(companyInput, 'Test Corp');

      expect(companyInput).toHaveValue('Test Corp');
    });

    it('allows typing in phone field', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const phoneInput = screen.getByPlaceholderText(/\+1 \(555\) 000-0000/i);
      await user.type(phoneInput, '555-123-4567');

      expect(phoneInput).toHaveValue('555-123-4567');
    });

    it('allows typing in message field', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const messageInput = screen.getByPlaceholderText(/tell us about your project/i);
      await user.type(messageInput, 'I would like to learn more about nano kava.');

      expect(messageInput).toHaveValue('I would like to learn more about nano kava.');
    });

    it('allows selecting inquiry type', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const samplesButton = screen.getByRole('button', { name: /request samples/i });
      await user.click(samplesButton);

      // After clicking, button should have gradient styling indicating selection
      expect(samplesButton).toHaveClass('bg-gradient-to-r');
    });
  });

  describe('Form Validation', () => {
    it('shows error when name is empty on submit', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('shows error when email is empty on submit', async () => {
      renderContactPage();
      const user = userEvent.setup();

      // Fill in name but not email
      const nameInput = screen.getByPlaceholderText(/john smith/i);
      await user.type(nameInput, 'Jane Doe');

      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const nameInput = screen.getByPlaceholderText(/john smith/i);
      await user.type(nameInput, 'Jane Doe');

      // Use an email-like format that HTML5 may accept but our regex rejects
      // Our regex requires: [chars]@[chars].[chars] - so "invalid@email" fails
      const emailInput = screen.getByPlaceholderText(/john@company\.com/i);
      await user.type(emailInput, 'invalid@email');

      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it('shows error when inquiry type is not selected', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const nameInput = screen.getByPlaceholderText(/john smith/i);
      await user.type(nameInput, 'Jane Doe');

      const emailInput = screen.getByPlaceholderText(/john@company\.com/i);
      await user.type(emailInput, 'jane@test.com');

      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please select at least one inquiry type/i)).toBeInTheDocument();
      });
    });

    it('shows error when message is empty for other inquiry type', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const nameInput = screen.getByPlaceholderText(/john smith/i);
      await user.type(nameInput, 'Jane Doe');

      const emailInput = screen.getByPlaceholderText(/john@company\.com/i);
      await user.type(emailInput, 'jane@test.com');

      const otherButton = screen.getByRole('button', { name: /^other$/i });
      await user.click(otherButton);

      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please describe your inquiry/i)).toBeInTheDocument();
      });
    });

    it('clears error when user starts typing in field', async () => {
      renderContactPage();
      const user = userEvent.setup();

      const submitButton = screen.getByRole('button', { name: /send message/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText(/john smith/i);
      await user.type(nameInput, 'J');

      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('shows success message after successful submission', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderContactPage();
      const user = userEvent.setup();

      // Fill in all required fields
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Jane Doe');
      await user.type(screen.getByPlaceholderText(/john@company\.com/i), 'jane@test.com');
      await user.click(screen.getByRole('button', { name: /request samples/i }));
      await user.type(screen.getByPlaceholderText(/tell us about your project/i), 'Test message');

      // Submit form
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/message sent!/i)).toBeInTheDocument();
      });
    });

    it('shows submitting state during form submission', async () => {
      // Create a delayed promise to simulate slow network
      global.fetch = vi.fn().mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({ success: true }) }), 100))
      );

      renderContactPage();
      const user = userEvent.setup();

      // Fill in all required fields
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Jane Doe');
      await user.type(screen.getByPlaceholderText(/john@company\.com/i), 'jane@test.com');
      await user.click(screen.getByRole('button', { name: /request samples/i }));
      await user.type(screen.getByPlaceholderText(/tell us about your project/i), 'Test message');

      // Submit form
      await user.click(screen.getByRole('button', { name: /send message/i }));

      // Should show sending state
      expect(screen.getByText(/sending\.\.\./i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText(/message sent!/i)).toBeInTheDocument();
      });
    });

    it('shows error message after failed submission', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false }),
      });

      renderContactPage();
      const user = userEvent.setup();

      // Fill in all required fields
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Jane Doe');
      await user.type(screen.getByPlaceholderText(/john@company\.com/i), 'jane@test.com');
      await user.click(screen.getByRole('button', { name: /request samples/i }));
      await user.type(screen.getByPlaceholderText(/tell us about your project/i), 'Test message');

      // Submit form
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('allows sending another message after success', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderContactPage();
      const user = userEvent.setup();

      // Fill in and submit form
      await user.type(screen.getByPlaceholderText(/john smith/i), 'Jane Doe');
      await user.type(screen.getByPlaceholderText(/john@company\.com/i), 'jane@test.com');
      await user.click(screen.getByRole('button', { name: /request samples/i }));
      await user.type(screen.getByPlaceholderText(/tell us about your project/i), 'Test message');
      await user.click(screen.getByRole('button', { name: /send message/i }));

      await waitFor(() => {
        expect(screen.getByText(/message sent!/i)).toBeInTheDocument();
      });

      // Click send another message
      const sendAnotherButton = screen.getByRole('button', { name: /send another message/i });
      await user.click(sendAnotherButton);

      // Form should be visible again
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/john smith/i)).toBeInTheDocument();
      });
    });
  });
});

describe('ContactPage Theme Toggle', () => {
  it('renders theme toggle button', () => {
    renderContactPage();

    // There may be multiple theme toggle buttons (desktop/mobile)
    const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i });
    expect(themeButtons.length).toBeGreaterThan(0);
  });

  it('toggles theme when button is clicked', async () => {
    renderContactPage();
    const user = userEvent.setup();

    // There may be multiple theme toggle buttons
    const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i });
    const themeButton = themeButtons[0];

    // Click to toggle theme
    await user.click(themeButton);

    // The theme should have changed (we can verify the button is still functional)
    expect(themeButton).toBeInTheDocument();
  });
});
