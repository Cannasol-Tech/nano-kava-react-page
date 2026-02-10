import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import NanoScene from './components/NanoScene';
import './index.css';

function AppContent() {
  const { isDark } = useTheme();
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
    <Router>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Router>
  );
}

export default App;
