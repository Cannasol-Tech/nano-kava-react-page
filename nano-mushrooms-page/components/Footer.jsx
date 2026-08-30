'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function Footer() {
  const { isDark } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`relative transition-colors duration-500 ${
        isDark ? 'bg-slate-950 border-slate-800/50' : 'bg-slate-50 border-slate-200/60'
      } border-t`}
      aria-label="Site footer"
    >
      {/* Decorative top gradient accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent pointer-events-none"
        aria-hidden="true"
      />

      {/* Main footer row */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-8 flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
        {/* Brand block */}
        <div className="flex items-center gap-3">
          <Image
            src={isDark ? '/cannasol-logoW.png' : '/cannasol-logo.png'}
            alt="Cannasol Technologies Logo"
            width={120}
            height={36}
            className="h-8 w-auto"
          />
          <div>
            <div
              className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              Cannasol Technologies
            </div>
            <div
              className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}
            >
              Nano-emulsified ingredients for modern functional products
            </div>
          </div>
        </div>

        {/* Nav links + drinkbrez external */}
        <div className="flex flex-col sm:flex-row gap-8">
          <nav
            className={`flex gap-5 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}
            aria-label="Footer navigation"
          >
            <Link href="/" className="hover:text-emerald-400 transition-colors">
              Home
            </Link>
            <Link href="/contact" className="hover:text-emerald-400 transition-colors">
              Contact
            </Link>
            <a
              href="https://kava.cannasoltechnologies.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              Nano Kava
            </a>
            <a
              href="https://cannasoltechnologies.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors"
            >
              About
            </a>
          </nav>

          {/* drinkbrez.com feature link */}
          <a
            href="https://drinkbrez.com"
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-colors ${
              isDark
                ? 'text-emerald-400/80 hover:text-emerald-300'
                : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            drinkbrez.com
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className={`border-t px-6 py-4 text-center text-xs ${
          isDark
            ? 'border-slate-800/50 text-slate-600'
            : 'border-slate-200/50 text-slate-400'
        }`}
      >
        <p>
          &copy; {currentYear} Cannasol Technologies. All rights reserved. &mdash; World&apos;s
          first nano emulsified Reishi mushroom supplier.
        </p>
      </div>
    </footer>
  );
}
