import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initWebVitals } from './utils/webVitals';

const root = document.getElementById('root');

if (root.hasChildNodes()) {
  // Pre-rendered HTML exists — hydrate to preserve it
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>);
} else {
  // Dev server or fallback — full client render
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
}

// Initialize Web Vitals monitoring (tracks CLS, FID, LCP, FCP, TTFB)
initWebVitals();
