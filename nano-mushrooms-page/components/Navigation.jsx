'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from './ThemeProvider';

const navLinks = [
  { label: 'Offerings', href: '/#offerings' },
  { label: 'Technology', href: '/#benefits' },
  { label: 'Contact', href: '/contact' },
];

export default function Navigation() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-500 ${
        isDark
          ? 'bg-slate-950/85 border-emerald-900/30'
          : 'bg-white/95 border-slate-200/60'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
          aria-label="Cannasol Technologies — Nano Mushrooms home"
        >
          <Image
            src={isDark ? '/cannasol-logoW.png' : '/cannasol-logo.png'}
            alt="Cannasol Technologies Logo"
            width={120}
            height={36}
            className="h-9 w-auto"
            priority
          />
          <div className="hidden sm:flex flex-col leading-none">
            <span
              className={`text-sm font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Cannasol
            </span>
            <span
              className={`text-[10px] font-medium tracking-widest uppercase ${
                isDark ? 'text-emerald-400/80' : 'text-emerald-600'
              }`}
            >
              Technologies
            </span>
          </div>
        </Link>

        {/* Nav links — desktop */}
        <nav
          className="hidden md:flex items-center gap-1"
          aria-label="Primary navigation"
        >
          {navLinks.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${
              isDark
                ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.button>

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/contact"
              className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-bold rounded-full text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-shadow`}
            >
              Get Samples
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
}
