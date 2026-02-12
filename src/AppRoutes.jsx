import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';

const KavaLandingPage = lazy(() => import('./components/KavaLandingPage'));
const FAQPage = lazy(() => import('./components/FAQPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const MushroomsLandingPage = lazy(() => import('./components/MushroomsLandingPage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Signal to the prerenderer that the page is fully rendered
function PrerenderReady() {
  useEffect(() => {
    // Delay to let react-helmet-async update <head> tags
    const id = setTimeout(() => {
      document.dispatchEvent(new Event('app-rendered'));
    }, 2000);
    return () => clearTimeout(id);
  }, []);
  return null;
}

function AppRoutes() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ScrollToTop />
      <PrerenderReady />
      <Routes>
        <Route path="/" element={<KavaLandingPage />} />
        <Route path="/mushrooms" element={<MushroomsLandingPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default AppRoutes;
