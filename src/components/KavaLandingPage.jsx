import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { 
  Beaker, 
  Zap, 
  Shield, 
  TrendingUp, 
  Clock, 
  Droplets,
  Award,
  Phone,
  Mail,
  MapPin,
  Check,
  ArrowRight,
  Sparkles,
  Target,
  HeartHandshake,
  MessageCircle,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';
import NanoScene from './NanoScene';
import themesConfig from '../theme/themes';

// Theme configuration - Single source of truth for all colors
const themes = themesConfig;

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

// Animated counter component
function AnimatedCounter({ value, suffix = '', prefix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [count, setCount] = useState(0);
  
  React.useEffect(() => {
    if (isInView) {
      const numValue = parseInt(value.replace(/[^0-9]/g, ''));
      const duration = 2000;
      const steps = 60;
      const increment = numValue / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= numValue) {
          setCount(numValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      
      return () => clearInterval(timer);
    }
  }, [isInView, value]);
  
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

// Animated gradient orb for hero
function GlowOrb({ className = '', delay = 0 }) {
  return (
    <motion.div
      className={`absolute rounded-full ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );
}

// Animated line/grid background
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse at center, black 20%, transparent 70%)',
      }} />
    </div>
  );
}

// Section wrapper with scroll animation
function AnimatedSection({ children, className = '', id = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
    >
      {children}
    </motion.section>
  );
}

export default function KavaLandingPage() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', company: '', message: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  
  const theme = isDark ? themes.dark : themes.light;
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, 100]);

  const stats = [
    { value: '18', prefix: '~', suffix: 'nm', label: 'Particle Size', icon: Droplets },
    { value: '5', suffix: 'x', label: 'Bioavailability', icon: TrendingUp },
    { value: '5', suffix: ' min', label: 'Onset Time', icon: Clock }
  ];

  const features = [
    {
      icon: Beaker,
      title: "Enhanced Bioavailability",
      description: "The increased surface area of our ~18nm nanoemulsified kavalactones enables superior absorption in the gastrointestinal tract, delivering higher bioavailability and more potent effects at lower doses.",
      highlight: "Industry First"
    },
    {
      icon: Sparkles,
      title: "Improved Palatability",
      description: "Nanoemulsification eliminates the gritty texture and muddy appearance of traditional kava preparations, resulting in crystal-clear, visually appealing beverages your customers will love.",
      highlight: "Premium Clarity"
    },
    {
      icon: Zap,
      title: "Ease of Production",
      description: "Our nanoemulsified kava extracts integrate seamlessly into various beverage formulations—shots, soft drinks, and flavored water—making kava consumption more convenient and enjoyable.",
      highlight: "Versatile"
    },
    {
      icon: Target,
      title: "Precise Dosing",
      description: "With uniform distribution of kavalactones throughout the nanoemulsion, dosing becomes remarkably accurate—ensuring consistent, predictable effects in every serving.",
      highlight: "Consistent"
    },
    {
      icon: Shield,
      title: "Bitter Blocker Bundles",
      description: "We offer the best deals on bitter blockers in the industry. Create smooth, palatable Kava products your customers will actually enjoy drinking.",
      highlight: "Best Pricing"
    },
    {
      icon: HeartHandshake,
      title: "Direct Access to Josh",
      description: "CEO Josh works directly with every client, bringing insights from top Kratom and Kava brands. Your success is our success—we're partners, not just suppliers.",
      highlight: "Personal Support"
    }
  ];

  const process = [
    { step: '01', title: 'Discovery Call', description: 'Discuss your product vision with Josh directly' },
    { step: '02', title: 'Sample & Test', description: 'Get samples to test in your formulations' },
    { step: '03', title: 'Refine & Order', description: 'Dial in your product and place your order' },
    { step: '04', title: 'Scale Production', description: 'Launch with confidence and ongoing support' }
  ];

  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text} overflow-x-hidden transition-colors duration-500`}>
      {/* Navigation */}
      <motion.nav 
        className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl ${theme.bgNav} border-b ${theme.border}/50 transition-colors duration-500`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
          >
            {/* Cannasol Logo */}
            <img 
              src={theme.logo} 
              alt="Cannasol Technologies Logo" 
              className="h-10 w-auto"
            />
            <div className="hidden sm:block">
              <span className={`font-semibold text-lg ${theme.text}`}>Cannasol</span>
              <span className={`${theme.textSecondary} text-sm ml-1`}>Technologies</span>
            </div>
          </motion.div>
          
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#benefits" className={`${theme.textSecondary} hover:${theme.text} transition-colors`}>Benefits</a>
            <a href="#process" className={`${theme.textSecondary} hover:${theme.text} transition-colors`}>Process</a>
            <a href="#proof" className={`${theme.textSecondary} hover:${theme.text} transition-colors`}>Partners</a>
            <Link to="/mushrooms" className={`${theme.textSecondary} hover:${theme.text} transition-colors`}>Mushrooms</Link>
            <Link to="/faq" className={`${theme.textSecondary} hover:${theme.text} transition-colors`}>FAQ</Link>
            <Link to="/contact" className={`${theme.textSecondary} hover:${theme.text} transition-colors`}>Contact</Link>
            
            {/* Theme Toggle */}
            <motion.button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>
            
            <motion.a
              href="#contact"
              className={`px-5 py-2.5 bg-gradient-to-r ${theme.accent} text-slate-900 font-semibold rounded-full`}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started
            </motion.a>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Theme Toggle */}
            <motion.button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${theme.toggleBg} ${theme.toggleText} transition-colors`}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>
            
            <motion.button
              className={`flex items-center justify-center w-10 h-10 rounded-lg ${theme.toggleMenuBg} ${theme.toggleMenuBorder} border`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className={`w-5 h-5 ${theme.text}`} />
              ) : (
                <Menu className={`w-5 h-5 ${theme.text}`} />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <motion.div
          className="md:hidden overflow-hidden"
          initial={false}
          animate={{ 
            height: mobileMenuOpen ? 'auto' : 0,
            opacity: mobileMenuOpen ? 1 : 0
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={`px-6 py-4 border-t ${theme.border}/50 space-y-4`}>
            <a 
              href="#benefits" 
              className={`block ${theme.textSecondary} hover:${theme.text} transition-colors py-2`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Benefits
            </a>
            <a 
              href="#process" 
              className={`block ${theme.textSecondary} hover:${theme.text} transition-colors py-2`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Process
            </a>
            <a 
              href="#proof" 
              className={`block ${theme.textSecondary} hover:${theme.text} transition-colors py-2`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Partners
            </a>
            <Link 
              to="/mushrooms" 
              className={`block ${theme.textSecondary} hover:${theme.text} transition-colors py-2`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Mushrooms
            </Link>
            <Link 
              to="/faq" 
              className={`block ${theme.textSecondary} hover:${theme.text} transition-colors py-2`}
              onClick={() => setMobileMenuOpen(false)}
            >
              FAQ
            </Link>
            <Link 
              to="/contact" 
              className="block w-full text-center px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-semibold rounded-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact Us
            </Link>
            <a
              href="tel:+12169212240"
              className="flex items-center justify-center gap-2 text-emerald-400 py-2"
            >
              <Phone className="w-4 h-4" />
              <span className="font-medium">Call: (216) 921-2240</span>
            </a>
          </div>
        </motion.div>
      </motion.nav>

      {/* Hero Section */}
      <motion.header 
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden"
        style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
      >
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className={`absolute inset-0 ${theme.bgHero} transition-colors duration-500`} />
          {/* Gradient orbs */}
          <GlowOrb className={`top-1/4 left-1/4 w-[600px] h-[600px] ${theme.gradientOrbs.emerald} blur-[120px]`} delay={0} />
          <GlowOrb className={`bottom-1/4 right-1/4 w-[500px] h-[500px] ${theme.gradientOrbs.teal} blur-[100px]`} delay={1} />
          <GlowOrb className={`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] ${theme.gradientOrbs.cyan} blur-[80px]`} delay={2} />
          {/* Accent glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
          <GridBackground />
          <NanoScene isDark={isDark} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          {/* Backdrop for better text readability */}
          <div className="absolute inset-0 -mx-6 -my-20 bg-gradient-to-b from-transparent via-black/10 to-transparent backdrop-blur-[2px] pointer-events-none" style={isDark ? { opacity: 0.4 } : { opacity: 0.2 }} />
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`inline-flex items-center gap-2 px-4 py-2 ${theme.bgBadge} backdrop-blur-xl rounded-full border ${theme.borderCard} mb-8`}
            style={isDark ? { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' } : {}}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className={`text-sm ${theme.textSecondary} font-medium`} style={isDark ? { textShadow: '0 1px 3px rgba(0,0,0,0.5)' } : {}}>The World's First & Only ~18nm Kava Nanoemulsion</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.1]"
          >
            <motion.span
              className={`inline-block bg-gradient-to-r ${theme.heroGradient} bg-clip-text text-transparent`}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: '200% 200%' }}
            >
              Nano-Perfected
            </motion.span>
            <br />
            <span className={`${isDark ? 'text-slate-50' : 'text-slate-900'} font-black`}>Kava</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className={`text-xl md:text-2xl mb-10 max-w-3xl mx-auto leading-relaxed font-bold ${isDark ? 'text-slate-50' : 'text-slate-900'}`}
          >
            Cutting-edge nanoemulsification technology that overcomes the solubility and bioavailability challenges of traditional kava.
            <span className={`font-semibold ${isDark ? 'text-white' : theme.text}`}> Ultra-fine droplets so small they're almost transparent.</span>
            <br className="hidden md:block" />
            Trusted by leading Kava seltzer and shot brands.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <motion.a
              href="#contact"
              className={`group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-full text-lg overflow-hidden`}
              whileHover={{ scale: 1.05, boxShadow: '0 0 50px rgba(16, 185, 129, 0.6)' }}
              whileTap={{ scale: 0.98 }}
              style={{ backgroundSize: '200% 100%' }}
              animate={{ backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Request a Sample
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.a>
            <motion.a
              href="tel:+12169212240"
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 ${theme.bgBadge} ${theme.shadowCard} backdrop-blur-xl ${theme.text} font-semibold rounded-full text-lg border ${theme.borderCard} hover:border-emerald-500/50 transition-colors`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={isDark ? { boxShadow: '0 4px 24px rgba(0,0,0,0.4)' } : { boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}
            >
              <Phone className="w-5 h-5" />
              Call Josh: (216) 921-2240
            </motion.a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                className="relative group"
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {/* Animated border gradient */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-500/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                <div className="absolute -inset-[1px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500" />
                <div className={`relative ${theme.bgCardStats} ${theme.shadowCard} backdrop-blur-xl rounded-2xl p-6 border ${theme.borderCard} group-hover:border-transparent transition-colors`}>
                  <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-shadow">
                    <stat.icon className={`w-5 h-5 ${theme.accentText}`} />
                  </div>
                  <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${theme.accentGradient} bg-clip-text text-transparent`}>
                    <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                  </div>
                  <div className={`${theme.textMuted} text-sm mt-1 group-hover:${theme.textSecondary} transition-colors`}>{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className={`w-6 h-10 rounded-full border-2 ${theme.borderScroll} flex items-start justify-center p-2`}>
            <motion.div
              className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </motion.header>

      {/* Problem/Solution Section */}
      <AnimatedSection id="benefits" className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Problem */}
            <motion.div variants={fadeInLeft}>
              <div className={`inline-flex items-center gap-2 px-3 py-1 ${theme.bgError} rounded-full ${theme.textError} text-sm font-medium mb-6`}>
                <span className={`w-1.5 h-1.5 ${theme.errorDot} rounded-full`} />
                The Industry Problem
              </div>
              <h2 className={`text-3xl md:text-5xl font-bold mb-6 leading-tight ${theme.text}`}>
                Traditional Kava
                <span className={theme.textMuted}> Doesn't Work</span>
                <br />for Modern Beverages
              </h2>
              <p className={`${theme.textSecondary} text-lg mb-8 leading-relaxed`}>
                Traditional Kava preparations suffer from poor bioavailability, gritty texture, and muddy appearance.
                Your customers want instant results and a pleasant experience—not a waiting game.
              </p>
              <div className="space-y-4">
                {[
                  'Limited absorption in the gastrointestinal tract',
                  '30-45 minute onset frustrates consumers',
                  'Gritty texture and muddy appearance',
                  'Inconsistent dosing leads to unpredictable effects'
                ].map((problem, i) => (
                  <motion.div
                    key={i}
                    className={`flex items-center gap-3 ${theme.textSecondary}`}
                    variants={fadeInUp}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full ${theme.bgErrorIcon} flex items-center justify-center`}>
                      <span className={`${theme.textError} text-sm`}>✕</span>
                    </span>
                    {problem}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Solution */}
            <motion.div 
              variants={fadeInRight}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-2xl" />
              <div className={`relative ${theme.bgCardSolid} ${theme.shadowXl} backdrop-blur rounded-3xl p-8 md:p-10 border ${theme.borderCard}`}>
                <div className={`inline-flex items-center gap-2 px-3 py-1 ${theme.bgHighlight} rounded-full ${theme.accentText} text-sm font-medium mb-6`}>
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  The Cannasol Solution
                </div>
                <h3 className={`text-2xl md:text-3xl font-bold mb-4 ${theme.text}`}>
                  Nanoemulsification:
                  <br />
                  <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}>
                    A Game-Changing Solution
                  </span>
                </h3>
                <p className={`${theme.textSecondary} mb-8 leading-relaxed`}>
                  This cutting-edge process breaks down oil-based kavalactones into tiny droplets suspended in water—so small they become almost transparent, creating a stable and uniform mixture. Our proprietary NanoOptimizer™ surfactant system dramatically increases surface area, making kavalactones more readily available for absorption by the body.
                </p>
                <div className="space-y-4">
                  {[
                    'Enhanced bioavailability through better absorption',
                    'Crystal-clear, visually appealing beverages',
                    'Uniform kavalactone distribution for precise dosing',
                    'Easy integration into shots, soft drinks, and flavored water'
                  ].map((benefit, i) => (
                    <motion.div
                      key={i}
                      className={`flex items-center gap-3 ${theme.text}`}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full ${theme.bgIconBox} flex items-center justify-center`}>
                        <Check className="w-4 h-4 text-emerald-400" />
                      </span>
                      {benefit}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* Features Section */}
      <AnimatedSection className={`relative py-24 md:py-32 ${theme.bgSecondary}`}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              The Future of
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Kava Consumption</span>
            </h2>
            <p className={`${theme.textSecondary} text-lg max-w-2xl mx-auto`}>
              Nanoemulsification unlocks the full potential of kava, opening doors for innovative product formulations—from convenient shots to flavor-enhanced beverages—making it easier than ever to experience the relaxing and stress-reducing benefits of kava.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                variants={scaleIn}
                className="group relative"
                onMouseEnter={() => setActiveFeature(i)}
                whileHover={{ y: -8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                {/* Glow effect on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-0 group-hover:opacity-20 transition-all duration-500" />
                <div className={`relative h-full ${theme.bgCard} ${theme.shadowCard} backdrop-blur-xl rounded-2xl p-6 border ${theme.borderCard} group-hover:border-emerald-500/50 transition-all duration-300`}>
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl ${theme.bgIconBox} flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-300`}>
                        <feature.icon className={`w-6 h-6 ${theme.accentText} group-hover:text-emerald-300 transition-colors`} />
                      </div>
                      <span className={`px-3 py-1 ${theme.bgHighlightBorder} rounded-full ${theme.accentText} text-xs font-medium border`}>
                        {feature.highlight}
                      </span>
                    </div>
                    <h3 className={`text-xl font-bold mb-2 ${theme.text} group-hover:${theme.accentText} transition-colors duration-300`}>
                      {feature.title}
                    </h3>
                    <p className={`${theme.textSecondary} text-sm leading-relaxed transition-colors duration-300`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Process Section */}
      <AnimatedSection id="process" className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              From Concept to
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Market Leader</span>
            </h2>
            <p className={`${theme.textSecondary} text-lg max-w-2xl mx-auto`}>
              We work directly with every client because we believe in your success. Here's how we partner together.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-[2px]">
              <div className="w-full h-full bg-gradient-to-r from-emerald-500/30 via-teal-500/50 to-emerald-500/30 rounded-full" />
              <motion.div 
                className="absolute top-0 left-0 h-full w-1/4 bg-gradient-to-r from-transparent via-emerald-400 to-transparent rounded-full"
                animate={{ x: ['0%', '300%', '0%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            {process.map((item, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                className="relative group"
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className={`relative ${theme.bgCardSolid} ${theme.shadowCard} backdrop-blur-xl rounded-2xl p-6 border ${theme.borderCard} group-hover:border-emerald-500/40 transition-all duration-300`}>
                  {/* Step number with glow */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className={`relative text-5xl font-bold bg-gradient-to-br ${theme.accentGradientAlt} bg-clip-text text-transparent`}>
                      {item.step}
                    </div>
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${theme.text} group-hover:${theme.accentText} transition-colors`}>{item.title}</h3>
                  <p className={`${theme.textSecondary} text-sm transition-colors`}>{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Partnership & Trust Section */}
      <AnimatedSection id="proof" className={`relative py-24 md:py-32 ${theme.bgSecondary}`}>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-4 py-2 ${theme.bgHighlight} rounded-full ${theme.accentText} text-sm font-medium mb-6`}>
              <Award className="w-4 h-4" />
              Industry-Leading Partnership
            </div>
            <h2 className={`text-3xl md:text-5xl font-bold mb-4 ${theme.text}`}>
              Powered by the Best
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Equipment</span>
            </h2>
            <p className={`${theme.textSecondary} text-lg max-w-2xl mx-auto`}>
              We partner with QSonica, the #1 name in ultrasonic liquid processing, to deliver unmatched nanoemulsion quality.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* QSonica Partnership Card */}
            <motion.div
              variants={scaleIn}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl" />
              <div className={`relative ${theme.bgCardAlt} ${theme.shadowCard} backdrop-blur rounded-2xl p-8 border ${theme.borderCard} h-full`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-xl ${theme.bgIconBox} flex items-center justify-center`}>
                    <Beaker className={`w-8 h-8 ${theme.accentText}`} />
                  </div>
                  <div>
                    <div className={`${theme.accentText} text-sm font-medium`}>Official Partner</div>
                    <div className={`text-2xl font-bold ${theme.text}`}>QSonica</div>
                  </div>
                </div>
                <p className={`${theme.textSecondary} mb-4`}>
                  #1 Ultrasonic Liquid Processing Equipment manufacturer. Our partnership ensures you get access to the most advanced nanoemulsification technology available.
                </p>
                <div className={`flex items-center gap-2 ${theme.textMuted} text-sm`}>
                  <Check className={`w-4 h-4 ${theme.accentText}`} />
                  Industry-leading ultrasonic processors
                </div>
              </div>
            </motion.div>

            {/* Track Record Card */}
            <motion.div
              variants={scaleIn}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-2xl blur-xl" />
              <div className={`relative ${theme.bgCardAlt} ${theme.shadowCard} backdrop-blur rounded-2xl p-8 border ${theme.borderCard} h-full`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-xl ${theme.bgIconBox} flex items-center justify-center`}>
                    <Award className={`w-8 h-8 ${theme.accentText}`} />
                  </div>
                  <div>
                    <div className={`${theme.accentText} text-sm font-medium`}>Proven Results</div>
                    <div className={`text-2xl font-bold ${theme.text}`}>Trusted Partner</div>
                  </div>
                </div>
                <p className={`${theme.textSecondary} mb-4`}>
                  Every brand we've worked with loves the results. The product sells itself—Josh just helps you get there.
                </p>
                <div className={`flex items-center gap-2 ${theme.textMuted} text-sm`}>
                  <Check className={`w-4 h-4 ${theme.accentText}`} />
                  Dedicated customer support
                </div>
              </div>
            </motion.div>
          </div>

          {/* Target Audience */}
          <motion.div 
            variants={fadeInUp}
            className="mt-16 text-center"
          >
            <p className={`${theme.textMuted} text-sm uppercase tracking-wider mb-4`}>Perfect For</p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Kava Seltzers', 'Functional Shots', 'RTD Beverages', 'Wellness Brands'].map((item, i) => (
                <motion.span 
                  key={i}
                  className={`px-5 py-2.5 ${theme.bgPill} ${theme.shadowCard} rounded-full ${theme.textSecondary} text-sm border ${theme.borderCard} hover:border-emerald-500/40 hover:${theme.accentText} transition-all cursor-default`}
                  whileHover={{ scale: 1.05, y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                >
                  {item}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <AnimatedSection id="contact" className="relative py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            variants={scaleIn}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
            <div className={`relative ${theme.bgCard} ${theme.shadowXl} backdrop-blur rounded-3xl p-8 md:p-12 border ${theme.borderCta}`}>
              <div className="text-center mb-10">
                <motion.div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${theme.accent} mb-6`}
                  animate={{ 
                    boxShadow: ['0 0 20px rgba(16, 185, 129, 0.3)', '0 0 40px rgba(16, 185, 129, 0.5)', '0 0 20px rgba(16, 185, 129, 0.3)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MessageCircle className="w-8 h-8 text-slate-900" />
                </motion.div>
                <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${theme.text}`}>
                  Ready to Create the Best
                  <br />
                  <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}>
                    Kava Product on the Market?
                  </span>
                </h2>
                <p className={`${theme.textSecondary} text-lg max-w-2xl mx-auto`}>
                  Talk directly with Josh about your product vision. Get a sample and see why the top brands trust Cannasol.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <Link to="/contact">
                  <motion.div
                    className={`flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-xl text-lg`}
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MessageCircle className="w-5 h-5" />
                    Contact Form
                  </motion.div>
                </Link>
                <motion.a
                  href="tel:+12169212240"
                  className={`flex items-center justify-center gap-3 px-6 py-4 ${theme.bgButton} ${theme.text} font-semibold rounded-xl text-lg border ${theme.borderCard} hover:border-emerald-500/50 transition-colors`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Phone className="w-5 h-5" />
                  (216) 921-2240
                </motion.a>
                <motion.a
                  href="mailto:josh.detzel@cannasolusa.com"
                  className={`flex items-center justify-center gap-3 px-6 py-4 ${theme.bgButton} ${theme.text} font-semibold rounded-xl text-lg border ${theme.borderCard} hover:border-emerald-500/50 transition-colors`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Mail className="w-5 h-5" />
                  Email Us
                </motion.a>
              </div>

              <div className={`flex flex-wrap items-center justify-center gap-6 ${theme.textSecondary} text-sm`}>
                <a 
                  href="https://maps.google.com/?q=Sarasota,+Florida+34234"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Sarasota, Florida
                </a>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Mon-Fri: 9:30AM - 5:30PM
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Footer */}
      <footer className={`relative border-t ${theme.border} py-12 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img 
                src={theme.logo} 
                alt="Cannasol Technologies" 
                className="h-8 w-auto"
              />
              <span className={`${theme.textSecondary} text-sm`}>© 2025 Cannasol Technologies LLC</span>
            </div>
            <div className={`flex gap-6 text-sm ${theme.textMuted}`}>
              <a href="https://cannasoltechnologies.com/shop/" className={`hover:${theme.text} transition-colors`}>Shop</a>
              <a href="https://cannasoltechnologies.com/resources" className={`hover:${theme.text} transition-colors`}>Resources</a>
              <Link to="/contact" className={`hover:${theme.text} transition-colors`}>Contact</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom styles for hexagon clip path */}
      <style jsx>{`
        .clip-hexagon {
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
      `}</style>
    </div>
  );
}
