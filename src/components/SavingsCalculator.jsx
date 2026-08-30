import React, { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  DollarSign,
  Beaker,
  Sparkles,
  Info,
  ArrowRight,
  Check
} from 'lucide-react';
import themesConfig from '../theme/themes';

const themes = themesConfig;

// Constants for calculations
const BIOAVAILABILITY_MULTIPLIER = 10; // Nano kava is ~10x more bioavailable
const TRADITIONAL_ABSORPTION_RATE = 0.15; // ~15% absorption for traditional kava
const NANO_ABSORPTION_RATE = 0.85; // ~85% absorption for nano kava

/**
 * Format number as currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

/**
 * Savings Calculator Component
 * Helps potential clients understand the cost savings of switching to nano kava
 */
export default function SavingsCalculator({ isDark = true }) {
  const theme = isDark ? themes.dark : themes.light;

  // Form state
  const [inputs, setInputs] = useState({
    monthlyServings: 10000, // Number of servings per month
    kavalactonesPerServing: 150, // mg of kavalactones per serving
    currentCostPerKg: 250, // Current cost per kg of traditional kava extract
  });

  // Calculate savings
  const calculations = useMemo(() => {
    const { monthlyServings, kavalactonesPerServing, currentCostPerKg } = inputs;

    // Convert to grams for easier calculation
    const kavalactonesPerServingG = kavalactonesPerServing / 1000;

    // Traditional kava calculations
    // Need more extract because only ~15% is absorbed
    const traditionalExtractNeeded = kavalactonesPerServingG / TRADITIONAL_ABSORPTION_RATE;
    const traditionalMonthlyKg = (traditionalExtractNeeded * monthlyServings) / 1000;
    const traditionalMonthlyCost = traditionalMonthlyKg * currentCostPerKg;

    // Nano kava calculations
    // Need less because ~85% is absorbed (approximately 1/5.67 the amount)
    const nanoExtractNeeded = kavalactonesPerServingG / NANO_ABSORPTION_RATE;
    const nanoMonthlyKg = (nanoExtractNeeded * monthlyServings) / 1000;
    // Nano kava costs more per kg (let's assume 2x the cost) but you use much less
    const nanoCostPerKg = currentCostPerKg * 2;
    const nanoMonthlyCost = nanoMonthlyKg * nanoCostPerKg;

    // Savings
    const monthlySavings = traditionalMonthlyCost - nanoMonthlyCost;
    const yearlySavings = monthlySavings * 12;
    const savingsPercentage = ((traditionalMonthlyCost - nanoMonthlyCost) / traditionalMonthlyCost) * 100;

    // Extract reduction
    const extractReduction = ((traditionalMonthlyKg - nanoMonthlyKg) / traditionalMonthlyKg) * 100;

    return {
      traditionalMonthlyKg,
      traditionalMonthlyCost,
      nanoMonthlyKg,
      nanoMonthlyCost,
      monthlySavings,
      yearlySavings,
      savingsPercentage,
      extractReduction,
    };
  }, [inputs]);

  const handleInputChange = (field, value) => {
    // Ensure value is a positive number
    const numValue = Math.max(0, parseInt(value) || 0);
    setInputs(prev => ({ ...prev, [field]: numValue }));
  };

  return (
    <div className={`${theme.bgCard} rounded-3xl border ${theme.borderCard} overflow-hidden`}>
      {/* Header */}
      <div className={`px-8 py-6 bg-gradient-to-r ${theme.accent}`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900">Nano Kava Savings Calculator</h3>
            <p className="text-slate-700 text-sm">See how much you could save with 10x bioavailability</p>
          </div>
        </div>
      </div>

      <div className="p-8">
        {/* Input Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
              Monthly Servings
            </label>
            <div className="relative">
              <Beaker className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
              <input
                type="number"
                value={inputs.monthlyServings}
                onChange={(e) => handleInputChange('monthlyServings', e.target.value)}
                className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} border ${theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-all`}
                min="0"
                placeholder="10,000"
                aria-label="Monthly servings"
              />
            </div>
            <p className={`text-xs ${theme.textMuted} mt-1`}>Number of product servings/month</p>
          </div>

          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
              Kavalactones per Serving (mg)
            </label>
            <div className="relative">
              <Sparkles className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
              <input
                type="number"
                value={inputs.kavalactonesPerServing}
                onChange={(e) => handleInputChange('kavalactonesPerServing', e.target.value)}
                className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} border ${theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-all`}
                min="0"
                max="500"
                placeholder="150"
                aria-label="Kavalactones per serving"
              />
            </div>
            <p className={`text-xs ${theme.textMuted} mt-1`}>Typical range: 50-300mg</p>
          </div>

          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
              Current Extract Cost ($/kg)
            </label>
            <div className="relative">
              <DollarSign className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
              <input
                type="number"
                value={inputs.currentCostPerKg}
                onChange={(e) => handleInputChange('currentCostPerKg', e.target.value)}
                className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} border ${theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-all`}
                min="0"
                placeholder="250"
                aria-label="Current extract cost per kilogram"
              />
            </div>
            <p className={`text-xs ${theme.textMuted} mt-1`}>Your current kava extract price</p>
          </div>
        </div>

        {/* Results Section */}
        <div className={`${theme.bgSecondary} rounded-2xl p-6 mb-6`}>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Traditional Kava Column */}
            <div className={`${theme.bgCard} rounded-xl p-6 border ${theme.borderCard}`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg ${theme.bgError} flex items-center justify-center`}>
                  <TrendingDown className={`w-4 h-4 ${theme.textError}`} />
                </div>
                <h4 className={`font-semibold ${theme.text}`}>Traditional Extract</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={theme.textSecondary}>Monthly Extract</span>
                  <span className={`font-medium ${theme.text}`}>
                    {formatNumber(calculations.traditionalMonthlyKg)} kg
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.textSecondary}>Monthly Cost</span>
                  <span className={`font-bold text-lg ${theme.textError}`}>
                    {formatCurrency(calculations.traditionalMonthlyCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.textSecondary}>Absorption Rate</span>
                  <span className={`font-medium ${theme.textMuted}`}>~15%</span>
                </div>
              </div>
            </div>

            {/* Nano Kava Column */}
            <div className={`${theme.bgCard} rounded-xl p-6 border-2 border-emerald-500/50`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg ${theme.bgHighlight} flex items-center justify-center`}>
                  <TrendingUp className={`w-4 h-4 ${theme.accentText}`} />
                </div>
                <h4 className={`font-semibold ${theme.text}`}>Nano Kava</h4>
                <span className={`px-2 py-0.5 text-xs font-medium ${theme.bgHighlight} ${theme.accentText} rounded-full`}>
                  Recommended
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={theme.textSecondary}>Monthly Extract</span>
                  <span className={`font-medium ${theme.text}`}>
                    {formatNumber(calculations.nanoMonthlyKg)} kg
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.textSecondary}>Monthly Cost</span>
                  <span className={`font-bold text-lg ${theme.accentText}`}>
                    {formatCurrency(calculations.nanoMonthlyCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={theme.textSecondary}>Absorption Rate</span>
                  <span className={`font-medium ${theme.accentText}`}>~85%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Highlight */}
        <div
          className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r ${theme.accent}`}
        >
          <div className="relative z-10">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-slate-700 text-sm mb-1">Monthly Savings</p>
                <p className="text-3xl font-bold text-slate-900">
                  {formatCurrency(Math.max(0, calculations.monthlySavings))}
                </p>
              </div>
              <div>
                <p className="text-slate-700 text-sm mb-1">Yearly Savings</p>
                <p className="text-3xl font-bold text-slate-900">
                  {formatCurrency(Math.max(0, calculations.yearlySavings))}
                </p>
              </div>
              <div>
                <p className="text-slate-700 text-sm mb-1">Extract Reduction</p>
                <p className="text-3xl font-bold text-slate-900">
                  {calculations.extractReduction.toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }} />
          </div>
        </div>

        {/* Benefits List */}
        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className={`flex items-start gap-3 ${theme.textSecondary}`}>
            <Check className={`w-5 h-5 ${theme.accentText} flex-shrink-0 mt-0.5`} />
            <span className="text-sm">Use up to 80% less raw material for the same effect</span>
          </div>
          <div className={`flex items-start gap-3 ${theme.textSecondary}`}>
            <Check className={`w-5 h-5 ${theme.accentText} flex-shrink-0 mt-0.5`} />
            <span className="text-sm">5-minute onset vs 30-45 minutes with traditional</span>
          </div>
          <div className={`flex items-start gap-3 ${theme.textSecondary}`}>
            <Check className={`w-5 h-5 ${theme.accentText} flex-shrink-0 mt-0.5`} />
            <span className="text-sm">Crystal-clear, shelf-stable formulations</span>
          </div>
          <div className={`flex items-start gap-3 ${theme.textSecondary}`}>
            <Check className={`w-5 h-5 ${theme.accentText} flex-shrink-0 mt-0.5`} />
            <span className="text-sm">Better customer experience = higher retention</span>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={`mt-6 flex items-start gap-2 text-xs ${theme.textMuted}`}>
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Calculations are estimates based on typical bioavailability differences between traditional kava extract
            (~15% absorption) and nano-emulsified kava (~85% absorption). Actual savings may vary based on
            your specific formulation and volume. Contact us for a personalized quote.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <a
            href="#contact"
            className={`inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-full text-lg interactive-btn hover-scale active-press-sm`}
          >
            Get a Custom Quote
            <ArrowRight className="w-5 h-5" />
          </a>
          <p className={`mt-3 text-sm ${theme.textMuted}`}>
            Talk to Josh about your specific needs
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version of the calculator for embedding in other sections
 */
export function CompactSavingsCalculator({ isDark = true }) {
  const theme = isDark ? themes.dark : themes.light;
  const [monthlyServings, setMonthlyServings] = useState(10000);

  const yearlySavings = useMemo(() => {
    // Simplified calculation for the compact version
    // Assuming 150mg kavalactones, $250/kg traditional cost
    const kavalactonesG = 0.15;
    const traditionalCost = ((kavalactonesG / 0.15) * monthlyServings / 1000) * 250 * 12;
    const nanoCost = ((kavalactonesG / 0.85) * monthlyServings / 1000) * 500 * 12;
    return Math.max(0, traditionalCost - nanoCost);
  }, [monthlyServings]);

  return (
    <div className={`${theme.bgCard} rounded-2xl border ${theme.borderCard} p-6`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.accent} flex items-center justify-center`}>
          <Calculator className="w-5 h-5 text-slate-900" />
        </div>
        <div>
          <h4 className={`font-semibold ${theme.text}`}>Quick Savings Estimate</h4>
          <p className={`text-sm ${theme.textMuted}`}>Based on 10x bioavailability</p>
        </div>
      </div>

      <div className="mb-4">
        <label className={`block text-sm ${theme.textSecondary} mb-2`}>
          Monthly Servings: {formatNumber(monthlyServings)}
        </label>
        <input
          type="range"
          min="1000"
          max="100000"
          step="1000"
          value={monthlyServings}
          onChange={(e) => setMonthlyServings(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          aria-label="Monthly servings slider"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>1K</span>
          <span>100K</span>
        </div>
      </div>

      <div className={`${theme.bgHighlight} rounded-xl p-4 text-center`}>
        <p className={`text-sm ${theme.textSecondary} mb-1`}>Estimated Yearly Savings</p>
        <p className={`text-3xl font-bold ${theme.accentText}`}>
          {formatCurrency(yearlySavings)}
        </p>
      </div>
    </div>
  );
}
