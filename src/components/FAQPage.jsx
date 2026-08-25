import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import JsonLd from '../seo/JsonLd';
import { faqSchema } from '../seo/structuredData';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { trackPhoneConversion } from '../utils/gtag';
import { 
  ChevronDown, 
  ArrowLeft, 
  Droplets, 
  Clock, 
  Beaker, 
  Shield,
  Truck,
  DollarSign,
  FlaskConical,
  MessageCircle,
  Sun,
  Moon
} from 'lucide-react';
import themesConfig from '../theme/themes';
import { useInView } from '../hooks/useInView';
import { faqCategories } from '../content/faq.js';

// Theme configuration - matches KavaLandingPage
const themes = themesConfig;

const CATEGORY_ICONS = {
  'product-technology': FlaskConical,
  'effects-dosing': Droplets,
  'formulation-applications': Beaker,
  'ordering-partnership': Truck,
  'quality-compliance': Shield,
};

/**
 * Renders a stored plain-string answer, promoting `linkPhrase` to a router Link.
 */
function AnswerBody({ answer, linkPhrase, linkTo }) {
  if (!linkPhrase) return answer;
  const [before, after] = answer.split(linkPhrase);
  return (
    <>
      {before}
      <Link to={linkTo} className="text-emerald-400 hover:text-emerald-300 transition-colors underline">{linkPhrase}</Link>
      {after}
    </>
  );
}

/**
 * FAQ Accordion Item Component
 */
function FAQItem({ question, answer, isOpen, onClick, theme }) {
  return (
    <div className={`border-b ${theme.borderCard}`}>
      <h3 className="m-0">
        <button
          onClick={onClick}
          className={`w-full py-5 px-6 flex items-center justify-between text-left ${theme.text} hover:${theme.accentText} transition-colors`}
        >
          <span className="font-medium pr-8">{question}</span>
          <div
            className="transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <ChevronDown className={`w-5 h-5 ${theme.textMuted}`} />
          </div>
        </button>
      </h3>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-300"
        style={{
          gridTemplateRows: isOpen ? '1fr' : '0fr',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="overflow-hidden">
          {/* faq-answer is the speakable selector in src/seo/structuredData.js. */}
          <p className={`faq-answer px-6 pb-5 ${theme.textSecondary} leading-relaxed`}>
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * FAQ Category Section Component
 */
function FAQCategory({ category, openItems, toggleItem, theme }) {
  const Icon = CATEGORY_ICONS[category.id];
  const [ref, isInView] = useInView();

  return (
    <div
      ref={ref}
      className={`mb-12 ${isInView ? 'scroll-visible' : 'scroll-hidden'}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${theme.accent} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-slate-900" />
        </div>
        <h2 className={`text-2xl font-bold ${theme.text}`}>{category.title}</h2>
      </div>
      
      <div className={`${theme.bgCard} rounded-2xl border ${theme.borderCard} overflow-hidden`}>
        {category.faqs.map((faq, index) => {
          const itemKey = `${category.title}-${index}`;
          return (
            <FAQItem
              key={itemKey}
              question={faq.question}
              answer={<AnswerBody {...faq} />}
              isOpen={openItems.includes(itemKey)}
              onClick={() => toggleItem(itemKey)}
              theme={theme}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Main FAQ Page Component
 */
export default function FAQPage() {
  const { isDark, setIsDark } = useTheme();
  const [openItems, setOpenItems] = useState([]);
  const [ctaRef, ctaInView] = useInView();
  
  const theme = isDark ? themes.dark : themes.light;
  
  const toggleItem = (itemKey) => {
    setOpenItems(prev => 
      prev.includes(itemKey) 
        ? prev.filter(key => key !== itemKey)
        : [...prev, itemKey]
    );
  };

  return (
    <div className={`min-h-screen ${theme.text} transition-colors duration-500`}>
      <Helmet>
        <title>Nano Kava FAQ | Kavalactone Questions Answered — EnjoyNano</title>
        <meta name="description" content="Frequently asked questions about nano kava, kavalactones, nano-emulsified kava technology, dosing, safety, and bioavailability benefits." />
        <link rel="canonical" href="https://enjoynano.com/faq" />
        <meta property="og:title" content="Nano Kava FAQ — Kavalactone Questions Answered" />
        <meta property="og:description" content="Get answers about nano kava, kavalactones, dosing, safety, and nano-emulsified kava benefits." />
        <meta property="og:url" content="https://enjoynano.com/faq" />
        <link rel="alternate" type="text/markdown" href="https://enjoynano.com/faq.md" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://enjoynano.com/og-image.png" />
        <meta name="twitter:image" content="https://enjoynano.com/og-image.png" />
      </Helmet>
      <JsonLd data={faqSchema} />

      {/* Navigation */}
      <nav
        className={`animate-slide-down fixed top-0 left-0 right-0 z-50 ${theme.bgNav} border-b ${theme.border}/50 transition-colors duration-500`}
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/"
              className={`flex items-center gap-2 ${theme.textSecondary} hover:${theme.text} transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            <div className="hidden sm:block w-px h-6 bg-slate-700" />
            <Link to="/" className="flex items-center gap-3">
              <img 
                src={theme.logo} 
                alt="Cannasol Technologies Logo" 
                className="h-10 w-auto"
              />
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors interactive-btn hover-scale active-press-sm`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <Link
              to="/contact"
              className={`btn-shine hidden sm:inline-flex px-5 py-2.5 bg-gradient-to-r ${theme.accent} text-slate-900 font-semibold rounded-full`}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in-up">
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${theme.text}`}>
              Frequently Asked
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Questions</span>
              <span className="sr-only"> — Nano Kava &amp; Kavalactones</span>
            </h1>
            <p className={`text-xl ${theme.textSecondary} max-w-2xl mx-auto`}>
              Everything you need to know about our nano Kava emulsion, formulation, ordering, and partnership opportunities.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ Content */}
      <div className="max-w-4xl mx-auto px-6 pb-24">
        {faqCategories.map((category, index) => (
          <FAQCategory
            key={category.title}
            category={category}
            openItems={openItems}
            toggleItem={toggleItem}
            theme={theme}
          />
        ))}
        
        {/* CTA Section */}
        <div
          ref={ctaRef}
          className={`mt-16 ${theme.bgCard} rounded-3xl border ${theme.borderCard} p-8 md:p-12 text-center ${ctaInView ? 'scroll-visible' : 'scroll-hidden'}`}
        >
          <div className={`w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r ${theme.accent} flex items-center justify-center`}>
            <MessageCircle className="w-8 h-8 text-slate-900" />
          </div>
          <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${theme.text}`}>
            Still Have Questions?
          </h2>
          <p className={`${theme.textSecondary} mb-8 max-w-xl mx-auto`}>
            Can't find what you're looking for? Josh is happy to answer any questions about our nano Kava, formulation support, or partnership opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/contact"
              className={`btn-shine inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-full text-lg`}
            >
              <MessageCircle className="w-5 h-5" />
              Contact Us
            </Link>
            <a
              href="tel:+12169212240"
              onClick={() => trackPhoneConversion()}
              className={`btn-shine inline-flex items-center justify-center gap-2 px-8 py-4 ${theme.bgCard} ${theme.text} font-semibold rounded-full text-lg border ${theme.borderCard}`}
            >
              Call: (216) 921-2240
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`border-t ${theme.border}/50 py-8`}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className={`${theme.textMuted} text-sm`}>
            © {new Date().getFullYear()} Cannasol Technologies. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
