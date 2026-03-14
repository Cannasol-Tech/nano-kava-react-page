'use client';

import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Package, Phone } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};

const trustBadges = [
  { icon: Package, text: 'Free samples, no commitment' },
  { icon: CheckCircle, text: 'B2B-focused pricing & MOQs' },
  { icon: Phone, text: 'Same-day sales response' },
];

export default function CTASection() {
  const { isDark } = useTheme();

  return (
    <section className="max-w-7xl mx-auto px-6 py-20" aria-label="Request Samples CTA">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className={`rounded-[2.5rem] p-10 md:p-16 overflow-hidden relative border ${
          isDark
            ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-emerald-500/20'
            : 'bg-white border-emerald-200 shadow-2xl shadow-emerald-100/60'
        }`}
      >
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-emerald-500/8 via-teal-500/8 to-cyan-500/8 pointer-events-none"
          aria-hidden="true"
        />
        {/* Ambient corner glows */}
        <div
          className="absolute -top-20 -left-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-20 -right-20 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative max-w-2xl mx-auto text-center">
          <motion.p
            variants={fadeInUp}
            className={`text-sm font-bold uppercase tracking-widest ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}
          >
            Ready to formulate?
          </motion.p>

          <motion.h2
            variants={fadeInUp}
            className={`text-3xl md:text-5xl font-black mt-4 leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Your next great product
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              starts with one free sample.
            </span>
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className={`mt-6 text-lg leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Send us your formulation goals and we&apos;ll match you with the right SKU, dial in
            the target dose, and get samples in your hands — no commitment, no run minimums
            to start.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          >
            {/* Primary CTA — pulsing rings */}
            <div className="relative inline-flex justify-center">
              {[0, 1].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 pointer-events-none"
                  animate={{ scale: [1, 1.4 + i * 0.2], opacity: [0.35 - i * 0.1, 0] }}
                  transition={{
                    duration: 2.2,
                    delay: i * 0.8,
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
                  Get Free Samples Today
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
            </div>

            <motion.a
              href="tel:+12169212240"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 border rounded-xl font-semibold text-lg transition-colors ${
                isDark
                  ? 'bg-slate-700/50 border-slate-700/60 text-white hover:border-emerald-500/50 hover:text-emerald-400'
                  : 'bg-slate-100 border-slate-300 text-slate-900 hover:border-emerald-400/50'
              }`}
            >
              <Phone className="w-5 h-5" aria-hidden="true" />
              (216) 921-2240
            </motion.a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            variants={fadeInUp}
            className={`mt-10 flex flex-col sm:flex-row items-center justify-center gap-5 text-sm font-medium ${
              isDark ? 'text-slate-500' : 'text-slate-500'
            }`}
          >
            {trustBadges.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                <span>{text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
