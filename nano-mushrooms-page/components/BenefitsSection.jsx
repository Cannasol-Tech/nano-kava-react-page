'use client';

import { motion } from 'framer-motion';
import { Droplets, Beaker, ShieldCheck } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

const benefits = [
  {
    title: 'Faster absorption pathways',
    description:
      'Nanoemulsification reduces mushroom extract particle size to the nanometer scale, enabling faster uptake and a more consistent, predictable consumer experience.',
    icon: Droplets,
  },
  {
    title: 'Formulation-friendly design',
    description:
      'Designed to integrate smoothly into water-based formulations with consistent dispersion. No cloudiness, no separation — clean-label beverages ready for market.',
    icon: Beaker,
  },
  {
    title: 'Production-ready stability',
    description:
      'Optimized for reliable batch-to-batch performance and scalable manufacturing workflows — from startup brands to enterprise production volumes.',
    icon: ShieldCheck,
  },
];

export default function BenefitsSection() {
  const { isDark } = useTheme();

  return (
    <section
      className={`transition-colors duration-500 ${
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
          <motion.h2
            variants={fadeInUp}
            className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            Why nanoemulsification for mushrooms
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className={`mt-4 text-lg max-w-3xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
          >
            A delivery-first approach that supports fast uptake pathways, consistent dispersion, and
            formulation workflows that scale from pilot batches to full commercial production.
          </motion.p>

          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  variants={fadeInUp}
                  className={`rounded-3xl p-8 border transition-colors duration-500 ${
                    isDark
                      ? 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50'
                      : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      isDark
                        ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                        : 'bg-emerald-100'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3
                    className={`mt-5 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
                  >
                    {benefit.title}
                  </h3>
                  <p className={`mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
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
