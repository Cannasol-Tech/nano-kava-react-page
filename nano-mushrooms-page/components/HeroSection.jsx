'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

const fadeInUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.2 } },
};

const stats = [
  { value: '#1', label: 'Nano Reishi', sub: 'worldwide' },
  { value: '3', label: 'SKUs Ready', sub: 'ship today' },
  { value: '∞', label: 'Scale', sub: 'pilot → commercial' },
];

export default function HeroSection() {
  const { isDark } = useTheme();

  return (
    <section
      className="relative overflow-hidden min-h-[88vh] flex items-center"
      aria-label="Hero — Nano Emulsified Functional Mushrooms"
    >
      {/* ── Animated background ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className={`absolute inset-0 transition-colors duration-500 ${
            isDark
              ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
              : 'bg-gradient-to-br from-white via-slate-50 to-white'
          }`}
        />

        {/* Floating orb 1 — emerald, top-left */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 700,
            height: 700,
            left: '8%',
            top: '-18%',
            background:
              'radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 65%)',
          }}
          animate={{ y: [0, -55, 0], x: [0, 28, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating orb 2 — teal, right */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 550,
            height: 550,
            right: '4%',
            top: '25%',
            background:
              'radial-gradient(circle, rgba(20,184,166,0.11) 0%, transparent 65%)',
          }}
          animate={{ y: [0, 45, 0], x: [0, -30, 0], scale: [1, 0.88, 1] }}
          transition={{ duration: 17, delay: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Floating orb 3 — cyan, bottom-center */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 400,
            height: 400,
            left: '52%',
            bottom: '-8%',
            background:
              'radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 65%)',
          }}
          animate={{ y: [0, -32, 0], x: [0, 22, 0] }}
          transition={{ duration: 11, delay: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            opacity: isDark ? 0.024 : 0.035,
            backgroundImage:
              'linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative max-w-7xl mx-auto px-6 py-28 md:py-36">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-4xl"
        >
          {/* Platform badge */}
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
            <span
              className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
            >
              Cannasol Technologies — Ingredient Platform
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={fadeInUp}
            className="text-5xl md:text-7xl font-black leading-[1.04] tracking-tight mt-6"
          >
            <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
              Nano Mushrooms
            </span>
            <br />
            <span className={isDark ? 'text-white' : 'text-slate-900'}>
              That Actually Deliver.
            </span>
          </motion.h1>

          {/* Subheadline — drinkbrez.com as prominent hyperlink */}
          <motion.p
            variants={fadeInUp}
            className={`text-xl md:text-2xl mt-8 leading-relaxed max-w-2xl ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}
          >
            We were the first in the world to nano emulsify Reishi, Lion&apos;s Mane, and Cordyceps.
            Our technology powers{' '}
            <a
              href="https://drinkbrez.com"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-0.5 font-bold underline underline-offset-4 decoration-2 decoration-emerald-400/60 hover:decoration-emerald-400 transition-colors ${
                isDark
                  ? 'text-emerald-400 hover:text-emerald-300'
                  : 'text-emerald-600 hover:text-emerald-700'
              }`}
            >
              drinkbrez.com
              <ArrowUpRight className="w-[1em] h-[1em]" />
            </a>{' '}
            — now available to your brand.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col sm:flex-row gap-4"
          >
            {/* Primary CTA — pulsing rings */}
            <div className="relative inline-flex">
              {[0, 1].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 pointer-events-none"
                  animate={{ scale: [1, 1.38 + i * 0.22], opacity: [0.38 - i * 0.1, 0] }}
                  transition={{
                    duration: 2.3,
                    delay: i * 0.85,
                    repeat: Infinity,
                    ease: 'easeOut',
                  }}
                />
              ))}
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/contact"
                  className="relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-black rounded-xl text-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-shadow"
                >
                  Get Free Samples
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>

            {/* Secondary CTA — links to drinkbrez.com */}
            <motion.a
              href="https://drinkbrez.com"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 border rounded-xl font-semibold text-lg transition-colors ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700/60 text-white hover:border-emerald-500/50 hover:text-emerald-400'
                  : 'bg-slate-100 border-slate-300 text-slate-900 hover:border-emerald-400/50 hover:text-emerald-700'
              }`}
            >
              See It In Action
              <ArrowUpRight className="w-5 h-5" />
            </motion.a>
          </motion.div>

          {/* World-first badge */}
          <motion.div
            variants={fadeInUp}
            className={`mt-8 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border ${
              isDark
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            <span aria-hidden="true">🌍</span>
            World&apos;s first company to nano emulsify Reishi mushrooms
          </motion.div>

          {/* Stats row */}
          <motion.div
            variants={fadeInUp}
            className="mt-14 grid grid-cols-3 gap-3 sm:gap-5 max-w-sm"
          >
            {stats.map(({ value, label, sub }) => (
              <motion.div
                key={label}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={`rounded-2xl p-3 sm:p-4 text-center border transition-colors ${
                  isDark
                    ? 'bg-slate-800/40 border-slate-700/40 hover:border-emerald-500/40'
                    : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'
                }`}
              >
                <div className="text-xl sm:text-2xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  {value}
                </div>
                <div
                  className={`text-xs font-bold mt-1 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {label}
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                  {sub}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
