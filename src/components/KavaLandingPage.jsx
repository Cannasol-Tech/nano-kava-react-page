import React, { useState, useRef } from 'react';
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

// Theme configuration
const themes = {
  dark: {
    bg: 'bg-slate-950',
    bgSecondary: 'bg-slate-900/50',
    bgCard: 'bg-slate-800/80',
    bgCardHover: 'bg-slate-800/60',
    bgNav: 'bg-slate-950/80',
    text: 'text-white',
    textSecondary: 'text-slate-400',
    textMuted: 'text-slate-500',
    border: 'border-slate-800',
    borderCard: 'border-slate-700/50',
    accent: 'from-emerald-500 to-teal-500',
    accentText: 'text-emerald-400',
    logo: '/cannasol-logo.png',
    gradientOrbs: {
      emerald: 'bg-emerald-500/15',
      teal: 'bg-teal-500/15',
      cyan: 'bg-cyan-500/10'
    }
  },
  light: {
    bg: 'bg-slate-50',
    bgSecondary: 'bg-white',
    bgCard: 'bg-white',
    bgCardHover: 'bg-slate-50',
    bgNav: 'bg-white/90',
    text: 'text-slate-900',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-500',
    border: 'border-slate-200',
    borderCard: 'border-slate-200',
    accent: 'from-emerald-600 to-cyan-600',
    accentText: 'text-emerald-600',
    logo: '/cannasol-logoW.png',
    gradientOrbs: {
      emerald: 'bg-emerald-500/10',
      teal: 'bg-teal-500/10',
      cyan: 'bg-cyan-500/5'
    }
  }
};

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

// Floating particles background - enhanced with varied sizes and glow
function FloatingParticles() {
  const particles = React.useMemo(() => 
    [...Array(30)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 3,
    })), []
  );
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, rgba(20, 184, 166, 0.1) 70%, transparent 100%)`,
            boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)',
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, Math.sin(p.id) * 15, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
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
  const [isDark, setIsDark] = useState(true);
  
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
    { value: '10', suffix: 'x', label: 'Bioavailability', icon: TrendingUp },
    { value: '5', suffix: ' min', label: 'Onset Time', icon: Clock },
    { value: '20', suffix: 'L/hr', label: 'Production Rate', icon: Award }
  ];

  const features = [
    {
      icon: Beaker,
      title: "World's First ~18nm Kava",
      description: "We pioneered nanoemulsified Kava, achieving ~18nm particle sizes that no competitor has matched. Your beverages get the most bioavailable Kava on the planet.",
      highlight: "Industry First"
    },
    {
      icon: Zap,
      title: "5-Minute Onset",
      description: "Traditional Kava takes 30-45 minutes. Our nanoemulsion delivers effects in just 5 minutes—the instant gratification today's consumers demand.",
      highlight: "6x Faster"
    },
    {
      icon: Sparkles,
      title: "Crystal Clear Formulations",
      description: "Ultra-fine ~18nm particles create translucent, shelf-stable emulsions. No separation, no sediment—just beautiful, marketable beverages.",
      highlight: "Premium Clarity"
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
    },
    {
      icon: Target,
      title: "Proven Track Record",
      description: "We're already working with leading Kava seltzer brands. Every client loves the results.",
      highlight: "Proven Results"
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
            
            {/* Theme Toggle */}
            <motion.button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-full ${isDark ? 'bg-slate-800 text-yellow-400' : 'bg-slate-200 text-slate-700'} transition-colors`}
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
              className={`p-2 rounded-full ${isDark ? 'bg-slate-800 text-yellow-400' : 'bg-slate-200 text-slate-700'} transition-colors`}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </motion.button>
            
            <motion.button
              className={`flex items-center justify-center w-10 h-10 rounded-lg ${isDark ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-200 border-slate-300'} border`}
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
            <a
              href="#contact"
              className="block w-full text-center px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-semibold rounded-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              Get Started
            </a>
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
          <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950' : 'bg-gradient-to-b from-slate-100 via-white to-slate-100'} transition-colors duration-500`} />
          {/* Gradient orbs */}
          <GlowOrb className={`top-1/4 left-1/4 w-[600px] h-[600px] ${theme.gradientOrbs.emerald} blur-[120px]`} delay={0} />
          <GlowOrb className={`bottom-1/4 right-1/4 w-[500px] h-[500px] ${theme.gradientOrbs.teal} blur-[100px]`} delay={1} />
          <GlowOrb className={`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] ${theme.gradientOrbs.cyan} blur-[80px]`} delay={2} />
          {/* Accent glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent" />
          <GridBackground />
          <FloatingParticles />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={`inline-flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-slate-800/60' : 'bg-white/80'} backdrop-blur rounded-full border ${theme.borderCard} mb-8`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className={`text-sm ${theme.textSecondary}`}>The World's First & Only ~18nm Kava Nanoemulsion</span>
          </motion.div>

          {/* Main headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 leading-[1.1]"
          >
            <motion.span 
              className={`inline-block bg-gradient-to-r ${isDark ? 'from-emerald-300 via-teal-300 to-cyan-300' : 'from-emerald-600 via-teal-600 to-cyan-600'} bg-clip-text text-transparent`}
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              style={{ backgroundSize: '200% 200%' }}
            >
              Nano-Perfected
            </motion.span>
            <br />
            <span className={theme.text}>Kava</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className={`text-xl md:text-2xl ${theme.textSecondary} mb-10 max-w-3xl mx-auto leading-relaxed`}
          >
            The only Kava nanoemulsion achieving ~18nm particle size.
            <span className={theme.text}> 10x bioavailability. 5-minute onset.</span>
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
              className={`inline-flex items-center justify-center gap-2 px-8 py-4 ${isDark ? 'bg-slate-800/60' : 'bg-white/80'} backdrop-blur ${theme.text} font-semibold rounded-full text-lg border ${theme.borderCard} hover:border-emerald-500/50 transition-colors`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
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
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto"
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
                <div className={`relative ${isDark ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90' : 'bg-white/90'} backdrop-blur-xl rounded-2xl p-6 border ${theme.borderCard} group-hover:border-transparent transition-colors`}>
                  <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-shadow">
                    <stat.icon className={`w-5 h-5 ${theme.accentText}`} />
                  </div>
                  <div className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${isDark ? 'from-emerald-400 via-teal-400 to-cyan-400' : 'from-emerald-600 via-teal-600 to-cyan-600'} bg-clip-text text-transparent`}>
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
          <div className={`w-6 h-10 rounded-full border-2 ${isDark ? 'border-slate-600' : 'border-slate-400'} flex items-start justify-center p-2`}>
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
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 rounded-full text-red-400 text-sm font-medium mb-6">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full" />
                The Industry Problem
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                Traditional Kava
                <span className="text-slate-500"> Doesn't Work</span>
                <br />for Modern Beverages
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                Standard Kava extracts are hydrophobic, poorly absorbed, and take 30-45 minutes to feel. 
                Your customers want instant results—not a waiting game.
              </p>
              <div className="space-y-4">
                {[
                  'Only 10-15% of kavalactones absorbed',
                  '30-45 minute onset frustrates consumers',
                  'Cloudy, unstable formulations look cheap',
                  'Bitter taste drives customers away'
                ].map((problem, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-3 text-slate-300"
                    variants={fadeInUp}
                  >
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                      <span className="text-red-400 text-sm">✕</span>
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
              <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur rounded-3xl p-8 md:p-10 border border-slate-700/50">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full text-emerald-400 text-sm font-medium mb-6">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  The Cannasol Solution
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  World's First ~18nm
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Kava Nanoemulsion
                  </span>
                </h3>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Our proprietary NanoOptimizer™ surfactant system creates ultra-fine Kava particles that absorb instantly, 
                  taste better, and stay perfectly suspended.
                </p>
                <div className="space-y-4">
                  {[
                    '80-90% kavalactone absorption',
                    'Effects felt in just 5 minutes',
                    'Crystal-clear, shelf-stable emulsions',
                    'Smooth taste with our bitter blockers'
                  ].map((benefit, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3 text-white"
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                    >
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
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
      <AnimatedSection className="relative py-24 md:py-32 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why Top Brands Choose
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> Cannasol</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              We're not just suppliers—we're your partners in creating market-leading Kava products.
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
                <div className="relative h-full bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 group-hover:border-emerald-500/50 transition-all duration-300">
                  {/* Subtle inner glow */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-500/20 transition-all duration-300">
                        <feature.icon className="w-6 h-6 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                      </div>
                      <span className="px-3 py-1 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-full text-emerald-400 text-xs font-medium border border-emerald-500/20">
                        {feature.highlight}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-300 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
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
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              From Concept to
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> Market Leader</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Josh works directly with every client to ensure your success. Here's how we partner together.
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
                <div className="relative bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 group-hover:border-emerald-500/40 transition-all duration-300">
                  {/* Step number with glow */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative text-5xl font-bold bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-emerald-300 transition-colors">{item.title}</h3>
                  <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Partnership & Trust Section */}
      <AnimatedSection id="proof" className="relative py-24 md:py-32 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full text-emerald-400 text-sm font-medium mb-6">
              <Award className="w-4 h-4" />
              Industry-Leading Partnership
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Powered by the Best
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent"> Equipment</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
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
              <div className="relative bg-slate-800/40 backdrop-blur rounded-2xl p-8 border border-slate-700/50 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <Beaker className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-emerald-400 text-sm font-medium">Official Partner</div>
                    <div className="text-2xl font-bold text-white">QSonica</div>
                  </div>
                </div>
                <p className="text-slate-300 mb-4">
                  #1 Ultrasonic Liquid Processing Equipment manufacturer. Our partnership ensures you get access to the most advanced nanoemulsification technology available.
                </p>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
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
              <div className="relative bg-slate-800/40 backdrop-blur rounded-2xl p-8 border border-slate-700/50 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                    <Award className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-emerald-400 text-sm font-medium">Proven Results</div>
                    <div className="text-2xl font-bold text-white">Trusted Partner</div>
                  </div>
                </div>
                <p className="text-slate-300 mb-4">
                  Every brand we've worked with loves the results. The product sells itself—Josh just helps you get there.
                </p>
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
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
            <p className="text-slate-500 text-sm uppercase tracking-wider mb-4">Perfect For</p>
            <div className="flex flex-wrap justify-center gap-4">
              {['Kava Seltzers', 'Functional Shots', 'RTD Beverages', 'Wellness Brands'].map((item, i) => (
                <motion.span 
                  key={i}
                  className="px-5 py-2.5 bg-gradient-to-r from-slate-800/60 to-slate-800/40 rounded-full text-slate-300 text-sm border border-slate-700/50 hover:border-emerald-500/40 hover:text-emerald-300 transition-all cursor-default"
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
            <div className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur rounded-3xl p-8 md:p-12 border border-emerald-500/20">
              <div className="text-center mb-10">
                <motion.div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 mb-6"
                  animate={{ 
                    boxShadow: ['0 0 20px rgba(16, 185, 129, 0.3)', '0 0 40px rgba(16, 185, 129, 0.5)', '0 0 20px rgba(16, 185, 129, 0.3)']
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <MessageCircle className="w-8 h-8 text-slate-900" />
                </motion.div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Ready to Create the Best
                  <br />
                  <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    Kava Product on the Market?
                  </span>
                </h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                  Talk directly with Josh about your product vision. Get a sample and see why the top brands trust Cannasol.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <motion.a
                  href="https://cannasoltechnologies.com/contact-us"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 font-bold rounded-xl text-lg"
                  whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MessageCircle className="w-5 h-5" />
                  Contact Form
                </motion.a>
                <motion.a
                  href="tel:+12169212240"
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-700/50 text-white font-semibold rounded-xl text-lg border border-slate-600 hover:border-emerald-500/50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Phone className="w-5 h-5" />
                  (216) 921-2240
                </motion.a>
                <motion.a
                  href="mailto:info@cannasoltechnologies.com"
                  className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-700/50 text-white font-semibold rounded-xl text-lg border border-slate-600 hover:border-emerald-500/50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Mail className="w-5 h-5" />
                  Email Us
                </motion.a>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-slate-400 text-sm">
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
              <a href="https://cannasoltechnologies.com/shop" className={`hover:${theme.text} transition-colors`}>Shop</a>
              <a href="https://cannasoltechnologies.com/resources" className={`hover:${theme.text} transition-colors`}>Resources</a>
              <a href="https://cannasoltechnologies.com/contact-us" className={`hover:${theme.text} transition-colors`}>Contact</a>
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
