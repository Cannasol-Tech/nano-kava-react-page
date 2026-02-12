import React, { useEffect } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import AppRoutes from './AppRoutes';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import NanoScene from './components/NanoScene';
import { trackPageView } from './utils/gtag';
import './index.css';

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
        <NanoScene isDark={isDark} />
      </div>
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
