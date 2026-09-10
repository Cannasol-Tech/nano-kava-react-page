/**
 * @file: src/components/KavaLandingPage.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     The Nano Kava landing page — hero, spec comparison, features, dosing and cost
 *     per serving, partnership proof and contact. Every quotable number is rendered
 *     from src/content/, never typed here. See CLAUDE.md § The savings calculator is
 *     retired for what replaced the old #calculator section and why.
 *
 * @See Also:
 *     src/content/product.js
 *     src/components/CLAUDE.md
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies LLC. All Rights Reserved.
 * ---
 */

import React, { useState, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import JsonLd from '../seo/JsonLd';
import { homeSchema } from '../seo/structuredData';
import { Link } from 'react-router-dom';
import { trackPhoneClick, trackEmailClick, trackCTAClick } from '../utils/gtag';
import { startLabMode } from '../utils/labMode';
import {
  Beaker,
  Zap,
  Shield,
  TrendingUp,
  Clock,
  Droplets,
  Award,
  Phone,
  Mail,
  MapPin,
  Check,
  ArrowRight,
  Sparkles,
  Target,
  HeartHandshake,
  ChevronDown,
  MessageCircle,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useInView } from '../hooks/useInView';
import { useScrollTransform } from '../hooks/useScrollTransform';
import { useScrollDepth } from '../hooks/useScrollDepth';
import themesConfig from '../theme/themes';
import {
  bulkIngredientDisclaimer,
  dosing,
  dropInProcess,
  features as contentFeatures,
  perfectFor,
  positioning,
  pricing,
  problems,
  process,
  solutionPoints,
  specComparison,
} from '../content/product.js';
import { company } from '../content/company.js';

// Theme configuration - Single source of truth for all colors
const themes = themesConfig;

const FEATURE_ICONS = { Beaker, Sparkles, Zap, Target, Shield, HeartHandshake };

const specValue = (name) => specComparison.find((row) => row.spec === name)?.nano ?? '';

// The pricing card leads on the figure, so it is split off the SSoT sentence rather than retyped.
const priceFigure = pricing.headline.match(/\$[\d,.]+/)?.[0] ?? '';
const priceDetail = pricing.headline.replace(priceFigure, '').trim();

// Composed from the spec SSoT so it cannot drift; Google truncates past ~160 characters.
const metaDescription = `Crystal-clear kavalactone nanoemulsion for canned and bottled beverages: ${specValue(
  'Mean particle size',
)}, ${specValue('Water dispersibility')}, ${specValue('Relative absorption')} absorption.`;

// Animated gradient orb for hero. Blur lives on a static child so the scale/opacity
// animation composites a pre-rasterised bitmap instead of re-filtering 600px every frame.
const GlowOrb = React.memo(function GlowOrb({ className = '', paintClassName = '', delay = 0 }) {
  return (
    <div
      className={`absolute rounded-full ${className}`}
      style={{
        animation: `glow-orb 4s ease-in-out ${delay}s infinite`,
        willChange: 'transform, opacity',
      }}
    >
      <div className={`absolute inset-0 rounded-full ${paintClassName}`} />
    </div>
  );
});

// Animated line/grid background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
      }} />
    </div>
  );
}

// Section wrapper with scroll animation
const AnimatedSection = React.memo(function AnimatedSection({ children, className = '', id = '' }) {
  const [ref, isInView] = useInView();

  return (
    <section
      ref={ref}
      id={id}
      className={`${className} ${isInView ? 'scroll-visible' : 'scroll-hidden'}`}
    >
      {children}
    </section>
  );
});

export default function KavaLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, setIsDark } = useTheme();

  const theme = isDark ? themes.dark : themes.light;
  const heroRef = useRef(null);
  const heroStyle = useScrollTransform(heroRef);

  // Track scroll depth milestones for analytics
  useScrollDepth();

  // Each figure is the head of its SSoT spec value; the label carries the qualifier.
  const stats = useMemo(() => {
    const [absorption, ...vsWhat] = specValue('Relative absorption').split(' ');
    const [dispersibility] = specValue('Water dispersibility').split(' ');
    return [
      { value: specValue('Mean particle size'), label: 'Mean particle size', icon: Droplets },
      { value: specValue('Kavalactone load'), label: 'Kavalactone load', icon: Beaker },
      { value: absorption, label: `Higher absorption vs ${vsWhat.join(' ')}`, icon: TrendingUp },
      { value: dispersibility, label: 'Dispersible, clear in the finished beverage', icon: Sparkles },
    ];
  }, []);

  const features = useMemo(
    () => contentFeatures.map((feature) => ({ ...feature, icon: FEATURE_ICONS[feature.iconKey] })),
    []
  );

  return (
    <div className={`min-h-screen ${theme.text} overflow-x-hidden transition-colors duration-500`}>
      <Helmet>
        <title>Nano Kava — the first kava nanoemulsion, ~20 nm and 100% water-dispersible | EnjoyNano</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href="https://enjoynano.com/" />
        <meta property="og:title" content="Nano Kava — the first kava nanoemulsion, ~20 nm and 100% water-dispersible" />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content="https://enjoynano.com/" />
        <link rel="alternate" type="text/markdown" href="https://enjoynano.com/index.md" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://enjoynano.com/og-image.png" />
        <meta name="twitter:image" content="https://enjoynano.com/og-image.png" />
      </Helmet>
      <JsonLd data={homeSchema} />

      {/* Navigation */}
      <nav
        className={`animate-slide-down fixed top-0 left-0 right-0 z-50 ${theme.bgNav} border-b ${theme.border}/50 transition-colors duration-500`}
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Easter egg: three clicks on the logo spikes the particle field — components/CLAUDE.md § Lab mode.
              event.detail is the browser's own click counter, so this needs no timer. */}
          <div
            className="flex items-center gap-3 interactive-btn hover-scale-xs"
            onClick={(event) => { if (event.detail === 3) startLabMode(); }}
          >
            {/* Cannasol Logo */}
            <img
              src={theme.logo}
              alt="Cannasol Technologies Logo"
              className="h-10 w-auto"
            />
            <div className="hidden sm:block">
              <span className={`font-semibold text-lg ${theme.text}`}>Cannasol</span>
              <span className={`${theme.textSecondary} text-sm ml-1`}>Technologies</span>
            </div>
          </div>
          
          {/* lg, not md: 7 links + toggle + CTA don't fit a 768px nav — they overlapped the logo. */}
          <div className="hidden lg:flex items-center gap-8 text-sm">
            {[
              { href: '#benefits', label: 'Benefits' },
              { href: '#process', label: 'Process' },
              { href: '#dosing', label: 'Dosing' },
              { href: '#proof', label: 'Partners' },
              { to: '/mushrooms', label: 'Mushrooms' },
              { to: '/faq', label: 'FAQ' },
              { to: '/contact', label: 'Contact' },
            ].map((item) => {
              const Tag = item.to ? Link : 'a';
              const linkProps = item.to ? { to: item.to } : { href: item.href };
              return (
                <div key={item.label} className="relative group">
                  {/* min-h-[44px] on the link itself, not the wrapper — a tap only ever hits the anchor's own box. */}
                  <Tag
                    {...linkProps}
                    className={`${theme.textSecondary} group-hover:text-emerald-400 transition-colors duration-300 font-medium min-h-[44px] flex items-center`}
                  >
                    {item.label}
                  </Tag>
                  {/* Metallic rim underline — same gradient/glint recipe as the sol-lead pill; see src/index.css § Desktop nav underline shimmer */}
                  <span className="nav-underline absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
                  <span className="nav-underline-glint absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
                </div>
              );
            })}

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors interactive-btn hover-scale active-press-sm`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <a
              href="#contact"
              onClick={() => trackCTAClick('Get Started', 'nav')}
              className={`btn-shine px-5 py-2.5 bg-gradient-to-r ${theme.accent} text-slate-900 font-semibold rounded-full interactive-btn hover-scale-sm active-press-sm`}
            >
              Get Started
            </a>
          </div>
          
          {/* Mobile menu button — lg matches the links row above; md left the nav with neither the links nor this trigger between 768-1023px. */}
          <div className="lg:hidden flex items-center gap-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors interactive-btn hover-scale active-press-sm`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              className={`flex items-center justify-center w-11 h-11 rounded-lg ${theme.toggleMenuBg} ${theme.toggleMenuBorder} border interactive-btn active-press-sm`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className={`w-5 h-5 ${theme.text}`} />
              ) : (
                <Menu className={`w-5 h-5 ${theme.text}`} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown — CSS grid avoids layout thrash from height:'auto' */}
        <div
          className="lg:hidden grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            gridTemplateRows: mobileMenuOpen ? '1fr' : '0fr',
            opacity: mobileMenuOpen ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className={`px-6 py-4 border-t ${theme.border}/50 space-y-1`}>
              {[
                { href: '#benefits', label: 'Benefits' },
                { href: '#process', label: 'Process' },
                { href: '#dosing', label: 'Dosing' },
                { href: '#proof', label: 'Partners' },
                { to: '/mushrooms', label: 'Mushrooms' },
                { to: '/faq', label: 'FAQ' },
              ].map((item) => {
                const Tag = item.to ? Link : 'a';
                const linkProps = item.to ? { to: item.to } : { href: item.href };
                return (
                  <Tag
                    key={item.label}
                    {...linkProps}
                    className={`block ${theme.textSecondary} hover:text-emerald-400 font-medium py-2.5 px-3 rounded-lg hover:${isDark ? 'bg-slate-800/50' : 'bg-emerald-500/10'} transition-colors duration-200 border-l-2 border-transparent hover:border-emerald-500`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Tag>
                );
              })}
              <Link
                to="/contact"
                className="btn-shine block w-full text-center px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-semibold rounded-full"
                onClick={() => {
                  trackCTAClick('Contact Us', 'mobile-menu');
                  setMobileMenuOpen(false);
                }}
              >
                Contact Us
              </Link>
              <a
                href={company.phoneHref}
                onClick={() => trackPhoneClick()}
                className="flex items-center justify-center gap-2 text-emerald-400 py-3.5"
              >
                <Phone className="w-4 h-4" />
                <span className="font-medium">Call: {company.phone}</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden"
        style={heroStyle}
      >
        {/* Animated background (NanoScene is now a global fixed layer in App.jsx) */}
        <div className="absolute inset-0">
          {/* Gradient orbs */}
          <GlowOrb className="top-1/4 left-1/4 w-[600px] h-[600px]" paintClassName={`${theme.gradientOrbs.emerald} blur-[120px]`} delay={0} />
          <GlowOrb className="bottom-1/4 right-1/4 w-[500px] h-[500px]" paintClassName={`${theme.gradientOrbs.teal} blur-[100px]`} delay={1} />
          <GlowOrb className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px]" paintClassName={`${theme.gradientOrbs.cyan} blur-[80px]`} delay={2} />
          {/* Accent glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
          <GridBackground />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          {/* Hero content — light mode gets an edge-free radial scrim instead of a card:
              a bordered/blurred panel read as a visible box over the particle scene. */}
          <div className={`animate-fade-in-up max-w-3xl mx-auto mb-10 ${!isDark ? 'relative' : ''}`}>
            {!isDark && (
              <div
                className="absolute -inset-x-20 -inset-y-16 md:-inset-x-40 md:-inset-y-28 pointer-events-none"
                style={{
                  // Radius is 50% so the fade completes inside the element — a larger
                  // radius gets clipped at the edges and reads as a hard seam.
                  background:
                    'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,255,255,0.95), rgba(255,255,255,0.93) 58%, rgba(255,255,255,0.78) 76%, rgba(255,255,255,0.34) 90%, rgba(255,255,255,0) 100%)',
                }}
                aria-hidden="true"
              />
            )}
            <div className="relative">
            {/* Badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 ${theme.bgBadge} rounded-full border ${theme.borderCard} mb-8`}
              style={isDark ? { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' } : {}}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className={`text-sm ${theme.textSecondary} font-medium`} style={isDark ? { textShadow: '0 1px 3px rgba(0,0,0,0.5)' } : {}}>{positioning.badge}</span>
            </div>

            {/* Main headline */}
            <h1
              className="animate-fade-in-up-hero anim-delay-200 relative text-6xl md:text-8xl lg:text-9xl font-black mb-6 leading-[1.1] tracking-tighter"
            >
              {/* Background glow pulse */}
              {isDark && (
                <span
                  className="absolute inset-0 blur-3xl pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.4), rgba(45, 212, 191, 0.2), transparent 70%)',
                    animation: 'pulse-opacity 3s ease-in-out infinite',
                    willChange: 'opacity',
                  }}
                  aria-hidden="true"
                />
              )}
              <span className="inline-block relative">
                {/* Static glyph replica carries the drop-shadow. The gradient fill animates
                    background-position; a filter on that same span re-rasterised the 80px
                    shadow every frame and recapped the page at ~24fps. */}
                <span
                  data-hero-shadow
                  aria-hidden="true"
                  className="absolute left-0 top-0 pointer-events-none select-none"
                  style={{
                    color: isDark ? '#a7f3d0' : '#059669',
                    filter: isDark
                      ? 'drop-shadow(0 0 40px rgba(52, 211, 153, 0.4)) drop-shadow(0 0 80px rgba(45, 212, 191, 0.2))'
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                  }}
                >
                  Nano Kava
                </span>
                <span
                  className="relative animate-gradient-slow"
                  style={{
                    backgroundImage: isDark
                      ? 'linear-gradient(120deg, #a7f3d0, #6ee7b7, #2dd4bf, #22d3ee, #67e8f9, #6ee7b7, #a7f3d0)'
                      : 'linear-gradient(120deg, #059669, #0d9488, #0891b2, #06b6d4, #0d9488, #059669)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Nano Kava
                </span>
              </span>
              <span className="sr-only"> — the first kava nanoemulsion, ~20 nm and 100% water-dispersible</span>
            </h1>

            {/* The brief's own hero line carries the page; the sentence under it comes from the SSoT. */}
            <p
              className={`animate-fade-in-up anim-delay-400 text-2xl md:text-4xl font-bold tracking-tight leading-tight ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
            >
              Kava that behaves like water.
            </p>
            <p
              className={`animate-fade-in-up anim-delay-600 mt-5 text-base md:text-xl leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}
            >
              {positioning.summary}
            </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div
            className="animate-fade-in-up anim-delay-800 flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href="#contact"
              onClick={() => trackCTAClick('Request Sample', 'hero')}
              className={`btn-shine animate-gradient group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-full text-lg overflow-hidden interactive-btn hover-scale-sm active-press-sm`}
            >
              <span className="relative z-10 flex items-center gap-2">
                Request a Sample
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            <a
              href={company.phoneHref}
              onClick={() => trackPhoneClick()}
              className={`btn-shine inline-flex items-center justify-center gap-2 px-8 py-4 ${theme.bgBadge} ${theme.shadowCard} ${theme.text} font-semibold rounded-full text-lg border ${theme.borderCard} hover:border-emerald-500/50 transition-colors interactive-btn hover-scale-xs active-press-sm`}
              style={isDark ? { boxShadow: '0 4px 24px rgba(0,0,0,0.4)' } : { boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
            >
              <Phone className="w-5 h-5" />
              Call Josh: {company.phone}
            </a>
          </div>

          <p className={`animate-fade-in-up anim-delay-800 mt-6 mb-16 text-sm ${theme.textMuted}`}>
            {positioning.trust}
          </p>

          {/* Stats */}
          <div
            className="animate-fade-in-up anim-delay-800 relative grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 max-w-4xl mx-auto"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="relative group interactive-card hover-lift-sm"
              >
                {/* Animated border gradient */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-500/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                <div className={`relative h-full ${theme.bgCardStats} ${theme.shadowCard} rounded-2xl px-4 py-5 md:px-5 md:py-6 border ${theme.borderCard} group-hover:border-transparent transition-colors`}>
                  <div className="w-9 h-9 mx-auto mb-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <stat.icon className={`w-4 h-4 ${theme.accentText}`} />
                  </div>
                  <div className={`text-2xl md:text-3xl font-bold leading-none bg-gradient-to-r ${theme.accentGradient} bg-clip-text text-transparent`}>
                    {stat.value}
                  </div>
                  <div className={`${theme.textSecondary} text-xs md:text-sm mt-2 leading-snug`}>{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator - Down arrow */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          style={{ animation: 'bounce-slow 2s ease-in-out infinite' }}
        >
          <span className={`text-xs font-medium ${theme.textMuted} uppercase tracking-wider`}>
            Scroll
          </span>
          <ChevronDown className={`w-8 h-8 ${theme.textAccent}`} strokeWidth={2.5} />
        </div>
      </header>

      {/* Problem/Solution Section */}
      <AnimatedSection id="benefits" className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-stretch">
            {/* Problem */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-3xl blur-2xl" />
              <div className={`relative ${theme.bgCardSolid} ${theme.shadowXl} backdrop-blur rounded-3xl p-8 md:p-10 border ${theme.borderCard} flex flex-col h-full`}>
                <div className={`inline-flex self-start items-center gap-2 px-3 py-1 ${theme.bgError} rounded-full ${theme.textError} text-sm font-medium mb-6`}>
                  <span className={`w-1.5 h-1.5 ${theme.errorDot} rounded-full`} />
                  The Industry Problem
                </div>
                <h2 className={`text-2xl md:text-4xl font-bold mb-6 leading-tight ${theme.text}`}>
                  Traditional Kava
                  <span className="text-red-500"> Doesn't Work</span>{' '}
                  for Modern Beverages
                </h2>
                <p className={`${theme.textSecondary} text-lg mb-8 leading-relaxed`}>
                  Traditional kava preparations absorb poorly, feel gritty and cloud the can.
                  That is a formulation problem long before it is a marketing one.
                </p>
                <div className="space-y-4 mt-auto">
                  {problems.map((problem, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 ${theme.textSecondary}`}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full ${theme.bgErrorIcon} flex items-center justify-center`}>
                        <span className={`${theme.textError} text-sm`}>✕</span>
                      </span>
                      {problem}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Solution */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-2xl" />
              <div className={`relative ${theme.bgCardSolid} ${theme.shadowXl} backdrop-blur rounded-3xl p-8 md:p-10 border ${theme.borderCard} flex flex-col h-full`}>
                <div className={`inline-flex self-start items-center gap-2 px-3 py-1 ${theme.bgHighlight} rounded-full ${theme.accentText} text-sm font-medium mb-6`}>
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  The Cannasol Solution
                </div>
                <h3 className={`text-2xl md:text-4xl font-bold mb-4 ${theme.text}`}>
                  Nanoemulsification:
                  <br />
                  <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}>
                    A Game-Changing Solution
                  </span>
                </h3>
                <p className={`${theme.textSecondary} mb-8 leading-relaxed`}>
                  This cutting-edge process breaks down oil-based kavalactones into tiny droplets suspended in water—so small they become almost transparent, creating a stable and uniform mixture. Our proprietary NanoOptimizer™ surfactant system dramatically increases surface area, making kavalactones more readily available for absorption by the body.
                </p>
                <div className="space-y-4 mt-auto">
                  {solutionPoints.map((benefit, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 ${theme.text}`}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full ${theme.bgIconBox} flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-emerald-400" />
                      </span>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Spec comparison — every row comes from the SSoT, so the table grows with it */}
      <AnimatedSection id="specs" className="relative py-20 md:py-28">
        <div className="max-w-5xl mx-auto px-6">
          {/* Bare over the fixed canvas — scrim + raised token, see CLAUDE.md § Section intro legibility. */}
          <div className={`max-w-2xl mb-10 -mx-4 px-4 py-3 rounded-2xl ${theme.bgScrim}`}>
            <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${theme.text}`}>
              Side by side with a conventional emulsion
            </h2>
            <p className={`${theme.textIntro} text-lg`}>
              The specs a formulator checks first, on one screen.
            </p>
          </div>

          {/* bgCardOpaque, not bare — see CLAUDE.md § Dosing panel legibility (same panel system). */}
          <div className={`rounded-3xl border ${theme.borderCard} ${theme.bgCardOpaque} ${theme.shadowXl} overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-left">
                <caption className="sr-only">Nano Kava compared with a conventional kava emulsion</caption>
                <thead>
                  <tr className={`border-b ${theme.border} ${theme.bgCardAlt}`}>
                    <th scope="col" className={`py-4 pl-6 pr-4 text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Spec</th>
                    <th scope="col" className={`py-4 pr-4 text-xs font-semibold uppercase tracking-wide ${theme.accentText}`}>Nano Kava</th>
                    <th scope="col" className={`py-4 pr-6 text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Conventional kava</th>
                  </tr>
                </thead>
                <tbody>
                  {specComparison.map((row) => (
                    <tr key={row.spec} className={`border-b ${theme.border} last:border-b-0`}>
                      <th scope="row" className={`py-4 pl-6 pr-4 align-top text-sm font-medium ${theme.textSecondary}`}>{row.spec}</th>
                      <td className={`py-4 pr-4 align-top text-sm font-semibold ${theme.text}`}>{row.nano}</td>
                      <td className={`py-4 pr-6 align-top text-sm ${theme.textSecondary}`}>{row.traditional}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Features Section */}
      <AnimatedSection className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`${theme.bgCard} backdrop-blur-md border ${theme.borderCard} rounded-3xl p-8 md:p-10 mb-16 text-center ${theme.shadowCard}`}>
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              The Future of
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Kava Consumption</span>
            </h2>
            <p className={`${theme.textIntro} text-lg max-w-2xl mx-auto`}>
              Nanoemulsification opens formats that were closed to kavalactones — shots, seltzers, flavoured waters — without the haze, the sediment or the grit that used to come with them.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative interactive-card hover-lift"
              >
                {/* Glow effect on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-500" />
                <div className={`relative h-full ${theme.bgCard} ${theme.shadowCard} backdrop-blur rounded-2xl p-6 border ${theme.borderCard} group-hover:border-emerald-500/50 transition-colors duration-300`}>
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${theme.bgIconBox} flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-[transform,box-shadow] duration-300`}>
                        <feature.icon className={`w-6 h-6 ${theme.accentText} group-hover:text-emerald-300 transition-colors`} />
                      </div>
                      <span className={`px-3 py-1 ${theme.bgHighlightBorder} rounded-full ${theme.accentText} text-xs font-medium border`}>
                        {feature.highlight}
                      </span>
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${theme.text} group-hover:${theme.accentText} transition-colors duration-300`}>
                      {feature.title}
                    </h3>
                    <p className={`${theme.textSecondary} text-sm leading-relaxed transition-colors duration-300`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Process Section */}
      <AnimatedSection id="process" className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          {/* Bare over the fixed canvas — scrim + raised token, see CLAUDE.md § Section intro legibility. */}
          <div className={`text-center mb-16 max-w-3xl mx-auto px-6 py-4 rounded-2xl ${theme.bgScrim}`}>
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              From Concept to
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Market Leader</span>
            </h2>
            <p className={`${theme.textIntro} text-lg max-w-2xl mx-auto`}>
              We work directly with every client because we believe in your success. Here's how we partner together.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-[2px]">
              <div className="w-full h-full bg-gradient-to-r from-emerald-500/30 via-teal-500/50 to-emerald-500/30 rounded-full" />
              <div
                className="absolute top-0 left-0 h-full w-1/4 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full"
                style={{ animation: 'line-shimmer 3s ease-in-out infinite' }}
              />
            </div>
            {process.map((item, i) => (
              <div
                key={i}
                className="relative group interactive-card hover-lift-sm"
              >
                <div className={`relative ${theme.bgCardSolid} ${theme.shadowCard} backdrop-blur-sm rounded-2xl p-6 border ${theme.borderCard} group-hover:border-emerald-500/40 transition-colors duration-300`}>
                  {/* Step number with glow */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className={`relative text-5xl font-bold bg-gradient-to-br ${theme.accentGradientAlt} bg-clip-text text-transparent`}>
                      {item.step}
                    </div>
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${theme.text} group-hover:${theme.accentText} transition-colors`}>{item.title}</h3>
                  <p className={`${theme.textSecondary} text-sm transition-colors`}>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Partnership & Trust Section */}
      <AnimatedSection id="proof" className={`relative py-24 md:py-32 ${theme.bgSecondary}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-4 py-2 ${theme.bgHighlight} rounded-full ${theme.accentText} text-sm font-medium mb-6`}>
              <Award className="w-4 h-4" />
              Industry-Leading Partnership
            </div>
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              Powered by the Best
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Equipment</span>
            </h2>
            <p className={`${theme.textIntro} text-lg max-w-2xl mx-auto`}>
              We partner with QSonica, the #1 name in ultrasonic liquid processing, to deliver unmatched nanoemulsion quality.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* QSonica Partnership Card */}
            <div className="relative group interactive-card hover-lift-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              <div className={`relative ${theme.bgCardAlt} ${theme.shadowCard} backdrop-blur rounded-2xl p-8 border ${theme.borderCard} h-full transition-[border-color,box-shadow] duration-300 group-hover:border-emerald-500/40 group-hover:shadow-lg group-hover:shadow-emerald-500/10`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-xl ${theme.bgIconBox} flex items-center justify-center`}>
                    <Beaker className={`w-8 h-8 ${theme.accentText}`} />
                  </div>
                  <div>
                    <div className={`${theme.accentText} text-sm font-medium`}>Official Partner</div>
                    <div className={`text-2xl font-bold ${theme.text}`}>QSonica</div>
                  </div>
                </div>
                <p className={`${theme.textSecondary} mb-4`}>
                  #1 Ultrasonic Liquid Processing Equipment manufacturer. Our partnership ensures you get access to the most advanced nanoemulsification technology available.
                </p>
                <div className={`flex items-center gap-2 ${theme.textMuted} text-sm`}>
                  <Check className={`w-4 h-4 ${theme.accentText}`} />
                  Industry-leading ultrasonic processors
                </div>
              </div>
            </div>

            {/* Track Record Card */}
            <div className="relative group interactive-card hover-lift-sm">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              <div className={`relative ${theme.bgCardAlt} ${theme.shadowCard} backdrop-blur rounded-2xl p-8 border ${theme.borderCard} h-full transition-[border-color,box-shadow] duration-300 group-hover:border-emerald-500/40 group-hover:shadow-lg group-hover:shadow-emerald-500/10`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-xl ${theme.bgIconBox} flex items-center justify-center`}>
                    <Award className={`w-8 h-8 ${theme.accentText}`} />
                  </div>
                  <div>
                    <div className={`${theme.accentText} text-sm font-medium`}>Proven Results</div>
                    <div className={`text-2xl font-bold ${theme.text}`}>Trusted Partner</div>
                  </div>
                </div>
                <p className={`${theme.textSecondary} mb-4`}>
                  Every brand we've worked with loves the results. The product sells itself—Josh just helps you get there.
                </p>
                <div className={`flex items-center gap-2 ${theme.textMuted} text-sm`}>
                  <Check className={`w-4 h-4 ${theme.accentText}`} />
                  Dedicated customer support
                </div>
              </div>
            </div>
          </div>

          {/* Target Audience */}
          <div className="mt-16 text-center">
            <p className={`${theme.textMuted} text-sm uppercase tracking-wider mb-4`}>Perfect For</p>
            <div className="flex flex-wrap justify-center gap-4">
              {perfectFor.map((item, i) => (
                <span
                  key={i}
                  className={`px-5 py-2.5 ${theme.bgPill} ${theme.shadowCard} rounded-full ${theme.textSecondary} text-sm border ${theme.borderCard} hover:border-emerald-500/40 hover:${theme.accentText} transition-colors cursor-default interactive-btn hover-scale-xs`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Replaced the savings calculator, spec A7 — see CLAUDE.md § The savings calculator is retired. */}
      <AnimatedSection id="dosing" className="relative py-24 md:py-32">
        <div className="max-w-5xl mx-auto px-6">
          {/* Bare over the fixed canvas — scrim + raised token, see CLAUDE.md § Section intro legibility. */}
          <div className={`max-w-2xl mb-10 -mx-4 px-4 py-3 rounded-2xl ${theme.bgScrim}`}>
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              Dosing &amp; cost per serving
            </h2>
            <p className={`${theme.textIntro} text-lg leading-relaxed`}>{dosing.guidance}</p>
          </div>

          {/* bgCardOpaque, not bgCardSolid — see CLAUDE.md § Dosing panel legibility. */}
          <div className={`rounded-3xl border ${theme.borderCard} ${theme.bgCardOpaque} ${theme.shadowXl} overflow-hidden`}>
            {/* Below sm: stacked cards, not the table — see CLAUDE.md § Dosing table on mobile. */}
            <div className="sm:hidden">
              <h3 className="sr-only">
                Kavalactone per serving, emulsion volume, servings per liter and ingredient cost per serving
              </h3>
              {dosing.rows.map((row) => {
                const recommended = /recommended/i.test(row.kavalactone);
                return (
                  <div
                    key={row.kavalactone}
                    className={`px-5 py-4 border-b ${theme.border} last:border-b-0 border-l-[3px] ${recommended ? `border-emerald-500 ${theme.bgHighlight}` : 'border-transparent'}`}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <span className={`text-sm font-semibold ${theme.text}`}>{row.kavalactone}</span>
                      <span className={`flex-shrink-0 text-base font-bold tabular-nums ${theme.text}`}>{row.costPerServing}</span>
                    </div>
                    <p className={`mt-1 text-xs tabular-nums ${theme.textSecondary}`}>
                      {row.emulsion} emulsion &middot; {row.servingsPerLiter} servings/L
                    </p>
                  </div>
                );
              })}
            </div>

            {/* sm and up: the full table. */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left">
                <caption className="sr-only">
                  Kavalactone per serving, emulsion volume, servings per liter and ingredient cost per serving
                </caption>
                <thead>
                  <tr className={`border-b ${theme.border}`}>
                    <th scope="col" className={`py-4 pl-6 pr-4 text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Kavalactone / serving</th>
                    <th scope="col" className={`py-4 pr-4 text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Emulsion</th>
                    <th scope="col" className={`py-4 pr-4 text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Servings / liter</th>
                    <th scope="col" className={`py-4 pr-6 text-right text-xs font-semibold uppercase tracking-wide ${theme.textSecondary}`}>Cost / serving</th>
                  </tr>
                </thead>
                <tbody>
                  {dosing.rows.map((row) => {
                    const recommended = /recommended/i.test(row.kavalactone);
                    return (
                      <tr
                        key={row.kavalactone}
                        className={`border-b ${theme.border} ${recommended ? theme.bgHighlight : ''}`}
                      >
                        <th
                          scope="row"
                          className={`py-4 pl-6 pr-4 border-l-[3px] ${recommended ? 'border-emerald-500' : 'border-transparent'} text-sm font-semibold ${theme.text}`}
                        >
                          {row.kavalactone}
                        </th>
                        <td className={`py-4 pr-4 text-sm tabular-nums ${theme.textSecondary}`}>{row.emulsion}</td>
                        <td className={`py-4 pr-4 text-sm tabular-nums ${theme.textSecondary}`}>{row.servingsPerLiter}</td>
                        <td className={`py-4 pr-6 text-right text-sm font-semibold tabular-nums ${theme.text}`}>{row.costPerServing}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className={`rounded-3xl border ${theme.borderHighlight} ${theme.bgCardOpaque} p-8 flex flex-col`}>
              <p className={`text-5xl md:text-6xl font-black leading-none ${theme.text}`}>{priceFigure}</p>
              <p className={`${theme.text} text-lg font-medium mt-3`}>{priceDetail}</p>
              {/* Stronger than textSecondary — see CLAUDE.md § Dosing panel legibility. */}
              <p className={`${theme.textIntro} mt-4 leading-relaxed`}>{pricing.tier}</p>
              <Link
                to="/contact?inquiry=pricing&product=nano-kava"
                onClick={() => trackCTAClick('Request a written quote', 'dosing')}
                className={`mt-6 inline-flex items-center gap-2 font-semibold ${theme.accentText} interactive-btn`}
              >
                Ask Josh for a written quote
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* bgCardOpaque, not bgCardAlt — matches the pricing card; see CLAUDE.md § Dosing panel legibility. */}
            <div className={`rounded-3xl border ${theme.borderCard} ${theme.bgCardOpaque} p-8`}>
              <h3 className={`text-lg font-semibold mb-3 ${theme.text}`}>How it goes into your batch</h3>
              <p className={`${theme.textSecondary} leading-relaxed`}>{dropInProcess.summary}</p>
              <p className={`${theme.textSecondary} leading-relaxed mt-3`}>{dropInProcess.clarity}</p>
            </div>
          </div>

          <p className={`${theme.textSecondary} text-xs leading-relaxed mt-6 max-w-3xl`}>{pricing.caveat}</p>
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection id="contact" className="relative py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
            <div className={`relative ${theme.bgCard} ${theme.shadowXl} backdrop-blur rounded-3xl p-8 md:p-12 border ${theme.borderCta}`}>
              <div className="text-center mb-10">
                <div
                  className={`animate-glow inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${theme.accent} mb-6`}
                >
                  <MessageCircle className="w-8 h-8 text-slate-900" />
                </div>
                <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${theme.text}`}>
                  Ready to Create the Best
                  <br />
                  <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}>
                    Kava Product on the Market?
                  </span>
                </h2>
                <p className={`${theme.textSecondary} text-lg max-w-2xl mx-auto`}>
                  Talk directly with Josh about your product vision. Get a sample and see why the top brands trust Cannasol.
                </p>
              </div>

              <div className="flex flex-wrap justify-center items-stretch gap-4 mb-8">
                <Link to="/contact" onClick={() => trackCTAClick('Contact Form', 'cta-section')} className="w-full sm:w-auto">
                  <div
                    className={`btn-shine flex items-center justify-center gap-3 px-6 py-4 min-w-[200px] w-full sm:w-auto whitespace-nowrap bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-xl interactive-btn hover-scale-xs active-press-sm`}
                  >
                    <MessageCircle className="w-5 h-5 flex-shrink-0" />
                    Contact Form
                  </div>
                </Link>
                <a
                  href={company.phoneHref}
                  onClick={() => trackPhoneClick()}
                  className={`btn-shine flex items-center justify-center gap-3 px-6 py-4 min-w-[200px] w-full sm:w-auto whitespace-nowrap ${theme.bgButton} ${theme.text} font-semibold rounded-xl border ${theme.borderCard} hover:border-emerald-500/50 transition-colors interactive-btn hover-scale-xs active-press-sm`}
                >
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  Call {company.phone}
                </a>
                <a
                  href={`mailto:${company.founder.email}`}
                  onClick={() => trackEmailClick()}
                  className={`btn-shine flex items-center justify-center gap-3 px-6 py-4 min-w-[200px] w-full sm:w-auto whitespace-nowrap ${theme.bgButton} ${theme.text} font-semibold rounded-xl border ${theme.borderCard} hover:border-emerald-500/50 transition-colors interactive-btn hover-scale-xs active-press-sm`}
                >
                  <Mail className="w-5 h-5 flex-shrink-0" />
                  Email Us
                </a>
              </div>

              <div className={`flex flex-wrap items-center justify-center gap-6 ${theme.textSecondary} text-sm`}>
                <a
                  href="https://maps.google.com/?q=Sarasota,+Florida+34234"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 py-3 hover:text-emerald-400 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Sarasota, Florida
                </a>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  {company.hours}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className={`relative border-t ${theme.border} py-12 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img
                src={theme.logo}
                alt="Cannasol Technologies"
                className="h-8 w-auto"
                loading="lazy"
              />
              <span className={`${theme.textSecondary} text-sm`}>© 2026 Cannasol Technologies LLC</span>
            </div>
            <div className={`flex gap-6 text-sm ${theme.textSecondary}`}>
              <a href={company.shop} target="_blank" rel="noopener noreferrer" className={`py-3 hover:${theme.text} transition-colors`}>Shop</a>
              <a href={company.resources} target="_blank" rel="noopener noreferrer" className={`py-3 hover:${theme.text} transition-colors`}>Resources</a>
              <Link to="/contact" className={`py-3 hover:${theme.text} transition-colors`}>Contact</Link>
            </div>
          </div>
          <p className={`${theme.textSecondary} text-xs leading-relaxed mt-8 max-w-4xl`}>
            {bulkIngredientDisclaimer}
          </p>
        </div>
      </footer>
    </div>
  );
}
