'use client';

import { motion } from 'framer-motion';
import { Droplets, Beaker, ShieldCheck } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const statsCallouts = [
  { value: 'Nanoscale', label: 'Ultra-small particle delivery' },
  { value: 'Zero haze', label: 'Crystal-clear formulations' },
  { value: 'Scale-up', label: 'Pilot batch to commercial' },
];

const benefits = [
  {
    title: 'Faster absorption pathways',
    description:
      'Nano-scale particle size enables faster uptake vs. standard mushroom extracts — giving your consumers a more consistent, noticeable experience with every serving.',
    icon: Droplets,
  },
  {
    title: 'Formulation-friendly by design',
    description:
      'Integrates cleanly into water-based formulations with zero cloudiness, zero separation, and consistent dispersion — so your product looks as premium as it performs.',
    icon: Beaker,
  },
  {
    title: 'Production-ready stability',
    description:
      'Engineered for reliable batch-to-batch performance and scalable manufacturing — from a 10-liter pilot run to a 10,000-liter commercial order.',
    icon: ShieldCheck,
  },
];

export default function BenefitsSection() {
  const { isDark } = useTheme();

  return (
    <section
      id="benefits"
      className={`section-divider-top relative transition-colors duration-500 ${
        isDark ? 'bg-slate-900/50' : 'bg-slate-50'
      }`}
      aria-label="Why Nanoemulsification for Mushrooms"
    >
      <div className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          {/* Stats callout row */}
          <motion.div
            variants={fadeInUp}
            className="grid grid-cols-3 gap-4 mb-16"
          >
            {statsCallouts.map(({ value, label }) => (
              <div
                key={value}
                className={`rounded-2xl px-6 py-5 text-center border ${
                  isDark
                    ? 'bg-gradient-to-br from-emerald-500/8 to-teal-500/8 border-emerald-500/20'
                    : 'bg-white border-emerald-200 shadow-sm'
                }`}
              >
                <div className="text-lg md:text-xl font-black bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  {value}
                </div>
                <div
                  className={`text-xs mt-1 font-medium ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {label}
                </div>
              </div>
            ))}
          </motion.div>

          <motion.p
            variants={fadeInUp}
            className={`text-sm font-semibold uppercase tracking-widest ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}
          >
            The Technology Advantage
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className={`text-3xl md:text-4xl font-black mt-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            Why nanoemulsification{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              changes everything
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className={`mt-4 text-lg max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          >
            A delivery-first approach that solves the real problems in mushroom formulation —
            absorption, clarity, and shelf stability — so your product wins on the shelf and
            in the consumer&apos;s body.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  variants={fadeInUp}
                  whileHover={{ y: -6, transition: { duration: 0.22 } }}
                  className={`rounded-3xl p-8 border transition-colors duration-300 ${
                    isDark
                      ? 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50 hover:border-slate-600/60'
                      : 'bg-white border-slate-200 shadow-md shadow-slate-100/80 hover:border-emerald-300/50'
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.12, rotate: -8 }}
                    transition={{ duration: 0.25 }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      isDark
                        ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                        : 'bg-emerald-100'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </motion.div>
                  <h3
                    className={`mt-5 text-xl font-bold ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {benefit.title}
                  </h3>
                  <p
                    className={`mt-2 leading-relaxed text-sm ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
