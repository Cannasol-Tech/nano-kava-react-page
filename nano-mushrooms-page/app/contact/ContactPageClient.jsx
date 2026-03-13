'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeProvider, useTheme } from '../../components/ThemeProvider';
import Footer from '../../components/Footer';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

function ContactForm() {
  const { isDark, toggleTheme } = useTheme();
  const [status, setStatus] = useState('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    interest: '',
    message: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');

    try {
      const formEl = e.target;
      const data = new FormData(formEl);

      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString(),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
    isDark
      ? 'bg-slate-800/60 border-slate-700 text-white placeholder-slate-500'
      : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
  }`;

  const labelClass = `block text-sm font-medium mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`;

  return (
    <div
      className={`min-h-screen overflow-x-hidden transition-colors duration-500 ${
        isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      }`}
    >
      {/* Netlify form detection (hidden) */}
      <form name="mushrooms-contact" netlify="true" netlify-honeypot="bot-field" hidden>
        <input type="text" name="name" />
        <input type="email" name="email" />
        <input type="text" name="company" />
        <input type="tel" name="phone" />
        <input type="text" name="interest" />
        <textarea name="message" />
      </form>

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-500 ${
          isDark ? 'bg-slate-950/80 border-slate-800/50' : 'bg-white/95 border-slate-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className={`inline-flex items-center gap-2 text-sm font-medium transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <div className={`h-5 w-px ${isDark ? 'bg-slate-700/40' : 'bg-slate-300/40'}`} />
            <Link href="/" className="flex items-center gap-3">
              <Image
                src={isDark ? '/cannasol-logo.png' : '/cannasol-logoW.png'}
                alt="Cannasol Technologies Logo"
                width={120}
                height={36}
                className="h-9 w-auto"
                priority
              />
            </Link>
          </div>
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'bg-slate-800 text-yellow-400' : 'bg-slate-200 text-slate-700'
            }`}
            aria-label="Toggle theme"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </nav>

      <main className="pt-24 max-w-2xl mx-auto px-6 py-20">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.div
            variants={fadeInUp}
            className={`inline-flex items-center gap-2 px-4 py-2 backdrop-blur rounded-full border ${
              isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-white/80 border-slate-200'
            }`}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Contact Sales
            </span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className={`text-3xl md:text-4xl font-bold mt-6 ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Request samples or start a formulation conversation
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className={`mt-4 text-lg leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          >
            Tell us about your project and we&apos;ll help you evaluate our nano emulsified
            mushroom ingredients — Lion&apos;s Mane, Reishi, and Cordyceps — in your formulation.
          </motion.p>

          {status === 'success' ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-10 rounded-3xl p-8 border text-center ${
                isDark
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className={`mt-4 text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Message sent!
              </h2>
              <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Our team will be in touch within 1 business day.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                Back to home
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <motion.form
              variants={fadeInUp}
              name="mushrooms-contact"
              method="POST"
              data-netlify="true"
              data-netlify-honeypot="bot-field"
              onSubmit={handleSubmit}
              className="mt-10 space-y-6"
            >
              <input type="hidden" name="form-name" value="mushrooms-contact" />
              <input type="hidden" name="bot-field" />

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className={labelClass}>
                    Full name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    required
                    className={inputClass}
                    placeholder="Jane Smith"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>
                    Work email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    className={inputClass}
                    placeholder="jane@brand.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="company" className={labelClass}>
                    Company
                  </label>
                  <input
                    id="company"
                    type="text"
                    name="company"
                    className={inputClass}
                    placeholder="Functional Beverage Co."
                    value={formData.company}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    Phone number
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    className={inputClass}
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="interest" className={labelClass}>
                  Which mushroom ingredient(s) are you interested in?
                </label>
                <select
                  id="interest"
                  name="interest"
                  className={`${inputClass} cursor-pointer`}
                  value={formData.interest}
                  onChange={handleChange}
                >
                  <option value="">Select an option...</option>
                  <option value="lions-mane">{"Lion's Mane (Focus & Clarity)"}</option>
                  <option value="reishi">{"Reishi (Calm & Balance)"}</option>
                  <option value="cordyceps">{"Cordyceps (Performance & Energy)"}</option>
                  <option value="multiple">Multiple / Full Line</option>
                  <option value="not-sure">Not sure yet — need guidance</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className={labelClass}>
                  Tell us about your project
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  className={`${inputClass} resize-none`}
                  placeholder="Describe your formulation goals, product type, volume needs..."
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>

              {status === 'error' && (
                <p className="text-red-400 text-sm">
                  Something went wrong. Please try again or email us directly at{' '}
                  <a
                    href="mailto:info@cannasoltechnologies.com"
                    className="underline hover:text-red-300"
                  >
                    info@cannasoltechnologies.com
                  </a>
                  .
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full inline-flex items-center justify-center gap-2 px-7 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-bold rounded-xl text-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'sending' ? 'Sending...' : 'Send Message'}
                <Send className="w-5 h-5" />
              </button>
            </motion.form>
          )}

          <motion.div
            variants={fadeInUp}
            className={`mt-10 p-6 rounded-2xl border text-sm ${
              isDark
                ? 'bg-slate-800/40 border-slate-700/50 text-slate-400'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}
          >
            <p className="font-medium mb-2">Prefer to reach out directly?</p>
            <p>
              Call:{' '}
              <a
                href="tel:+12169212240"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                (216) 921-2240
              </a>
            </p>
            <p className="mt-1">
              Email:{' '}
              <a
                href="mailto:info@cannasoltechnologies.com"
                className="text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                info@cannasoltechnologies.com
              </a>
            </p>
          </motion.div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

export default function ContactPageClient() {
  return (
    <ThemeProvider>
      <ContactForm />
    </ThemeProvider>
  );
}
