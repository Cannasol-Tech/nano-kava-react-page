import React, { useEffect } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './AppRoutes';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import NanoScene from './components/NanoScene';
import { trackPageView } from './utils/gtag';
import './index.css';

// Canvas particle animation only runs smoothly on Chrome/Chromium.
// Detect once at module level so every render doesn't re-sniff.
const isChrome = typeof navigator !== 'undefined'
  && /chrome|chromium/i.test(navigator.userAgent)
  && !/edg/i.test(navigator.userAgent);

function AppContent() {
  const { isDark } = useTheme();
  const location = useLocation();

  useEffect(() => {
    // Delay so react-helmet-async updates document.title first
    const id = setTimeout(() => trackPageView(location.pathname, document.title), 0);
    return () => clearTimeout(id);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen">
      {/* Fixed background animation layer — behind all content */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className={`absolute inset-0 transition-colors duration-500 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`} />
        {isChrome && <NanoScene isDark={isDark} />}
      </div>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f1f5f9' : '#0f172a',
            border: isDark ? '1px solid rgba(52, 211, 153, 0.2)' : '1px solid rgba(52, 211, 153, 0.3)',
            boxShadow: isDark
              ? '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(52, 211, 153, 0.1)'
              : '0 10px 40px rgba(0, 0, 0, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: isDark ? '#1e293b' : '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: isDark ? '#1e293b' : '#ffffff',
            },
          },
        }}
      />
      {/* Page content */}
      <AppRoutes />
    </div>
  );
}

function App() {
  return (
    <HelmetProvider>
      <Router>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
