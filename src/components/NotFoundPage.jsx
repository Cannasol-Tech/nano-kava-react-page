import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import themesConfig from '../theme/themes';

export default function NotFoundPage() {
  const { isDark } = useTheme();
  const theme = isDark ? themesConfig.dark : themesConfig.light;

  return (
    <div className={`min-h-screen flex items-center justify-center ${theme.text}`}>
      <Helmet>
        <title>Page Not Found — EnjoyNano</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="text-center px-6">
        <h1 className={`text-7xl md:text-9xl font-black bg-gradient-to-r ${theme.accentGradient} bg-clip-text text-transparent`}>
          404
        </h1>
        <p className={`mt-4 text-xl ${theme.textSecondary}`}>
          Page not found
        </p>
        <Link
          to="/"
          className={`mt-8 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${theme.accent} text-slate-900 font-semibold rounded-full`}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
