import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Leaf, Sparkles, Sun, Moon, ArrowRight, Beaker, Droplets, ShieldCheck, Dumbbell, Phone, Menu, X } from 'lucide-react';

import themesConfig from '../theme/themes';

const themes = themesConfig;

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 }
  }
};

function MushroomsLandingPage() {
  const { isDark, setIsDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

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

      <motion.nav
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${theme.bgNav} border-b ${theme.border}/50 transition-colors duration-500`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div className="flex items-center gap-3" whileHover={{ scale: 1.02 }}>
            <Link to="/" className="flex items-center gap-3">
              <img src={theme.logo} alt="Cannasol Technologies Logo" className="h-10 w-auto" />
              <div className="hidden sm:block">
                <span className={`font-semibold text-lg ${theme.text}`}>Cannasol</span>
                <span className={`${theme.textSecondary} text-sm ml-1`}>Technologies</span>
              </div>
            </Link>
          </motion.div>

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

            <motion.button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>

            <motion.div whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/contact"
                className={`btn-shine inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${theme.accent} text-slate-900 font-semibold rounded-full`}
              >
                Contact Sales
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <motion.button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors`}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>

            <motion.button
              className={`flex items-center justify-center w-10 h-10 rounded-lg ${theme.toggleMenuBg} ${theme.toggleMenuBorder} border`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className={`w-5 h-5 ${theme.text}`} />
              ) : (
                <Menu className={`w-5 h-5 ${theme.text}`} />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <motion.div
          className="md:hidden overflow-hidden"
          initial={false}
          animate={{ height: mobileMenuOpen ? 'auto' : 0, opacity: mobileMenuOpen ? 1 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
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
                  className={`block ${theme.textSecondary} hover:text-emerald-400 font-medium py-2.5 px-3 rounded-lg hover:${isDark ? 'bg-slate-800/50' : 'bg-emerald-500/10'} transition-all duration-200 border-l-2 border-transparent hover:border-emerald-500`}
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
              className="flex items-center justify-center gap-2 text-emerald-400 py-2"
            >
              <Phone className="w-4 h-4" />
              <span className="font-medium">Call: (216) 921-2240</span>
            </a>
          </div>
        </motion.div>
      </motion.nav>

      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <div className={`absolute inset-0 ${theme.bgHero} transition-colors duration-500`} />
            <div className="absolute -top-24 left-1/3 w-[520px] h-[520px] bg-emerald-500/10 blur-[120px]" />
            <div className="absolute -bottom-24 right-1/3 w-[520px] h-[520px] bg-teal-500/10 blur-[120px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-6 py-20">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-3xl">
              <motion.div
                variants={fadeInUp}
                className={`inline-flex items-center gap-2 px-4 py-2 ${theme.bgBadge} backdrop-blur rounded-full border ${theme.borderCard}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className={`text-sm ${theme.textSecondary}`}>Cannasol Technologies Ingredient Platform</span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="text-4xl md:text-6xl font-bold mt-6 leading-tight"
              >
                <span className={`bg-gradient-to-r ${theme.heroGradient} bg-clip-text text-transparent`}>
                  Nanoemulsified
                </span>{' '}
                Functional Mushrooms
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className={`text-lg md:text-xl ${theme.textSecondary} mt-6 leading-relaxed`}
              >
                Premium nanoemulsified mushroom ingredients engineered for fast uptake pathways, consistent dosing, and smooth integration into modern functional beverages.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-10 flex flex-col sm:flex-row gap-4">
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
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section id="offerings" className="max-w-7xl mx-auto px-6 py-20">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
            <motion.div variants={fadeInUp} className={`${theme.bgCard} backdrop-blur-xl border ${theme.borderCard} rounded-3xl p-8 md:p-10 mb-10 ${theme.shadowCard}`}>
              <h2 className="text-3xl md:text-4xl font-bold">
                Three flagship nanoemulsified offerings
              </h2>
              <p className={`mt-4 text-lg ${theme.textSecondary} max-w-3xl`}>
                Built for B2B formulation teams that need consistency, clean sensory profiles, and predictable performance across production runs.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6 mt-10">
              {products.map((p) => {
                const Icon = p.icon;
                return (
                  <motion.div
                    key={p.title}
                    variants={fadeInUp}
                    className={`${theme.bgCard} border ${theme.borderCard} rounded-3xl p-8 transition-colors duration-500`}
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
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        <section className={`${theme.bgSecondary} backdrop-blur-xl transition-colors duration-500`}>
          <div className="max-w-7xl mx-auto px-6 py-20">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
              <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold">
                Why nanoemulsification for mushrooms
              </motion.h2>
              <motion.p variants={fadeInUp} className={`mt-4 text-lg ${theme.textSecondary} max-w-3xl`}>
                A delivery-first approach that supports fast uptake pathways, consistent dispersion, and formulation workflows that scale.
              </motion.p>

              <div className="grid md:grid-cols-3 gap-6 mt-10">
                {benefits.map((b) => {
                  const Icon = b.icon;
                  return (
                    <motion.div
                      key={b.title}
                      variants={fadeInUp}
                      className={`${theme.bgCardSolid} border ${theme.borderCard} rounded-3xl p-8 ${theme.shadowCard} transition-colors duration-500`}
                    >
                      <div className={`w-12 h-12 rounded-2xl ${theme.bgIconBox} flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className={`mt-5 text-xl font-bold ${theme.text}`}>{b.title}</h3>
                      <p className={`mt-2 ${theme.textSecondary} leading-relaxed`}>{b.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-20">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            variants={stagger}
            className={`${theme.bgCardStats} border ${theme.borderCta} rounded-[2.5rem] p-10 md:p-14 overflow-hidden relative`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10" />
            <div className="relative">
              <motion.div variants={fadeInUp} className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span className={`${theme.textSecondary} font-medium`}>Ready to formulate?</span>
              </motion.div>

              <motion.h2 variants={fadeInUp} className="text-3xl md:text-4xl font-bold mt-4">
                Request samples and build your next flagship SKU
              </motion.h2>

              <motion.p variants={fadeInUp} className={`mt-4 text-lg ${theme.textSecondary} max-w-3xl`}>
                We’ll help you evaluate performance, dial in target dose, and package a premium mushrooms experience for your customers.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/contact"
                  className={`btn-shine inline-flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-xl text-lg`}
                >
                  Contact Sales
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <a
                  href="tel:+12169212240"
                  className={`btn-shine inline-flex items-center justify-center gap-2 px-7 py-3 ${theme.bgButton} border ${theme.borderCard} rounded-xl ${theme.text} hover:opacity-90 transition-opacity`}
                >
                  Call: (216) 921-2240
                </a>
              </motion.div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className={`border-t ${theme.border}/50 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={theme.logo} alt="Cannasol Technologies Logo" className="h-8 w-auto" />
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
