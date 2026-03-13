'use client';

import { motion } from 'framer-motion';
import { Sparkles, Leaf, ArrowRight } from 'lucide-react';
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

const products = [
  {
    title: "Lion's Mane",
    slug: 'lions-mane',
    bestFor: 'Focus & clarity',
    icon: Sparkles,
    worldFirst: false,
    description:
      "Nanoemulsified Lion's Mane delivers fast uptake and clean beverage integration for focus-forward functional products.",
    points: [
      'Clean, beverage-ready integration',
      'Consistent dispersion and dosing',
      'Designed for modern functional formats',
    ],
  },
  {
    title: 'Reishi',
    slug: 'reishi',
    bestFor: 'Calm & balance',
    icon: Leaf,
    worldFirst: true,
    description:
      'World-first nano emulsified Reishi mushroom — pioneered by Cannasol Technologies and proven at scale through drinkbrez.com.',
    points: [
      'Stable formulation performance',
      'Smooth, consistent sensory profile',
      'Ideal for daily wellness beverages',
    ],
  },
  {
    title: 'Cordyceps',
    slug: 'cordyceps',
    bestFor: 'Performance & energy',
    icon: ArrowRight,
    worldFirst: false,
    description:
      'High-performance nanoemulsified Cordyceps optimized for RTDs and energy shots with reliable batch-to-batch consistency.',
    points: [
      'Efficient delivery in RTDs and shots',
      'Uniform distribution across servings',
      'Built for scalable production',
    ],
  },
];

export default function ProductsSection() {
  const { isDark } = useTheme();

  return (
    <section id="offerings" className="max-w-7xl mx-auto px-6 py-20" aria-label="Our Nano Emulsified Mushroom Offerings">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.h2
          variants={fadeInUp}
          className={`text-3xl md:text-4xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
        >
          Three flagship nanoemulsified offerings
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className={`mt-4 text-lg max-w-3xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          Built for B2B formulation teams that need consistency, clean sensory profiles, and
          predictable performance across production runs.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {products.map((product) => {
            const Icon = product.icon;
            return (
              <motion.article
                key={product.slug}
                variants={fadeInUp}
                className={`rounded-3xl p-8 border transition-colors duration-500 ${
                  isDark
                    ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50'
                    : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50'
                }`}
                aria-label={`${product.title} nano emulsified mushroom — ${product.bestFor}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {product.title}
                    </h3>
                    <p className={`mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Best for:{' '}
                      <span className="font-medium">{product.bestFor}</span>
                    </p>
                    {product.worldFirst && (
                      <span
                        className={`inline-flex mt-2 items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isDark
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        🌍 World First
                      </span>
                    )}
                  </div>
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isDark
                        ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                        : 'bg-emerald-100'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>

                <p className={`mt-4 text-sm leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {product.description}
                </p>

                <ul className="mt-6 space-y-3" role="list">
                  {product.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <div
                        className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {point}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <Link
                    href="/contact"
                    className={`inline-flex items-center gap-2 font-semibold hover:opacity-90 transition-opacity ${
                      isDark ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                    aria-label={`Talk formulation for ${product.title}`}
                  >
                    Talk formulation
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
