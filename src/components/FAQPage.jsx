import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
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

// Theme configuration - matches KavaLandingPage
const themes = themesConfig;

// FAQ Data organized by category
const faqCategories = [
  {
    title: 'Product & Technology',
    icon: FlaskConical,
    faqs: [
      {
        question: 'What is nano Kava?',
        answer: 'Nano Kava is a nanoemulsified form of Kava extract where particles are reduced to approximately 18 nanometers in size. This is achieved through our proprietary NanoOptimizer™ surfactant system and ultrasonic processing technology. The ultra-small particle size dramatically increases bioavailability (up to 10x compared to traditional Kava) and reduces onset time to just 5 minutes.'
      },
      {
        question: 'What makes Cannasol\'s ~18nm particle size special?',
        answer: 'Our ~18nm particle size is the smallest in the industry—no competitor has achieved this. Smaller particles mean: (1) Faster absorption through cell membranes, (2) Higher bioavailability of kavalactones, (3) Crystal-clear formulations with no cloudiness, and (4) Better shelf stability with no separation. We achieve this through our partnership with QSonica, the #1 ultrasonic liquid processing equipment manufacturer.'
      },
      {
        question: 'How does nano Kava compare to traditional Kava extract?',
        answer: 'Traditional Kava extracts are hydrophobic (water-fearing), poorly absorbed, and take 30-45 minutes to feel effects. Only 10-15% of kavalactones are typically absorbed. Our nano Kava is water-soluble, absorbs in minutes, and delivers 80-90% kavalactone absorption. The result: faster onset, stronger effects at lower doses, and better-tasting products.'
      },
      {
        question: 'What is the NanoOptimizer™ surfactant system?',
        answer: 'NanoOptimizer™ is our proprietary blend of food-grade surfactants that encapsulate Kava particles, making them water-soluble and stable. This system prevents particle re-aggregation, ensures consistent dosing, and allows the nano Kava to remain suspended indefinitely without separation or settling.'
      }
    ]
  },

  {
    title: 'Effects & Dosing',
    icon: Droplets,
    faqs: [
      {
        question: 'How fast does nano Kava work?',
        answer: 'Most users report feeling effects within 5 minutes of consumption, compared to 30-45 minutes for traditional Kava. This rapid onset is due to the ultra-small particle size allowing for immediate absorption through the oral mucosa and GI tract.'
      },
      {
        question: 'What dosage should I use in my products?',
        answer: 'Dosing depends on your target effects and product format. We recommend starting with 50-100mg of kavalactones per serving for mild relaxation, 100-200mg for moderate effects, and 200-300mg for stronger effects. Because of the increased bioavailability, you may need less nano Kava than traditional extracts to achieve the same effects. We work directly with each client to dial in the perfect dosage for your specific product.'
      },
      {
        question: 'Is nano Kava safe?',
        answer: 'Kava has been consumed safely for thousands of years in Pacific Island cultures. Our nano Kava uses the same kavalactones, just in a more bioavailable form. We use only noble Kava varieties and test for purity and potency. As with any supplement, we recommend following standard Kava safety guidelines and consulting with regulatory experts for your specific market.'
      }
    ]
  },
  {
    title: 'Formulation & Applications',
    icon: Beaker,
    faqs: [
      {
        question: 'What products can I make with nano Kava?',
        answer: 'Our nano Kava is ideal for: Kava seltzers and sparkling beverages, functional shots and elixirs, RTD (ready-to-drink) relaxation beverages, wellness tonics, mocktails and alcohol alternatives—plus any water-based formulation where you need fast-acting, great-tasting Kava.'
      },
      {
        question: 'Will nano Kava make my beverage cloudy?',
        answer: 'No! One of the key benefits of our ~18nm particle size is crystal-clear formulations. Traditional Kava extracts create cloudy, unappealing beverages. Our nano Kava stays perfectly clear and stable, giving your products a premium, professional appearance.'
      },
      {
        question: 'Does nano Kava taste bitter like traditional Kava?',
        answer: 'Our nano Kava has a significantly reduced bitter taste compared to traditional extracts. Additionally, we offer bitter blocker bundles—proprietary flavor-masking ingredients that can virtually eliminate any remaining Kava taste. This allows you to create smooth, palatable products your customers will actually enjoy drinking.'
      },
      {
        question: 'How stable is nano Kava in beverages?',
        answer: 'Our nano Kava emulsion is highly stable with a shelf life of 12+ months when stored properly. The NanoOptimizer™ system prevents particle re-aggregation, so there\'s no separation, settling, or "ring around the bottle." Your products will look as good on day 365 as they did on day 1.'
      }
    ]
  },
  {
    title: 'Ordering & Partnership',
    icon: Truck,
    faqs: [
      {
        question: 'What is the minimum order quantity?',
        answer: (
          <>
            We work with brands of all sizes, from startups to established beverage companies. Minimum order quantities vary based on your needs. <Link to="/contact" className="text-emerald-400 hover:text-emerald-300 transition-colors underline">Contact us</Link> directly to discuss your specific requirements—we're flexible and want to help you succeed.
          </>
        )
      },
      {
        question: 'Can I get samples before ordering?',
        answer: 'Absolutely! We encourage all potential partners to test our nano Kava in their formulations before committing to an order. Contact us to request samples and we\'ll get them shipped to you promptly.'
      },
      {
        question: 'What\'s the process to get started?',
        answer: 'Getting started is simple: (1) Schedule a discovery call with Josh to discuss your product vision, (2) Receive samples to test in your formulations, (3) Work with us to refine your product and dial in the perfect dosage, (4) Place your order and scale production. Josh works directly with every client to ensure your success.'
      },
      {
        question: 'Do you offer white-label or private-label services?',
        answer: 'We primarily supply nano Kava as a bulk ingredient for your own branded products. We don\'t currently offer finished product manufacturing, but we can recommend trusted co-packers and formulators if needed.'
      }
    ]
  },
  {
    title: 'Quality & Compliance',
    icon: Shield,
    faqs: [
      {
        question: 'What quality certifications do you have?',
        answer: 'We maintain strict quality control standards and can provide Certificates of Analysis (COA) for all batches. Our facility follows GMP (Good Manufacturing Practice) guidelines. We test for potency, purity, heavy metals, and microbial contamination.'
      },
      {
        question: 'Is your Kava sourced from noble varieties?',
        answer: 'Yes, we exclusively use noble Kava varieties, which are the traditional, safe varieties that have been consumed for centuries. We never use tudei (two-day) Kava or other non-noble varieties that have been associated with adverse effects.'
      },
      {
        question: 'Can you provide documentation for regulatory compliance?',
        answer: 'Yes, we provide full documentation including COAs, specifications sheets, and safety data. We can work with your regulatory team to ensure you have everything needed for compliance in your target markets.'
      }
    ]
  }
];

/**
 * FAQ Accordion Item Component
 */
function FAQItem({ question, answer, isOpen, onClick, theme }) {
  return (
    <div className={`border-b ${theme.borderCard}`}>
      <button
        onClick={onClick}
        className={`w-full py-5 px-6 flex items-center justify-between text-left ${theme.text} hover:${theme.accentText} transition-colors`}
      >
        <span className="font-medium pr-8">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={`w-5 h-5 ${theme.textMuted}`} />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className={`px-6 pb-5 ${theme.textSecondary} leading-relaxed`}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * FAQ Category Section Component
 */
function FAQCategory({ category, openItems, toggleItem, theme }) {
  const Icon = category.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12"
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
              answer={faq.answer}
              isOpen={openItems.includes(itemKey)}
              onClick={() => toggleItem(itemKey)}
              theme={theme}
            />
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Main FAQ Page Component
 */
export default function FAQPage() {
  const { isDark, setIsDark } = useTheme();
  const [openItems, setOpenItems] = useState([]);
  
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
      {/* Navigation */}
      <motion.nav 
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${theme.bgNav} border-b ${theme.border}/50 transition-colors duration-500`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
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
            <motion.button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>
            
            <Link
              to="/contact"
              className={`hidden sm:inline-flex px-5 py-2.5 bg-gradient-to-r ${theme.accent} text-slate-900 font-semibold rounded-full`}
            >
              Contact Us
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${theme.text}`}>
              Frequently Asked
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Questions</span>
            </h1>
            <p className={`text-xl ${theme.textSecondary} max-w-2xl mx-auto`}>
              Everything you need to know about our nano Kava emulsion, formulation, ordering, and partnership opportunities.
            </p>
          </motion.div>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`mt-16 ${theme.bgCard} rounded-3xl border ${theme.borderCard} p-8 md:p-12 text-center`}
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
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-full text-lg`}
            >
              <MessageCircle className="w-5 h-5" />
              Contact Us
            </Link>
            <a
              href="tel:+12169212240"
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 ${theme.bgCard} ${theme.text} font-semibold rounded-full text-lg border ${theme.borderCard}`}
            >
              Call: (216) 921-2240
            </a>
          </div>
        </motion.div>
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
