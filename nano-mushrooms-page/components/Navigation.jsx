'use client';

import { motion } from 'framer-motion';
import { Sun, Moon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from './ThemeProvider';

export default function Navigation() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-500 ${
        isDark
          ? 'bg-slate-950/80 border-slate-800/50'
          : 'bg-white/95 border-slate-200/50'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className={`flex items-center gap-3 transition-opacity hover:opacity-80 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
            aria-label="Cannasol Technologies — Nano Mushrooms home"
          >
            <Image
              src={isDark ? '/cannasol-logo.png' : '/cannasol-logoW.png'}
              alt="Cannasol Technologies Logo"
              width={120}
              height={36}
              className="h-9 w-auto"
              priority
            />
            <div className="hidden sm:block">
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Cannasol
              </span>
              <span className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Technologies
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${
              isDark
                ? 'bg-slate-800 text-yellow-400 hover:bg-slate-700'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.button>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-semibold rounded-full text-sm"
            >
              Contact Sales
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.nav>
  );
}
