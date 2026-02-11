import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

const KavaLandingPage = lazy(() => import('./components/KavaLandingPage'));
const FAQPage = lazy(() => import('./components/FAQPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const MushroomsLandingPage = lazy(() => import('./components/MushroomsLandingPage'));
const NotFoundPage = lazy(() => import('./components/NotFoundPage'));

function AppRoutes() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
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
