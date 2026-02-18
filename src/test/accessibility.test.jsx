import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import KavaLandingPage from '../components/KavaLandingPage';
import FAQPage from '../components/FAQPage';
import ContactPage from '../components/ContactPage';
import MushroomsLandingPage from '../components/MushroomsLandingPage';
import NanoScene from '../components/NanoScene';
import { ThemeProvider } from '../context/ThemeContext';

// Mock dependencies
vi.mock('../hooks/useScrollDepth', () => ({
  useScrollDepth: () => null,
}));

vi.mock('../hooks/useScrollTransform', () => ({
  useScrollTransform: () => ({}),
}));

vi.mock('../hooks/useInView', () => ({
  useInView: () => [vi.fn(), true],
}));

describe('Accessibility', () => {
  describe('Navigation ARIA Labels', () => {
    it('should have aria-label on KavaLandingPage navigation', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <KavaLandingPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it('should have aria-label on FAQPage navigation', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <FAQPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it('should have aria-label on ContactPage navigation', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <ContactPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it('should have aria-label on MushroomsLandingPage navigation', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <MushroomsLandingPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });
  });

  describe('Canvas ARIA Labels', () => {
    it('should have role="img" and aria-label on NanoScene canvas', () => {
      const { container } = render(
        <ThemeProvider>
          <NanoScene isDark={true} />
        </ThemeProvider>
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toHaveAttribute('role', 'img');
      expect(canvas).toHaveAttribute('aria-label');
      expect(canvas.getAttribute('aria-label')).toContain('nano');
    });
  });

  describe('Theme Toggle Buttons', () => {
    it('should have aria-label on theme toggle in KavaLandingPage', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <KavaLandingPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const themeToggles = screen.getAllByLabelText(/toggle theme/i);
      expect(themeToggles.length).toBeGreaterThan(0);
    });

    it('should have aria-label on menu toggle in KavaLandingPage', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <KavaLandingPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const menuToggle = screen.getByLabelText(/toggle menu/i);
      expect(menuToggle).toBeInTheDocument();
    });
  });

  describe('Form Accessibility', () => {
    it('should have properly labeled form inputs in ContactPage', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <ContactPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it('should have submit button with accessible text in ContactPage', () => {
      render(
        <MemoryRouter>
          <ThemeProvider>
            <ContactPage />
          </ThemeProvider>
        </MemoryRouter>
      );

      const submitButton = screen.getByRole('button', { name: /send message/i });
      expect(submitButton).toBeInTheDocument();
    });
  });
});
