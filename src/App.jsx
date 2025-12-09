import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import KavaLandingPage from './components/KavaLandingPage';
import FAQPage from './components/FAQPage';
import ContactPage from './components/ContactPage';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<KavaLandingPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </Router>
  );
}

export default App;
