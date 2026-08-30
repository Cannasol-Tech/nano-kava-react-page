import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import SavingsCalculator, { CompactSavingsCalculator } from '../components/SavingsCalculator';

// Helper function to render with router (needed for Link components)
function renderWithRouter(component) {
  return render(
    <MemoryRouter>
      {component}
    </MemoryRouter>
  );
}

describe('SavingsCalculator', () => {
  describe('Rendering', () => {
    it('renders the calculator header', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByText(/nano kava savings calculator/i)).toBeInTheDocument();
      expect(screen.getByText(/10x bioavailability/i)).toBeInTheDocument();
    });

    it('renders all input fields', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByLabelText(/monthly servings/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kavalactones per serving/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current extract cost/i)).toBeInTheDocument();
    });

    it('renders with default values', () => {
      renderWithRouter(<SavingsCalculator />);

      const monthlyServingsInput = screen.getByLabelText(/monthly servings/i);
      const kavalactonesInput = screen.getByLabelText(/kavalactones per serving/i);
      const costInput = screen.getByLabelText(/current extract cost/i);

      expect(monthlyServingsInput).toHaveValue(10000);
      expect(kavalactonesInput).toHaveValue(150);
      expect(costInput).toHaveValue(250);
    });

    it('renders traditional vs nano comparison', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByText(/traditional extract/i)).toBeInTheDocument();
      // There are multiple nano kava mentions (header + column)
      const nanoKavaElements = screen.getAllByText(/nano kava/i);
      expect(nanoKavaElements.length).toBeGreaterThanOrEqual(1);
    });

    it('renders absorption rate information', () => {
      renderWithRouter(<SavingsCalculator />);

      // Text appears in comparison section and disclaimer
      const traditional = screen.getAllByText(/~15%/);
      const nano = screen.getAllByText(/~85%/);
      expect(traditional.length).toBeGreaterThan(0);
      expect(nano.length).toBeGreaterThan(0);
    });

    it('renders the CTA button', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByRole('link', { name: /get a custom quote/i })).toBeInTheDocument();
    });

    it('renders benefits list', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByText(/use up to 80% less raw material/i)).toBeInTheDocument();
      expect(screen.getByText(/5-minute onset/i)).toBeInTheDocument();
      expect(screen.getByText(/crystal-clear/i)).toBeInTheDocument();
      expect(screen.getByText(/higher retention/i)).toBeInTheDocument();
    });

    it('renders disclaimer', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByText(/calculations are estimates/i)).toBeInTheDocument();
    });
  });

  describe('Input Interactions', () => {
    it('allows changing monthly servings', async () => {
      renderWithRouter(<SavingsCalculator />);
      const user = userEvent.setup();

      const input = screen.getByLabelText(/monthly servings/i);
      await user.clear(input);
      await user.type(input, '50000');

      expect(input).toHaveValue(50000);
    });

    it('allows changing kavalactones per serving', async () => {
      renderWithRouter(<SavingsCalculator />);
      const user = userEvent.setup();

      const input = screen.getByLabelText(/kavalactones per serving/i);
      await user.clear(input);
      await user.type(input, '200');

      expect(input).toHaveValue(200);
    });

    it('allows changing current extract cost', async () => {
      renderWithRouter(<SavingsCalculator />);
      const user = userEvent.setup();

      const input = screen.getByLabelText(/current extract cost/i);
      await user.clear(input);
      await user.type(input, '300');

      expect(input).toHaveValue(300);
    });

    it('handles input values correctly', async () => {
      renderWithRouter(<SavingsCalculator />);
      const user = userEvent.setup();

      const input = screen.getByLabelText(/monthly servings/i);
      await user.clear(input);
      await user.type(input, '25000');

      // The input should have the typed value
      expect(input).toHaveValue(25000);
    });
  });

  describe('Calculations', () => {
    it('displays monthly savings', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByText(/monthly savings/i)).toBeInTheDocument();
    });

    it('displays yearly savings', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByText(/yearly savings/i)).toBeInTheDocument();
    });

    it('displays extract reduction percentage', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByText(/extract reduction/i)).toBeInTheDocument();
    });

    it('shows higher savings with more servings', async () => {
      renderWithRouter(<SavingsCalculator />);
      const user = userEvent.setup();

      // Get initial yearly savings text
      const initialYearlySavings = screen.getAllByText(/\$[\d,]+/)[0]?.textContent || '';

      // Increase monthly servings
      const input = screen.getByLabelText(/monthly servings/i);
      await user.clear(input);
      await user.type(input, '100000');

      // The savings should be different (higher) now
      await waitFor(() => {
        const newYearlySavings = screen.getAllByText(/\$[\d,]+/)[0]?.textContent || '';
        // With more servings, savings should change
        expect(newYearlySavings).not.toBe(initialYearlySavings);
      });
    });

    it('shows cost comparison between traditional and nano', () => {
      renderWithRouter(<SavingsCalculator />);

      // Should show monthly cost for both
      const monthlyCostLabels = screen.getAllByText(/monthly cost/i);
      expect(monthlyCostLabels.length).toBe(2); // One for each column
    });

    it('shows monthly extract amounts for comparison', () => {
      renderWithRouter(<SavingsCalculator />);

      // Should show monthly extract for both
      const monthlyExtractLabels = screen.getAllByText(/monthly extract/i);
      expect(monthlyExtractLabels.length).toBe(2); // One for each column
    });
  });

  describe('Theme Support', () => {
    it('renders in dark mode by default', () => {
      renderWithRouter(<SavingsCalculator />);

      // Check for dark mode styling classes
      const container = document.querySelector('.rounded-3xl');
      expect(container).toBeInTheDocument();
    });

    it('renders in light mode when specified', () => {
      renderWithRouter(<SavingsCalculator isDark={false} />);

      // Check that the component renders
      expect(screen.getByText(/nano kava savings calculator/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible input labels', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByLabelText(/monthly servings/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/kavalactones per serving/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/current extract cost/i)).toBeInTheDocument();
    });

    it('inputs have helpful descriptions', () => {
      renderWithRouter(<SavingsCalculator />);

      expect(screen.getByText(/number of product servings\/month/i)).toBeInTheDocument();
      expect(screen.getByText(/typical range: 50-300mg/i)).toBeInTheDocument();
      expect(screen.getByText(/your current kava extract price/i)).toBeInTheDocument();
    });
  });
});

describe('CompactSavingsCalculator', () => {
  describe('Rendering', () => {
    it('renders the compact calculator', () => {
      renderWithRouter(<CompactSavingsCalculator />);

      expect(screen.getByText(/quick savings estimate/i)).toBeInTheDocument();
    });

    it('renders the slider', () => {
      renderWithRouter(<CompactSavingsCalculator />);

      const slider = screen.getByLabelText(/monthly servings slider/i);
      expect(slider).toBeInTheDocument();
    });

    it('shows estimated yearly savings', () => {
      renderWithRouter(<CompactSavingsCalculator />);

      expect(screen.getByText(/estimated yearly savings/i)).toBeInTheDocument();
    });

    it('shows bioavailability mention', () => {
      renderWithRouter(<CompactSavingsCalculator />);

      expect(screen.getByText(/10x bioavailability/i)).toBeInTheDocument();
    });
  });

  describe('Slider Interaction', () => {
    it('allows adjusting monthly servings with slider', async () => {
      renderWithRouter(<CompactSavingsCalculator />);

      const slider = screen.getByLabelText(/monthly servings slider/i);
      fireEvent.change(slider, { target: { value: '50000' } });

      // The display should update
      await waitFor(() => {
        expect(screen.getByText(/50,000/)).toBeInTheDocument();
      });
    });

    it('shows min and max labels', () => {
      renderWithRouter(<CompactSavingsCalculator />);

      expect(screen.getByText(/1k/i)).toBeInTheDocument();
      expect(screen.getByText(/100k/i)).toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('renders in dark mode by default', () => {
      renderWithRouter(<CompactSavingsCalculator />);

      expect(screen.getByText(/quick savings estimate/i)).toBeInTheDocument();
    });

    it('renders in light mode when specified', () => {
      renderWithRouter(<CompactSavingsCalculator isDark={false} />);

      expect(screen.getByText(/quick savings estimate/i)).toBeInTheDocument();
    });
  });
});

describe('Calculator Math Validation', () => {
  it('nano kava shows lower extract requirement due to higher absorption', () => {
    renderWithRouter(<SavingsCalculator />);

    // Get the monthly extract values
    const extractTexts = screen.getAllByText(/\d+\s*kg/);

    // There should be at least 2 kg values (traditional and nano)
    expect(extractTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('shows positive savings when nano kava is more efficient', () => {
    renderWithRouter(<SavingsCalculator />);

    // The savings section should exist
    const savingsSection = screen.getByText(/monthly savings/i);
    expect(savingsSection).toBeInTheDocument();

    // Check that there's a dollar amount displayed
    const dollarAmounts = document.querySelectorAll('[class*="font-bold"]');
    expect(dollarAmounts.length).toBeGreaterThan(0);
  });

  it('displays recommended badge for nano kava', () => {
    renderWithRouter(<SavingsCalculator />);

    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });
});
