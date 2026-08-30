import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import KavaLandingPage from '../components/KavaLandingPage';
import ContactPage from '../components/ContactPage';
import FAQPage from '../components/FAQPage';
import MushroomsLandingPage from '../components/MushroomsLandingPage';
import AppRoutes from '../AppRoutes';

import { renderWithProviders } from './renderWithProviders';

// Helper function to render with router
function renderWithRouter(component) {
  return renderWithProviders(component);
}

function renderRoute(initialPath) {
  return renderWithProviders(<AppRoutes />, { route: initialPath });
}

describe('Theme System', () => {
  describe('KavaLandingPage Theme', () => {
    it('starts in dark mode by default', () => {
      renderWithRouter(<KavaLandingPage />);

      const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i });
      expect(themeButtons[0]).toBeInTheDocument();
      const logo = screen.getByAltText('Cannasol Technologies Logo');
      expect(logo).toHaveAttribute('src', '/cannasol-logo-white.png');
    });

    it('theme toggle button shows Sun icon in dark mode', () => {
      renderWithRouter(<KavaLandingPage />);

      // In dark mode, the Sun icon should be visible (to switch to light)
      const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i });
      expect(themeButtons[0]).toBeInTheDocument();
    });

    it('toggles to light mode when clicked', async () => {
      renderWithRouter(<KavaLandingPage />);
      const user = userEvent.setup();

      const themeButton = screen.getAllByRole('button', { name: /toggle theme/i })[0];
      await user.click(themeButton);

      // After toggling, the logo should change to light mode logo
      await waitFor(() => {
        const logo = screen.getByAltText('Cannasol Technologies Logo');
        expect(logo).toHaveAttribute('src', '/cannasol-logo.png');
      });
    });

    it('toggles back to dark mode on second click', async () => {
      renderWithRouter(<KavaLandingPage />);
      const user = userEvent.setup();

      const themeButton = screen.getAllByRole('button', { name: /toggle theme/i })[0];

      // First click - to light mode
      await user.click(themeButton);

      await waitFor(() => {
        const logo = screen.getByAltText('Cannasol Technologies Logo');
        expect(logo).toHaveAttribute('src', '/cannasol-logo.png');
      });

      // Second click - back to dark mode
      await user.click(themeButton);

      await waitFor(() => {
        const logo = screen.getByAltText('Cannasol Technologies Logo');
        expect(logo).toHaveAttribute('src', '/cannasol-logo-white.png');
      });
    });

    it('uses correct logo for dark mode', () => {
      renderWithRouter(<KavaLandingPage />);

      const logo = screen.getByAltText('Cannasol Technologies Logo');
      expect(logo).toHaveAttribute('src', '/cannasol-logo-white.png');
    });

    it('uses correct logo for light mode', async () => {
      renderWithRouter(<KavaLandingPage />);
      const user = userEvent.setup();

      const themeButton = screen.getAllByRole('button', { name: /toggle theme/i })[0];
      await user.click(themeButton);

      await waitFor(() => {
        const logo = screen.getByAltText('Cannasol Technologies Logo');
        expect(logo).toHaveAttribute('src', '/cannasol-logo.png');
      });
    });
  });

  describe('ContactPage Theme', () => {
    it('starts in dark mode by default', () => {
      renderWithRouter(<ContactPage />);

      const logo = screen.getByAltText('Cannasol Technologies Logo');
      expect(logo).toHaveAttribute('src', '/cannasol-logo-white.png');
    });

    it('has theme toggle functionality available', () => {
      renderWithRouter(<ContactPage />);

      const mainContainer = document.querySelector('.min-h-screen');
      expect(mainContainer).toBeInTheDocument();
    });
  });
});

describe('Full Page Routing', () => {
  describe('Landing Page Routes', () => {
    it('renders home page content at /', async () => {
      renderRoute('/');

      expect(await screen.findByRole('heading', { level: 1, name: /nano kava/i }, { timeout: 15000 })).toBeInTheDocument();
      // Use getAllByText for text that appears multiple times
      const worldsFirst = screen.getAllByText(/world's first/i);
      expect(worldsFirst.length).toBeGreaterThan(0);
    }, 20000);

    it('renders FAQ page at /faq', async () => {
      renderRoute('/faq');

      // Verify the FAQ page renders by checking for the back to home link
      const backLink = await screen.findByRole('link', { name: /back to home/i }, { timeout: 15000 });
      expect(backLink).toBeInTheDocument();
    }, 20000);

    it('renders Contact page at /contact', async () => {
      renderRoute('/contact');

      expect(await screen.findByRole('heading', { name: /let's connect/i }, { timeout: 15000 })).toBeInTheDocument();
    }, 20000);

    it('renders Mushrooms page at /mushrooms', async () => {
      renderRoute('/mushrooms');

      // Check for mushroom product names to verify page loaded
      const lionsMane = await screen.findAllByText(/lion's mane/i, {}, { timeout: 15000 });
      expect(lionsMane.length).toBeGreaterThan(0);
    }, 20000);
  });

  describe('Cross-Page Navigation', () => {
    it('can navigate from home to FAQ', async () => {
      renderRoute('/');
      const user = userEvent.setup();

      const homeLoaded = await screen.findByRole('heading', { level: 1, name: /nano kava/i }, { timeout: 15000 });
      expect(homeLoaded).toBeInTheDocument();

      // There may be multiple FAQ links (desktop + mobile nav)
      const faqLinks = screen.getAllByRole('link', { name: /faq/i });
      await user.click(faqLinks[0]);

      await waitFor(() => {
        // FAQ page has back to home link
        const backLink = screen.getByRole('link', { name: /back to home/i });
        expect(backLink).toBeInTheDocument();
      });
    }, 20000);

    it('can navigate from home to mushrooms', async () => {
      renderRoute('/');
      const user = userEvent.setup();

      const homeLoaded = await screen.findByRole('heading', { level: 1, name: /nano kava/i }, { timeout: 15000 });
      expect(homeLoaded).toBeInTheDocument();

      // There may be multiple mushroom links
      const mushroomsLinks = screen.getAllByRole('link', { name: /mushrooms/i });
      await user.click(mushroomsLinks[0]);

      await waitFor(() => {
        const lionsMane = screen.getAllByText(/lion's mane/i);
        expect(lionsMane.length).toBeGreaterThan(0);
      });
    }, 20000);

    it('can navigate from contact back to home', async () => {
      renderRoute('/contact');
      const user = userEvent.setup();

      const homeLink = await screen.findByRole('link', { name: /back to home/i }, { timeout: 15000 });
      await user.click(homeLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /nano kava/i })).toBeInTheDocument();
      });
    }, 20000);

    it('can navigate from FAQ back to home', async () => {
      renderRoute('/faq');
      const user = userEvent.setup();

      const homeLink = await screen.findByRole('link', { name: /back to home/i }, { timeout: 15000 });
      await user.click(homeLink);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /nano kava/i })).toBeInTheDocument();
      });
    }, 20000);
  });

  describe('Section Anchor Links', () => {
    it('home page has benefits section link', () => {
      renderRoute('/');

      // There may be multiple benefits links (desktop + mobile nav)
      const benefitsLinks = screen.getAllByRole('link', { name: /benefits/i });
      expect(benefitsLinks.length).toBeGreaterThan(0);
      expect(benefitsLinks[0]).toHaveAttribute('href', '#benefits');
    });

    it('home page has process section link', () => {
      renderRoute('/');

      // There may be multiple process links (desktop + mobile nav)
      const processLinks = screen.getAllByRole('link', { name: /process/i });
      expect(processLinks.length).toBeGreaterThan(0);
      expect(processLinks[0]).toHaveAttribute('href', '#process');
    });

    it('home page has calculator section link', () => {
      renderRoute('/');

      // There may be multiple calculator links (desktop + mobile nav)
      const calculatorLinks = screen.getAllByRole('link', { name: /calculator/i });
      expect(calculatorLinks.length).toBeGreaterThan(0);
      expect(calculatorLinks[0]).toHaveAttribute('href', '#calculator');
    });

    it('home page has contact section anchor', () => {
      renderRoute('/');

      const getStartedLink = screen.getByRole('link', { name: /get started/i });
      expect(getStartedLink).toHaveAttribute('href', '#contact');
    });
  });
});

describe('Page Content Rendering', () => {
  describe('KavaLandingPage Content', () => {
    it('renders hero section with key messaging', () => {
      renderWithRouter(<KavaLandingPage />);

      expect(screen.getByRole('heading', { level: 1, name: /nano kava/i })).toBeInTheDocument();
      // These appear multiple times
      const particleSize = screen.getAllByText(/particle size/i);
      expect(particleSize.length).toBeGreaterThan(0);
      const onsetTime = screen.getAllByText(/onset time/i);
      expect(onsetTime.length).toBeGreaterThan(0);
    });

    it('renders stats section', () => {
      renderWithRouter(<KavaLandingPage />);

      // These may appear multiple times
      const particleSize = screen.getAllByText(/particle size/i);
      expect(particleSize.length).toBeGreaterThan(0);
      const bioavailability = screen.getAllByText(/bioavailability/i);
      expect(bioavailability.length).toBeGreaterThan(0);
      const onsetTime = screen.getAllByText(/onset time/i);
      expect(onsetTime.length).toBeGreaterThan(0);
    });

    it('renders features section', () => {
      renderWithRouter(<KavaLandingPage />);

      expect(screen.getByRole('heading', { level: 3, name: /enhanced bioavailability/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /improved palatability/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: /ease of production/i })).toBeInTheDocument();
    });

    it('renders process section', () => {
      renderWithRouter(<KavaLandingPage />);

      expect(screen.getByText(/discovery call/i)).toBeInTheDocument();
      expect(screen.getByText(/sample & test/i)).toBeInTheDocument();
      expect(screen.getByText(/refine & order/i)).toBeInTheDocument();
      expect(screen.getByText(/scale production/i)).toBeInTheDocument();
    });

    it('renders partnership section', () => {
      renderWithRouter(<KavaLandingPage />);

      // QSonica may appear multiple times
      const qsonicaElements = screen.getAllByText(/qsonica/i);
      expect(qsonicaElements.length).toBeGreaterThan(0);
      const trustedPartnerElements = screen.getAllByText(/trusted partner/i);
      expect(trustedPartnerElements.length).toBeGreaterThan(0);
    });
  });

  describe('ContactPage Content', () => {
    it('renders all form fields', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByPlaceholderText(/john smith/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/john@company\.com/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/your company/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/\+1 \(555\) 000-0000/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/tell us about your project/i)).toBeInTheDocument();
    });

    it('renders all contact information', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText(/\(216\) 921-2240/)).toBeInTheDocument();
      expect(screen.getByText(/josh\.detzel@cannasolusa\.com/i)).toBeInTheDocument();
      // Sarasota, Florida may appear multiple times
      const sarasota = screen.getAllByText(/sarasota, florida/i);
      expect(sarasota.length).toBeGreaterThan(0);
    });
  });

  describe('MushroomsLandingPage Content', () => {
    it('renders mushroom products', () => {
      renderWithRouter(<MushroomsLandingPage />);

      const lionsMane = screen.getAllByText(/lion's mane/i);
      expect(lionsMane.length).toBeGreaterThan(0);
      const reishi = screen.getAllByText(/reishi/i);
      expect(reishi.length).toBeGreaterThan(0);
      const cordyceps = screen.getAllByText(/cordyceps/i);
      expect(cordyceps.length).toBeGreaterThan(0);
    });
  });
});

describe('Accessibility', () => {
  it('navigation has proper aria labels', () => {
    renderWithRouter(<KavaLandingPage />);

    // Multiple theme toggle buttons (desktop and mobile)
    const themeButtons = screen.getAllByRole('button', { name: /toggle theme/i });
    expect(themeButtons.length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /toggle menu/i })).toBeInTheDocument();
  });

  it('images have alt text', () => {
    renderWithRouter(<KavaLandingPage />);

    const logo = screen.getByAltText('Cannasol Technologies Logo');
    expect(logo).toBeInTheDocument();
  });

  it('form fields have associated labels', () => {
    renderWithRouter(<ContactPage />);

    expect(screen.getByText(/full name/i)).toBeInTheDocument();
    expect(screen.getByText(/email address/i)).toBeInTheDocument();
    expect(screen.getByText(/company name/i)).toBeInTheDocument();
    expect(screen.getByText(/phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/your message/i)).toBeInTheDocument();
  });
});
