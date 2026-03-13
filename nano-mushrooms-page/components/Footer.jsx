'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from './ThemeProvider';

export default function Footer() {
  const { isDark } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`border-t transition-colors duration-500 ${
        isDark ? 'border-slate-800/50' : 'border-slate-200/50'
      }`}
      aria-label="Site footer"
    >
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src={isDark ? '/cannasol-logo.png' : '/cannasol-logoW.png'}
            alt="Cannasol Technologies Logo"
            width={120}
            height={36}
            className="h-8 w-auto"
          />
          <div>
            <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Cannasol Technologies
            </div>
            <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              Nanoemulsified ingredients for modern functional products
            </div>
          </div>
        </div>

        <nav
          className={`flex gap-6 text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}
          aria-label="Footer navigation"
        >
          <Link
            href="/"
            className={`hover:text-emerald-400 transition-colors`}
          >
            Home
          </Link>
          <Link
            href="/contact"
            className={`hover:text-emerald-400 transition-colors`}
          >
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
      </div>

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
