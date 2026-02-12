import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = document.getElementById('root');

if (root.hasChildNodes()) {
  // Pre-rendered HTML exists — hydrate to preserve it
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>);
} else {
  // Dev server or fallback — full client render
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
}
