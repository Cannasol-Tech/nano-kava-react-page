import React, { useState, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { trackPhoneClick, trackEmailClick, trackCTAClick } from '../utils/gtag';
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

// Theme configuration - Single source of truth for all colors
const themes = themesConfig;

// Animated counter component
const AnimatedCounter = React.memo(function AnimatedCounter({ value, suffix = '', prefix = '' }) {
  const [ref, isInView] = useInView();
  const numValue = parseInt(value.replace(/[^0-9]/g, ''));
  // Start at target value so prerendered HTML shows correct numbers for SEO
  const [count, setCount] = useState(numValue);

  React.useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = numValue / steps;
      let current = 0;
      setCount(0);

      const timer = setInterval(() => {
        current += increment;
        if (current >= numValue) {
          setCount(numValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return <span ref={ref}>{prefix}{count}{suffix}</span>;
});

// Animated gradient orb for hero
const GlowOrb = React.memo(function GlowOrb({ className = '', delay = 0 }) {
  return (
    <div
      className={`absolute rounded-full ${className}`}
      style={{
        animation: `glow-orb 4s ease-in-out ${delay}s infinite`,
        willChange: 'transform, opacity',
      }}
    />
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
  const [activeFeature, setActiveFeature] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isDark, setIsDark } = useTheme();

  const theme = isDark ? themes.dark : themes.light;
  const heroRef = useRef(null);
  const heroStyle = useScrollTransform(heroRef);

  // Track scroll depth milestones for analytics
  useScrollDepth();

  const stats = useMemo(() => [
    { value: '18', prefix: '~', suffix: 'nm', label: 'Particle Size', icon: Droplets },
    { value: '5', suffix: 'x', label: 'Bioavailability', icon: TrendingUp },
    { value: '5', suffix: ' min', label: 'Onset Time', icon: Clock }
  ], []);

  const features = useMemo(() => [
    {
      icon: Beaker,
      title: "Enhanced Bioavailability",
      description: "The increased surface area of our ~18nm nanoemulsified kavalactones enables superior absorption in the gastrointestinal tract, delivering higher bioavailability and more potent effects at lower doses.",
      highlight: "Industry First"
    },
    {
      icon: Sparkles,
      title: "Improved Palatability",
      description: "Nanoemulsification eliminates the gritty texture and muddy appearance of traditional kava preparations, resulting in crystal-clear, visually appealing beverages your customers will love.",
      highlight: "Premium Clarity"
    },
    {
      icon: Zap,
      title: "Ease of Production",
      description: "Our nanoemulsified kava extracts integrate seamlessly into various beverage formulations—shots, soft drinks, and flavored water—making kava consumption more convenient and enjoyable.",
      highlight: "Versatile"
    },
    {
      icon: Target,
      title: "Precise Dosing",
      description: "With uniform distribution of kavalactones throughout the nanoemulsion, dosing becomes remarkably accurate—ensuring consistent, predictable effects in every serving.",
      highlight: "Consistent"
    },
    {
      icon: Shield,
      title: "Bitter Blocker Bundles",
      description: "We offer the best deals on bitter blockers in the industry. Create smooth, palatable Kava products your customers will actually enjoy drinking.",
      highlight: "Best Pricing"
    },
    {
      icon: HeartHandshake,
      title: "Direct Access to Josh",
      description: "Our founder works directly with every client, bringing insights from top Kratom and Kava brands. Your success is our success—we're partners, not just suppliers.",
      highlight: "Personal Support"
    }
  ], []);

  const process = useMemo(() => [
    { step: '01', title: 'Discovery Call', description: 'Discuss your product vision with Josh directly' },
    { step: '02', title: 'Sample & Test', description: 'Get samples to test in your formulations' },
    { step: '03', title: 'Refine & Order', description: 'Dial in your product and place your order' },
    { step: '04', title: 'Scale Production', description: 'Launch with confidence and ongoing support' }
  ], []);

  return (
    <div className={`min-h-screen ${theme.text} overflow-x-hidden transition-colors duration-500`}>
      <Helmet>
        <title>Nano Kava | Premium Nano-Emulsified Kavalactones — EnjoyNano</title>
        <meta name="description" content="Nano-emulsified kava with ~18nm particle size. 10x bioavailability, 5-minute onset, crystal-clear kavalactones. Trusted by top beverage brands." />
        <link rel="canonical" href="https://enjoynano.com/" />
        <meta property="og:title" content="Nano Kava | Premium Nano-Emulsified Kavalactones" />
        <meta property="og:description" content="Nano-emulsified kava with ~18nm particle size. 10x bioavailability, 5-minute onset, crystal-clear kavalactones." />
        <meta property="og:url" content="https://enjoynano.com/" />
      </Helmet>

      {/* Navigation */}
      <nav
        className={`animate-slide-down fixed top-0 left-0 right-0 z-50 ${theme.bgNav} border-b ${theme.border}/50 transition-colors duration-500`}
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 interactive-btn hover-scale-xs">
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
          
          <div className="hidden md:flex items-center gap-8 text-sm">
            {[
              { href: '#benefits', label: 'Benefits' },
              { href: '#process', label: 'Process' },
              { href: '#proof', label: 'Partners' },
              { to: '/mushrooms', label: 'Mushrooms' },
              { to: '/faq', label: 'FAQ' },
              { to: '/contact', label: 'Contact' },
            ].map((item) => {
              const Tag = item.to ? Link : 'a';
              const linkProps = item.to ? { to: item.to } : { href: item.href };
              return (
                <div key={item.label} className="relative group">
                  <Tag
                    {...linkProps}
                    className={`${theme.textSecondary} group-hover:text-emerald-400 transition-colors duration-300 font-medium py-1`}
                  >
                    {item.label}
                  </Tag>
                  {/* Animated underline */}
                  <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
                  {/* Glow under the line */}
                  <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out blur-sm" />
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
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors interactive-btn hover-scale active-press-sm`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              className={`flex items-center justify-center w-10 h-10 rounded-lg ${theme.toggleMenuBg} ${theme.toggleMenuBorder} border interactive-btn active-press-sm`}
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
          className="md:hidden grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
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
                href="tel:+12169212240"
                onClick={() => trackPhoneClick()}
                className="flex items-center justify-center gap-2 text-emerald-400 py-2"
              >
                <Phone className="w-4 h-4" />
                <span className="font-medium">Call: (216) 921-2240</span>
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
          <GlowOrb className={`top-1/4 left-1/4 w-[600px] h-[600px] ${theme.gradientOrbs.emerald} blur-[120px]`} delay={0} />
          <GlowOrb className={`bottom-1/4 right-1/4 w-[500px] h-[500px] ${theme.gradientOrbs.teal} blur-[100px]`} delay={1} />
          <GlowOrb className={`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] ${theme.gradientOrbs.cyan} blur-[80px]`} delay={2} />
          {/* Accent glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
          <GridBackground />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          {/* Hero content card — light mode gets a frosted glass wrapper */}
          <div
            className={`animate-fade-in-up max-w-3xl mx-auto mb-10 ${!isDark ? 'bg-white/30 backdrop-blur-xl rounded-3xl px-8 py-10 md:px-12 md:py-12 border border-emerald-500/15 shadow-lg shadow-slate-200/20 overflow-hidden relative' : ''}`}
          >
            {/* Light mode tinted overlay */}
            {!isDark && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 pointer-events-none" />}
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
              <span className={`text-sm ${theme.textSecondary} font-medium`} style={isDark ? { textShadow: '0 1px 3px rgba(0,0,0,0.5)' } : {}}>The World's First & Only ~18nm Kava Nanoemulsion</span>
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
              <span
                className="inline-block relative animate-gradient-slow"
                style={{
                  backgroundImage: isDark
                    ? 'linear-gradient(120deg, #a7f3d0, #6ee7b7, #2dd4bf, #22d3ee, #67e8f9, #6ee7b7, #a7f3d0)'
                    : 'linear-gradient(120deg, #059669, #0d9488, #0891b2, #06b6d4, #0d9488, #059669)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: isDark
                    ? 'drop-shadow(0 0 40px rgba(52, 211, 153, 0.4)) drop-shadow(0 0 80px rgba(45, 212, 191, 0.2))'
                    : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                }}
              >
                Nano Kava
              </span>
              <span className="sr-only"> — Premium Nano-Emulsified Kavalactones</span>
            </h1>

            {/* Subheadline */}
            <p
              className={`animate-fade-in-up anim-delay-400 text-xl md:text-2xl leading-relaxed font-bold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
            >
              Cutting-edge nanoemulsification technology that overcomes the solubility and bioavailability challenges of traditional kava.
              <span className={`font-semibold ${isDark ? 'text-white' : theme.text}`}> Ultra-fine droplets so small they're almost transparent.</span>
              <br className="hidden md:block" />
              Trusted by leading Kava seltzer and shot brands.
            </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div
            className="animate-fade-in-up anim-delay-600 flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <a
              href="#contact"
              onClick={() => trackCTAClick('Request Sample', 'hero')}
              className={`btn-shine hover-glow-intense animate-gradient group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-full text-lg overflow-hidden interactive-btn hover-scale-sm active-press-sm`}
            >
              <span className="relative z-10 flex items-center gap-2">
                Request a Sample
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </a>
            <a
              href="tel:+12169212240"
              onClick={() => trackPhoneClick()}
              className={`btn-shine inline-flex items-center justify-center gap-2 px-8 py-4 ${theme.bgBadge} ${theme.shadowCard} ${theme.text} font-semibold rounded-full text-lg border ${theme.borderCard} hover:border-emerald-500/50 transition-colors interactive-btn hover-scale-xs active-press-sm`}
              style={isDark ? { boxShadow: '0 4px 24px rgba(0,0,0,0.4)' } : { boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
            >
              <Phone className="w-5 h-5" />
              Call Josh: (216) 921-2240
            </a>
          </div>

          {/* Stats */}
          <div
            className="animate-fade-in-up anim-delay-800 relative grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className="relative group interactive-card hover-lift-sm"
              >
                {/* Animated border gradient */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-500/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                <div className={`relative ${theme.bgCardStats} ${theme.shadowCard} rounded-2xl p-6 border ${theme.borderCard} group-hover:border-transparent transition-colors`}>
                  <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-shadow">
                    <stat.icon className={`w-5 h-5 ${theme.accentText}`} />
                  </div>
                  <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${theme.accentGradient} bg-clip-text text-transparent`}>
                    <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </div>
                  <div className={`${theme.textMuted} text-sm mt-1 group-hover:${theme.textSecondary} transition-colors`}>{stat.label}</div>
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
                  Traditional Kava preparations suffer from poor bioavailability, gritty texture, and muddy appearance.
                  Your customers want instant results and a pleasant experience—not a waiting game.
                </p>
                <div className="space-y-4 mt-auto">
                  {[
                    'Limited absorption in the gastrointestinal tract',
                    '30-45 minute onset frustrates consumers',
                    'Gritty texture and muddy appearance',
                    'Inconsistent dosing leads to unpredictable effects'
                  ].map((problem, i) => (
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
                  {[
                    'Enhanced bioavailability through better absorption',
                    'Crystal-clear, visually appealing beverages',
                    'Uniform kavalactone distribution for precise dosing',
                    'Easy integration into shots, soft drinks, and flavored water'
                  ].map((benefit, i) => (
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

      {/* Features Section */}
      <AnimatedSection className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className={`${theme.bgCard} backdrop-blur-md border ${theme.borderCard} rounded-3xl p-8 md:p-10 mb-16 text-center ${theme.shadowCard}`}>
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              The Future of
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Kava Consumption</span>
            </h2>
            <p className={`${theme.textSecondary} text-lg max-w-2xl mx-auto`}>
              Nanoemulsification unlocks the full potential of kava, opening doors for innovative product formulations—from convenient shots to flavor-enhanced beverages—making it easier than ever to experience the relaxing and stress-reducing benefits of kava.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative interactive-card hover-lift"
                onMouseEnter={() => setActiveFeature(i)}
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
          <div className="text-center mb-16">
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              From Concept to
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Market Leader</span>
            </h2>
            <p className={`${theme.textSecondary} text-lg max-w-2xl mx-auto`}>
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
            <p className={`${theme.textSecondary} text-lg max-w-2xl mx-auto`}>
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
              {['Kava Seltzers', 'Functional Shots', 'RTD Beverages', 'Wellness Brands'].map((item, i) => (
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

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Link to="/contact" onClick={() => trackCTAClick('Contact Form', 'cta-section')}>
                  <div
                    className={`btn-shine flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-xl text-lg interactive-btn hover-scale-xs active-press-sm`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Contact Form
                  </div>
                </Link>
                <a
                  href="tel:+12169212240"
                  onClick={() => trackPhoneClick()}
                  className={`btn-shine flex items-center justify-center gap-3 px-6 py-4 ${theme.bgButton} ${theme.text} font-semibold rounded-xl text-lg border ${theme.borderCard} hover:border-emerald-500/50 transition-colors interactive-btn hover-scale-xs active-press-sm`}
                >
                  <Phone className="w-5 h-5" />
                  (216) 921-2240
                </a>
                <a
                  href="mailto:josh.detzel@cannasolusa.com"
                  onClick={() => trackEmailClick()}
                  className={`btn-shine flex items-center justify-center gap-3 px-6 py-4 ${theme.bgButton} ${theme.text} font-semibold rounded-xl text-lg border ${theme.borderCard} hover:border-emerald-500/50 transition-colors interactive-btn hover-scale-xs active-press-sm`}
                >
                  <Mail className="w-5 h-5" />
                  Email Us
                </a>
              </div>

              <div className={`flex flex-wrap items-center justify-center gap-6 ${theme.textSecondary} text-sm`}>
                <a
                  href="https://maps.google.com/?q=Sarasota,+Florida+34234"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Sarasota, Florida
                </a>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Mon-Fri: 9:30AM - 5:30PM
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
            <div className={`flex gap-6 text-sm ${theme.textMuted}`}>
              <a href="https://cannasoltechnologies.com/shop/" target="_blank" rel="noopener noreferrer" className={`hover:${theme.text} transition-colors`}>Shop</a>
              <a href="https://cannasoltechnologies.com/resources" target="_blank" rel="noopener noreferrer" className={`hover:${theme.text} transition-colors`}>Resources</a>
              <Link to="/contact" className={`hover:${theme.text} transition-colors`}>Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom styles for hexagon clip path */}
      <style jsx>{`
        .clip-hexagon {
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
      `}</style>
    </div>
  );
}
