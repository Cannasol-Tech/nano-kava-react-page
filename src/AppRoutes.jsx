import React from 'react';
import { Routes, Route } from 'react-router-dom';
import KavaLandingPage from './components/KavaLandingPage';
import FAQPage from './components/FAQPage';
import ContactPage from './components/ContactPage';
import MushroomsLandingPage from './components/MushroomsLandingPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<KavaLandingPage />} />
      <Route path="/mushrooms" element={<MushroomsLandingPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/contact" element={<ContactPage />} />
    </Routes>
  );
}

export default AppRoutes;
