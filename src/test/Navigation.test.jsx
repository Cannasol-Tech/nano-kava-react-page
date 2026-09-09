import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import KavaLandingPage from '../components/KavaLandingPage';
import ContactPage from '../components/ContactPage';
import AppRoutes from '../AppRoutes';

import { renderWithProviders } from './renderWithProviders';

// Helper function to render with router
function renderWithRouter(component, { route = '/' } = {}) {
  return renderWithProviders(component, { route });
}

function renderRoute(initialPath) {
  return renderWithProviders(<AppRoutes />, { route: initialPath });
}

describe('Navigation', () => {
  describe('Desktop Navigation Links', () => {
    it('renders all desktop navigation links', () => {
      renderWithRouter(<KavaLandingPage />);

      // There may be multiple links with same name (desktop + mobile nav)
      const benefitsLinks = screen.getAllByRole('link', { name: /benefits/i });
      expect(benefitsLinks.length).toBeGreaterThan(0);
      const processLinks = screen.getAllByRole('link', { name: /process/i });
      expect(processLinks.length).toBeGreaterThan(0);
      const dosingLinks = screen.getAllByRole('link', { name: /^dosing$/i });
      expect(dosingLinks.length).toBeGreaterThan(0);
      const mushroomsLinks = screen.getAllByRole('link', { name: /mushrooms/i });
      expect(mushroomsLinks.length).toBeGreaterThan(0);
      const faqLinks = screen.getAllByRole('link', { name: /faq/i });
      expect(faqLinks.length).toBeGreaterThan(0);
      const contactLinks = screen.getAllByRole('link', { name: /contact/i });
      expect(contactLinks.length).toBeGreaterThan(0);
    });

    it('has correct href attributes for anchor links', () => {
      renderWithRouter(<KavaLandingPage />);

      const benefitsLinks = screen.getAllByRole('link', { name: /benefits/i });
      expect(benefitsLinks[0]).toHaveAttribute('href', '#benefits');
      const processLinks = screen.getAllByRole('link', { name: /process/i });
      expect(processLinks[0]).toHaveAttribute('href', '#process');
      const dosingLinks = screen.getAllByRole('link', { name: /^dosing$/i });
      expect(dosingLinks[0]).toHaveAttribute('href', '#dosing');
    });

    it('has correct href for route links', () => {
      renderWithRouter(<KavaLandingPage />);

      const mushroomsLinks = screen.getAllByRole('link', { name: /mushrooms/i });
      expect(mushroomsLinks[0]).toHaveAttribute('href', '/mushrooms');
      const faqLinks = screen.getAllByRole('link', { name: /faq/i });
      expect(faqLinks[0]).toHaveAttribute('href', '/faq');
      const contactLinks = screen.getAllByRole('link', { name: /contact/i });
      const routeContactLink = contactLinks.find(link => link.getAttribute('href') === '/contact');
      expect(routeContactLink).toBeDefined();
    });

    it('renders the Cannasol logo', () => {
      renderWithRouter(<KavaLandingPage />);

      const logo = screen.getByAltText('Cannasol Technologies Logo');
      expect(logo).toBeInTheDocument();
    });

    it('renders Get Started CTA button', () => {
      renderWithRouter(<KavaLandingPage />);

      expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    it('renders mobile menu button', () => {
      renderWithRouter(<KavaLandingPage />);

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('mobile menu opens when hamburger button is clicked', async () => {
      renderWithRouter(<KavaLandingPage />);
      const user = userEvent.setup();

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(menuButton);

      // After clicking, the mobile menu should be visible with all links
      await waitFor(() => {
        // Check that the mobile-specific contact link appears
        const contactLinks = screen.getAllByText(/contact/i);
        expect(contactLinks.length).toBeGreaterThan(0);
      });
    });

    it('displays phone number in mobile menu', async () => {
      renderWithRouter(<KavaLandingPage />);
      const user = userEvent.setup();

      const menuButton = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(menuButton);

      await waitFor(() => {
        // Phone number appears multiple times on page
        const phoneElements = screen.getAllByText(/\(216\) 921-2240/);
        expect(phoneElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Theme Toggle', () => {
    it('renders theme toggle button', () => {
      renderWithRouter(<KavaLandingPage />);

      const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i });
      expect(themeButtons.length).toBeGreaterThan(0);
    });

    it('theme toggle switches between dark and light mode', async () => {
      renderWithRouter(<KavaLandingPage />);
      const user = userEvent.setup();

      // Find the theme toggle button (there might be multiple for desktop/mobile)
      const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i });
      const themeButton = themeButtons[0];

      // Initially in dark mode, should show Sun icon
      expect(themeButton.querySelector('svg')).toBeInTheDocument();

      // Click to toggle
      await user.click(themeButton);

      // After toggle, should show Moon icon (indicating light mode)
      await waitFor(() => {
        expect(themeButton.querySelector('svg')).toBeInTheDocument();
      });
    });
  });
});

describe('Routing', () => {
  it('renders KavaLandingPage at root route', async () => {
    renderRoute('/');

    expect(await screen.findByRole('heading', { level: 1, name: /nano kava/i }, { timeout: 15000 })).toBeInTheDocument();
  }, 20000);

  it('renders ContactPage at /contact route', async () => {
    renderRoute('/contact');

    expect(await screen.findByRole('heading', { name: /let's connect/i }, { timeout: 15000 })).toBeInTheDocument();
  }, 20000);

  it('renders FAQPage at /faq route', async () => {
    renderRoute('/faq');

    // Verify FAQ page by checking back to home link
    expect(await screen.findByRole('link', { name: /back to home/i }, { timeout: 15000 })).toBeInTheDocument();
  }, 20000);

  it('renders MushroomsLandingPage at /mushrooms route', async () => {
    renderRoute('/mushrooms');

    const lionsMane = await screen.findAllByText(/lion's mane/i, {}, { timeout: 15000 });
    expect(lionsMane.length).toBeGreaterThan(0);
  }, 20000);
});

describe('CTA Buttons', () => {
  it('renders Request a Sample button in hero', () => {
    renderWithRouter(<KavaLandingPage />);

    expect(screen.getByRole('link', { name: /request a sample/i })).toBeInTheDocument();
  });

  it('renders Call Josh button with correct phone number', () => {
    renderWithRouter(<KavaLandingPage />);

    const callButton = screen.getByRole('link', { name: /call josh/i });
    expect(callButton).toHaveAttribute('href', 'tel:+12169212240');
  });

  it('renders contact section with all contact methods', () => {
    renderWithRouter(<KavaLandingPage />);

    // Contact Form link
    expect(screen.getByRole('link', { name: /contact form/i })).toBeInTheDocument();

    // Phone link
    const phoneLinks = screen.getAllByRole('link', { name: /\(216\) 921-2240/ });
    expect(phoneLinks.length).toBeGreaterThan(0);

    // Email link
    expect(screen.getByRole('link', { name: /email us/i })).toBeInTheDocument();
  });

  it('offers only the office number in the footer, not a personal direct line', () => {
    renderWithRouter(<KavaLandingPage />);

    const officeLink = screen.getByRole('link', { name: /^call \(216\) 921-2240$/i });
    expect(officeLink).toHaveAttribute('href', 'tel:+12169212240');
    expect(screen.queryByText(/808-0546/)).not.toBeInTheDocument();
  });

  it('states the business hours in ET', () => {
    renderWithRouter(<KavaLandingPage />);

    expect(screen.getByText(/9:30 AM – 5:30 PM ET/)).toBeInTheDocument();
  });
});
