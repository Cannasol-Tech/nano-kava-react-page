'use client';

import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export default function HeroSection() {
  const { isDark } = useTheme();

  return (
    <section
      className="relative overflow-hidden"
      aria-label="Hero — Nano Emulsified Functional Mushrooms"
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            isDark
              ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950'
              : 'bg-gradient-to-b from-white via-slate-50 to-white'
          }`}
        />
        <div className="absolute -top-24 left-1/3 w-[520px] h-[520px] bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-24 right-1/3 w-[520px] h-[520px] bg-teal-500/10 blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-3xl"
        >
          {/* Live badge */}
          <motion.div
            variants={fadeInUp}
            className={`inline-flex items-center gap-2 px-4 py-2 backdrop-blur rounded-full border ${
              isDark
                ? 'bg-slate-800/60 border-slate-700/50'
                : 'bg-white/80 border-slate-200'
            }`}
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Cannasol Technologies Ingredient Platform
            </span>
          </motion.div>

          {/* Main heading — h1 for SEO */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl md:text-6xl font-bold mt-6 leading-tight"
          >
            <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              Nanoemulsified
            </span>{' '}
            <span className={isDark ? 'text-white' : 'text-slate-900'}>
              Functional Mushrooms
            </span>
          </motion.h1>

          {/* Subheading with keyword-rich copy */}
          <motion.p
            variants={fadeInUp}
            className={`text-lg md:text-xl mt-6 leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Premium nano emulsified mushroom ingredients — Lion&apos;s Mane, Reishi, and Cordyceps
            — engineered for fast uptake pathways, consistent dosing, and smooth integration into
            modern functional beverages. The same proprietary technology behind{' '}
            <a
              href="https://drinkbrez.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
            >
              drinkbrez.com
            </a>
            , now available at scale.
          </motion.p>

          {/* Pioneering claim badge */}
          <motion.div
            variants={fadeInUp}
            className={`mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
              isDark
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-emerald-100 border border-emerald-200 text-emerald-700'
            }`}
          >
            <span aria-hidden="true">🌍</span>
            <span>
              World&apos;s first company to nano emulsify Reishi mushrooms
            </span>
          </motion.div>

          {/* CTAs */}
          <motion.div variants={fadeInUp} className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              Request Samples
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#offerings"
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 border rounded-xl transition-opacity hover:opacity-90 ${
                isDark
                  ? 'bg-slate-700/50 border-slate-700/50 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-900'
              }`}
            >
              View Offerings
              <ArrowRight className="w-4 h-4" />
            </a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
