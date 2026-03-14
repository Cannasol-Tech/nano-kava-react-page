'use client';

import { ThemeProvider } from './ThemeProvider';
import Navigation from './Navigation';
import HeroSection from './HeroSection';
import ProductsSection from './ProductsSection';
import ProofSection from './ProofSection';
import BenefitsSection from './BenefitsSection';
import CTASection from './CTASection';
import Footer from './Footer';

export default function MushroomsPage() {
  return (
    <ThemeProvider>
      <div className="min-h-screen overflow-x-hidden transition-colors duration-500 bg-white dark:bg-slate-950">
        <Navigation />
        <main className="pt-24">
          <HeroSection />
          <ProductsSection />
          <ProofSection />
          <BenefitsSection />
          <CTASection />
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
