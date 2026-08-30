import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initWebVitals } from './utils/webVitals';
import { markBrowser } from './utils/browser';

// Stamps html[data-safari] before first paint, so the motion gates apply on the first frame.
markBrowser();

// Mount over the prerendered markup rather than hydrating it. The snapshot written by
// scripts/prerender.mjs is a serialised DOM, not a React server render: the browser
// normalises inline styles (react-hot-toast's top/left/right/bottom becomes `inset`) and
// effect-driven state is already applied, so hydrateRoot always mismatched (React #418 ->
// #423) and re-rendered the whole root anyway. Mounting skips that wasted pass. The
// snapshot still earns its keep: crawlers get real content and users get a painted page
// before the bundle finishes executing. See CLAUDE.md § Prerendering.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

initWebVitals();
