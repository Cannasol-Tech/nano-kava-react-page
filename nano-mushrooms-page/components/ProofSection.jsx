'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle, ExternalLink } from 'lucide-react';
import { useTheme } from './ThemeProvider';

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const proofPoints = [
  'First commercial deployment of nano Reishi at scale',
  'Proven shelf stability across temperature conditions',
  'Consistent batch-to-batch performance in production',
  'Zero separation and crystal-clear formulations',
];

export default function ProofSection() {
  const { isDark } = useTheme();

  return (
    <section
      className={`relative overflow-hidden transition-colors duration-500 ${
        isDark ? 'bg-slate-900/60' : 'bg-emerald-50/50'
      }`}
      aria-label="Technology Proven at Commercial Scale"
    >
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 700,
            height: 500,
            left: '30%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            background:
              'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16"
        >
          {/* ── Left: copy ── */}
          <div className="flex-1 min-w-0">
            <motion.p
              variants={fadeInUp}
              className={`text-sm font-semibold uppercase tracking-widest ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            >
              Real-World Proof
            </motion.p>

            <motion.h2
              variants={fadeInUp}
              className={`text-3xl md:text-4xl font-black leading-tight mt-3 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              This isn&apos;t lab tech.{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                It&apos;s commercial reality.
              </span>
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className={`mt-5 text-lg leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Cannasol&apos;s nano emulsification technology was exclusively deployed through{' '}
              <a
                href="https://drinkbrez.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`font-bold underline underline-offset-2 decoration-2 decoration-emerald-400/60 hover:decoration-emerald-400 transition-colors ${
                  isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600'
                }`}
              >
                drinkbrez.com
              </a>{' '}
              before being made available to the market. Every formulation challenge you can
              imagine — shelf life, sensory, dispersion — has already been solved at scale.
            </motion.p>

            <motion.ul variants={stagger} className="mt-7 space-y-3" role="list">
              {proofPoints.map((point) => (
                <motion.li key={point} variants={fadeInUp} className="flex items-center gap-3">
                  <CheckCircle
                    className="w-5 h-5 text-emerald-500 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    className={`text-sm font-medium ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    {point}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* ── Right: drinkbrez.com showcase card ── */}
          <motion.div variants={fadeInUp} className="w-full lg:w-[380px] flex-shrink-0">
            <div
              className={`relative rounded-3xl p-10 border overflow-hidden text-center ${
                isDark
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/90 border-emerald-500/20'
                  : 'bg-white border-emerald-200 shadow-xl shadow-emerald-100/50'
              }`}
            >
              {/* Inner glow */}
              <div
                className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              <div
                className={`relative text-xs font-bold uppercase tracking-widest mb-3 ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Technology first deployed at
              </div>

              {/* Big drinkbrez.com link */}
              <motion.a
                href="https://drinkbrez.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.97 }}
                className={`relative inline-flex items-center gap-2 text-3xl font-black transition-colors group ${
                  isDark
                    ? 'text-white hover:text-emerald-400'
                    : 'text-slate-900 hover:text-emerald-600'
                }`}
                aria-label="Visit drinkbrez.com — opens in a new tab"
              >
                drinkbrez.com
                <ArrowUpRight
                  className="w-7 h-7 text-emerald-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                  aria-hidden="true"
                />
              </motion.a>

              <p
                className={`relative text-sm mt-4 leading-relaxed ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Real products. Real consumers. The exact same nano emulsification technology
                your brand can use today.
              </p>

              {/* CTA button */}
              <motion.a
                href="https://drinkbrez.com"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="relative mt-7 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-bold rounded-xl text-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-shadow"
              >
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                Visit drinkbrez.com
              </motion.a>

              {/* Exclusive badge */}
              <div
                className={`relative mt-6 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  isDark
                    ? 'bg-slate-700/60 text-slate-400 border border-slate-600/50'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
                  aria-hidden="true"
                />
                Exclusive technology partner
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
