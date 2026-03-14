'use client';

import { motion } from 'framer-motion';
import { Sparkles, Leaf, Zap, ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

const fadeInUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const products = [
  {
    title: "Lion's Mane",
    slug: 'lions-mane',
    bestFor: 'Focus & Cognitive Clarity',
    icon: Sparkles,
    worldFirst: false,
    description:
      "The world's first nano emulsified Lion's Mane — ultra-fine particles that integrate clean, clear, and fast into any functional format.",
    points: [
      'Crystal-clear beverage integration, zero haze',
      'Faster uptake than standard extracts',
      'Consistent dose in every serving',
    ],
    cta: "Request Lion's Mane Samples",
  },
  {
    title: 'Reishi',
    slug: 'reishi',
    bestFor: 'Calm, Balance & Daily Wellness',
    icon: Leaf,
    worldFirst: true,
    description: null, // rendered inline with drinkbrez.com link
    points: [
      'Stable across shelf life — no separation',
      'Smooth sensory profile, no bitter finish',
      'Ideal for RTDs, shots, and daily tonics',
    ],
    cta: 'Request Reishi Samples',
  },
  {
    title: 'Cordyceps',
    slug: 'cordyceps',
    bestFor: 'Performance & Energy',
    icon: Zap,
    worldFirst: false,
    description:
      'High-performance nano Cordyceps engineered for RTDs and energy shots — uniform distribution and reliable batch-to-batch yield.',
    points: [
      'Efficient delivery in RTDs and shots',
      'Uniform distribution across every serving',
      'Built for scalable commercial production',
    ],
    cta: 'Request Cordyceps Samples',
  },
];

export default function ProductsSection() {
  const { isDark } = useTheme();

  return (
    <section
      id="offerings"
      className="section-divider-top max-w-7xl mx-auto px-6 py-20"
      aria-label="Our Nano Emulsified Mushroom Offerings"
    >
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
      >
        <motion.p
          variants={fadeInUp}
          className={`text-sm font-semibold uppercase tracking-widest ${
            isDark ? 'text-emerald-400' : 'text-emerald-600'
          }`}
        >
          Three Flagship SKUs
        </motion.p>
        <motion.h2
          variants={fadeInUp}
          className={`text-3xl md:text-4xl font-black mt-2 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Choose your formula.{' '}
          <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            All three ship today.
          </span>
        </motion.h2>
        <motion.p
          variants={fadeInUp}
          className={`mt-4 text-lg max-w-2xl ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
        >
          Production-ready ingredients built for B2B formulation teams that demand consistency,
          clean sensory profiles, and predictable performance at scale.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {products.map((product) => {
            const Icon = product.icon;
            const isWorldFirst = product.worldFirst;

            return (
              <motion.article
                key={product.slug}
                variants={fadeInUp}
                whileHover={{ y: -10, transition: { duration: 0.25, ease: 'easeOut' } }}
                className={`rounded-3xl p-8 border transition-colors duration-300 cursor-default ${
                  isWorldFirst && isDark
                    ? 'glow-reishi bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-emerald-500/30'
                    : isDark
                    ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 hover:border-slate-600/70'
                    : 'bg-white border-slate-200 shadow-lg shadow-slate-200/50 hover:border-emerald-300/60 hover:shadow-emerald-100/40'
                }`}
                aria-label={`${product.title} nano emulsified mushroom — ${product.bestFor}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3
                      className={`text-2xl font-black ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {product.title}
                    </h3>
                    <p
                      className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}
                    >
                      Best for:{' '}
                      <span className="font-semibold">{product.bestFor}</span>
                    </p>
                    {isWorldFirst && (
                      <span
                        className={`inline-flex mt-2 items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isDark
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        🌍 World First
                      </span>
                    )}
                  </div>

                  {/* Icon box — spins slightly on card hover */}
                  <motion.div
                    whileHover={{ rotate: 15, scale: 1.1 }}
                    transition={{ duration: 0.25 }}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                      isDark
                        ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20'
                        : 'bg-emerald-100'
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="w-6 h-6 text-emerald-400" />
                  </motion.div>
                </div>

                {/* Description */}
                <p
                  className={`mt-5 text-sm leading-relaxed ${
                    isDark ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {isWorldFirst ? (
                    <>
                      World-first nano emulsified Reishi — pioneered by Cannasol Technologies and
                      proven at commercial scale through{' '}
                      <a
                        href="https://drinkbrez.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-0.5 font-semibold underline underline-offset-2 decoration-emerald-400/60 hover:decoration-emerald-400 transition-colors ${
                          isDark ? 'text-emerald-400' : 'text-emerald-600'
                        }`}
                      >
                        drinkbrez.com
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                      .
                    </>
                  ) : (
                    product.description
                  )}
                </p>

                {/* Bullet points */}
                <ul className="mt-6 space-y-2.5" role="list">
                  {product.points.map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <div
                        className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"
                        aria-hidden="true"
                      />
                      <p
                        className={`text-sm leading-relaxed ${
                          isDark ? 'text-slate-400' : 'text-slate-600'
                        }`}
                      >
                        {point}
                      </p>
                    </li>
                  ))}
                </ul>

                {/* Per-product CTA */}
                <div className="mt-8">
                  <motion.div whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                    <Link
                      href="/contact"
                      className={`inline-flex items-center gap-2 font-bold text-sm hover:opacity-80 transition-opacity ${
                        isWorldFirst
                          ? 'text-emerald-400'
                          : isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                      }`}
                      aria-label={`${product.cta}`}
                    >
                      {product.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
