import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { trackPhoneConversion } from '../utils/gtag';
import { ArrowLeft, Leaf, Sparkles, Sun, Moon, ArrowRight, Beaker, Droplets, ShieldCheck, Dumbbell, Phone, Menu, X } from 'lucide-react';
import { useInView } from '../hooks/useInView';

import themesConfig from '../theme/themes';

const themes = themesConfig;

function MushroomsLandingPage() {
  const { isDark, setIsDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [offeringsRef, offeringsInView] = useInView({ margin: '-80px' });
  const [benefitsRef, benefitsInView] = useInView({ margin: '-80px' });
  const [ctaRef, ctaInView] = useInView({ margin: '-80px' });

  const theme = useMemo(() => (isDark ? themes.dark : themes.light), [isDark]);

  const products = useMemo(
    () => [
      {
        title: "Lion's Mane",
        bestFor: 'Focus & clarity',
        icon: Sparkles,
        points: [
          'Clean, beverage-ready integration',
          'Consistent dispersion and dosing',
          'Designed for modern functional formats'
        ]
      },
      {
        title: 'Reishi',
        bestFor: 'Calm & balance',
        icon: Leaf,
        points: [
          'Stable formulation performance',
          'Smooth, consistent sensory profile',
          'Ideal for daily wellness beverages'
        ]
      },
      {
        title: 'Cordyceps',
        bestFor: 'Performance & energy',
        icon: Dumbbell,
        points: [
          'Efficient delivery in RTDs and shots',
          'Uniform distribution across servings',
          'Built for scalable production'
        ]
      }
    ],
    []
  );

  const benefits = useMemo(
    () => [
      {
        title: 'Faster absorption pathways',
        description: 'Nanoemulsification helps enable faster uptake and more consistent consumer experience.',
        icon: Droplets
      },
      {
        title: 'Formulation-friendly',
        description: 'Designed to integrate smoothly in water-based formulations with consistent dispersion.',
        icon: Beaker
      },
      {
        title: 'Production-ready stability',
        description: 'Optimized for reliable batch-to-batch performance and scalable manufacturing workflows.',
        icon: ShieldCheck
      }
    ],
    []
  );

  return (
    <div className={`min-h-screen ${theme.text} overflow-x-hidden transition-colors duration-500`}>
      <Helmet>
        <title>Nano Mushroom Extracts | Nanoemulsified Functional Mushrooms — EnjoyNano</title>
        <meta name="description" content="Nanoemulsified functional mushroom extracts for maximum bioavailability. Lion's Mane, Reishi, Cordyceps and more — powered by nano-emulsification technology." />
        <link rel="canonical" href="https://enjoynano.com/mushrooms" />
        <meta property="og:title" content="Nano Mushroom Extracts — Nanoemulsified Functional Mushrooms" />
        <meta property="og:description" content="Nanoemulsified functional mushroom extracts: Lion's Mane, Reishi, Cordyceps with maximum bioavailability." />
        <meta property="og:url" content="https://enjoynano.com/mushrooms" />
      </Helmet>

      <nav
        className={`animate-slide-down fixed top-0 left-0 right-0 z-50 ${theme.bgNav} border-b ${theme.border}/50 transition-colors duration-500`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 interactive-btn hover-scale-xs">
            <Link to="/" className="flex items-center gap-3">
              <img src={theme.logo} alt="Cannasol Technologies Logo" className="h-10 w-auto" />
              <div className="hidden sm:block">
                <span className={`font-semibold text-lg ${theme.text}`}>Cannasol</span>
                <span className={`${theme.textSecondary} text-sm ml-1`}>Technologies</span>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm">
            {[
              { to: '/', label: 'Nano Kava' },
              { href: '#offerings', label: 'Products' },
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
                  <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
                  <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out blur-sm" />
                </div>
              );
            })}

            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors interactive-btn hover-scale active-press-sm`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="interactive-btn hover-scale-sm active-press-sm">
              <Link
                to="/contact"
                className={`btn-shine inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${theme.accent} text-slate-900 font-semibold rounded-full`}
              >
                Contact Sales
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
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
                { to: '/', label: 'Nano Kava' },
                { href: '#offerings', label: 'Products' },
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
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact Sales
              </Link>
              <a
                href="tel:+12169212240"
                onClick={() => trackPhoneConversion()}
                className="flex items-center justify-center gap-2 text-emerald-400 py-2"
              >
                <Phone className="w-4 h-4" />
                <span className="font-medium">Call: (216) 921-2240</span>
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className={`absolute inset-0 ${theme.bgHero} transition-colors duration-500`} />
            <div className="absolute -top-24 left-1/3 w-[520px] h-[520px] bg-emerald-500/10 blur-[120px]" />
            <div className="absolute -bottom-24 right-1/3 w-[520px] h-[520px] bg-teal-500/10 blur-[120px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-20">
            <div className="max-w-3xl">
              <div
                className={`animate-fade-in-up anim-delay-100 inline-flex items-center gap-2 px-4 py-2 ${theme.bgBadge} rounded-full border ${theme.borderCard}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className={`text-sm ${theme.textSecondary}`}>Cannasol Technologies Ingredient Platform</span>
              </div>

              <h1
                className="animate-fade-in-up anim-delay-200 text-4xl md:text-6xl font-bold mt-6 leading-tight"
              >
                <span className={`bg-gradient-to-r ${theme.heroGradient} bg-clip-text text-transparent`}>
                  Nanoemulsified
                </span>{' '}
                Functional Mushrooms
              </h1>

              <p
                className={`animate-fade-in-up anim-delay-300 text-lg md:text-xl ${theme.textSecondary} mt-6 leading-relaxed`}
              >
                Premium nanoemulsified mushroom ingredients engineered for fast uptake pathways, consistent dosing, and smooth integration into modern functional beverages.
              </p>

              <div className="animate-fade-in-up anim-delay-400 mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/contact"
                  className={`btn-shine inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r ${theme.accent} text-slate-900 font-semibold rounded-xl`}
                >
                  Request Samples
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <a
                  href="#offerings"
                  className={`btn-shine inline-flex items-center justify-center gap-2 px-6 py-3 ${theme.bgButton} border ${theme.borderCard} rounded-xl ${theme.text} hover:opacity-90 transition-opacity`}
                >
                  View Offerings
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="offerings" className="max-w-7xl mx-auto px-6 py-20">
          <div ref={offeringsRef} className={offeringsInView ? 'scroll-visible' : 'scroll-hidden'}>
            <div className={`${theme.bgCard} border ${theme.borderCard} rounded-3xl p-8 md:p-10 mb-10 ${theme.shadowCard}`}>
              <h2 className="text-3xl md:text-4xl font-bold">
                Three flagship nanoemulsified offerings
              </h2>
              <p className={`mt-4 text-lg ${theme.textSecondary} max-w-3xl`}>
                Built for B2B formulation teams that need consistency, clean sensory profiles, and predictable performance across production runs.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mt-10">
              {products.map((p, i) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.title}
                    className={`${theme.bgCard} border ${theme.borderCard} rounded-3xl p-8 transition-colors duration-500`}
                    style={{ transitionDelay: offeringsInView ? `${(i + 1) * 80}ms` : '0ms' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className={`text-2xl font-bold ${theme.text}`}>{p.title}</h3>
                        <p className={`mt-1 ${theme.textSecondary}`}>Best for: <span className="font-medium">{p.bestFor}</span></p>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl ${theme.bgIconBox} flex items-center justify-center`}
                      >
                        <Icon className="w-6 h-6 text-emerald-400" />
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      {p.points.map((t) => (
                        <div key={t} className="flex items-start gap-3">
                          <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                          <p className={`${theme.textSecondary} leading-relaxed`}>{t}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8">
                      <Link to="/contact" className={`${theme.accentText} font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity`}>
                        Talk formulation
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className={`${theme.bgSecondary} transition-colors duration-500`}>
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div ref={benefitsRef} className={benefitsInView ? 'scroll-visible' : 'scroll-hidden'}>
              <h2 className="text-3xl md:text-4xl font-bold">
                Why nanoemulsification for mushrooms
              </h2>
              <p className={`mt-4 text-lg ${theme.textSecondary} max-w-3xl`}>
                A delivery-first approach that supports fast uptake pathways, consistent dispersion, and formulation workflows that scale.
              </p>

              <div className="grid md:grid-cols-3 gap-6 mt-10">
                {benefits.map((b, i) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={b.title}
                      className={`${theme.bgCardSolid} border ${theme.borderCard} rounded-3xl p-8 ${theme.shadowCard} transition-colors duration-500`}
                      style={{ transitionDelay: benefitsInView ? `${(i + 1) * 80}ms` : '0ms' }}
                    >
                      <div className={`w-12 h-12 rounded-2xl ${theme.bgIconBox} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className={`mt-5 text-xl font-bold ${theme.text}`}>{b.title}</h3>
                      <p className={`mt-2 ${theme.textSecondary} leading-relaxed`}>{b.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-20">
          <div
            ref={ctaRef}
            className={`${theme.bgCardStats} border ${theme.borderCta} rounded-[2.5rem] p-10 md:p-14 overflow-hidden relative ${ctaInView ? 'scroll-visible' : 'scroll-hidden'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className={`${theme.textSecondary} font-medium`}>Ready to formulate?</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold mt-4">
                Request samples and build your next flagship SKU
              </h2>

              <p className={`mt-4 text-lg ${theme.textSecondary} max-w-3xl`}>
                We'll help you evaluate performance, dial in target dose, and package a premium mushrooms experience for your customers.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/contact"
                  className={`btn-shine inline-flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-xl text-lg`}
                >
                  Contact Sales
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <a
                  href="tel:+12169212240"
                  onClick={() => trackPhoneConversion()}
                  className={`btn-shine inline-flex items-center justify-center gap-2 px-7 py-3 ${theme.bgButton} border ${theme.borderCard} rounded-xl ${theme.text} hover:opacity-90 transition-opacity`}
                >
                  Call: (216) 921-2240
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={`border-t ${theme.border}/50 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={theme.logo} alt="Cannasol Technologies Logo" className="h-8 w-auto" loading="lazy" />
            <div>
              <div className={`font-semibold ${theme.text}`}>Cannasol Technologies</div>
              <div className={`text-sm ${theme.textMuted}`}>Nanoemulsified ingredients for modern functional products</div>
            </div>
          </div>

          <div className={`flex gap-6 text-sm ${theme.textMuted}`}>
            <Link to="/" className={`hover:${theme.text} transition-colors`}>Nano Kava</Link>
            <Link to="/faq" className={`hover:${theme.text} transition-colors`}>FAQ</Link>
            <Link to="/contact" className={`hover:${theme.text} transition-colors`}>Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default MushroomsLandingPage;
