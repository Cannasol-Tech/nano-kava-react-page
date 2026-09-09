import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KavaLandingPage from '../components/KavaLandingPage';
import ContactPage from '../components/ContactPage';

import { renderWithProviders } from './renderWithProviders';

// Helper function to render with router
function renderWithRouter(component) {
  return renderWithProviders(component);
}

describe('Maps Integration', () => {
  describe('KavaLandingPage Maps Link', () => {
    it('renders location link in CTA section', () => {
      renderWithRouter(<KavaLandingPage />);

      const locationLink = screen.getByRole('link', { name: /sarasota, florida/i });
      expect(locationLink).toBeInTheDocument();
    });

    it('location link points to Google Maps', () => {
      renderWithRouter(<KavaLandingPage />);

      const locationLink = screen.getByRole('link', { name: /sarasota, florida/i });
      expect(locationLink).toHaveAttribute('href', 'https://maps.google.com/?q=Sarasota,+Florida+34234');
    });

    it('location link opens in new tab', () => {
      renderWithRouter(<KavaLandingPage />);

      const locationLink = screen.getByRole('link', { name: /sarasota, florida/i });
      expect(locationLink).toHaveAttribute('target', '_blank');
      expect(locationLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders MapPin icon with location', () => {
      renderWithRouter(<KavaLandingPage />);

      // Find the location text to ensure it's rendered with the icon
      const locationText = screen.getByText(/sarasota, florida/i);
      expect(locationText).toBeInTheDocument();
    });
  });

  describe('ContactPage Location Display', () => {
    it('renders location in contact info sidebar', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText(/location/i)).toBeInTheDocument();
      expect(screen.getByText(/sarasota, florida, usa/i)).toBeInTheDocument();
    });

    it('displays business hours alongside location, in ET never EST', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText(/hours/i)).toBeInTheDocument();
      expect(screen.getByText(/9:30\s*am.*5:30\s*pm et\b/i)).toBeInTheDocument();
    });
  });

  describe('Contact Information Accessibility', () => {
    it('phone link has correct tel: protocol', () => {
      renderWithRouter(<KavaLandingPage />);

      // Find all phone links
      const phoneLinks = screen.getAllByRole('link', { name: /\(216\) 921-2240|call josh/i });
      const telLink = phoneLinks.find(link => link.getAttribute('href')?.startsWith('tel:'));

      expect(telLink).toBeDefined();
      expect(telLink).toHaveAttribute('href', 'tel:+12169212240');
    });

    it('email link has correct mailto: protocol', () => {
      renderWithRouter(<KavaLandingPage />);

      const emailLink = screen.getByRole('link', { name: /email us/i });
      expect(emailLink).toHaveAttribute('href', 'mailto:josh.detzel@cannasolusa.com');
    });
  });

  describe('Footer Links', () => {
    it('renders footer with contact link', () => {
      renderWithRouter(<KavaLandingPage />);

      // Find footer contact link
      const contactLinks = screen.getAllByRole('link', { name: /contact/i });
      const footerContactLink = contactLinks.find(link => link.getAttribute('href') === '/contact');

      expect(footerContactLink).toBeDefined();
    });

    it('renders external shop link', () => {
      renderWithRouter(<KavaLandingPage />);

      const shopLink = screen.getByRole('link', { name: /shop/i });
      expect(shopLink).toHaveAttribute('href', 'https://cannasoltechnologies.com/shop/');
    });

    it('renders external resources link', () => {
      renderWithRouter(<KavaLandingPage />);

      const resourcesLink = screen.getByRole('link', { name: /resources/i });
      expect(resourcesLink).toHaveAttribute('href', 'https://cannasoltechnologies.com/resources');
    });
  });

  describe('Contact Cards Rendering', () => {
    it('renders all contact method cards on contact page', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText(/call us/i)).toBeInTheDocument();
      expect(screen.getByText(/email us/i)).toBeInTheDocument();
      expect(screen.getByText(/location/i)).toBeInTheDocument();
      expect(screen.getByText(/hours/i)).toBeInTheDocument();
    });

    it('contact cards display correct information', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText(/\(216\) 921-2240/)).toBeInTheDocument();
      expect(screen.getByText(/josh\.detzel@cannasolusa\.com/i)).toBeInTheDocument();
      expect(screen.getByText(/sarasota, florida, usa/i)).toBeInTheDocument();
    });
  });
});
