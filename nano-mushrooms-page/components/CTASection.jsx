'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
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

export default function CTASection() {
  const { isDark } = useTheme();

  return (
    <section className="max-w-7xl mx-auto px-6 py-20" aria-label="Request Samples CTA">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className={`rounded-[2.5rem] p-10 md:p-14 overflow-hidden relative border ${
          isDark
            ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-emerald-500/20'
            : 'bg-white border-emerald-200 shadow-xl shadow-slate-200/50'
        }`}
      >
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative">
          <motion.div variants={fadeInUp} className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <span className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Ready to formulate?
            </span>
          </motion.div>

          <motion.h2
            variants={fadeInUp}
            className={`text-3xl md:text-4xl font-bold mt-4 ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Request samples and build your next flagship SKU
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className={`mt-4 text-lg max-w-3xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          >
            We&apos;ll help you evaluate performance, dial in target dose, and package a premium
            nano emulsified mushroom experience for your customers — whether you&apos;re launching a
            new brand or scaling an existing one.
          </motion.p>

          <motion.div variants={fadeInUp} className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-bold rounded-xl text-lg hover:opacity-90 transition-opacity"
            >
              Contact Sales
              <ArrowRight className="w-5 h-5" />
            </Link>

            <a
              href="tel:+12169212240"
              className={`inline-flex items-center justify-center gap-2 px-7 py-3 border rounded-xl hover:opacity-90 transition-opacity ${
                isDark
                  ? 'bg-slate-700/50 border-slate-700/50 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-900'
              }`}
            >
              Call: (216) 921-2240
            </a>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
