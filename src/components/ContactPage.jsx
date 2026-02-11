import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { 
  ArrowLeft, 
  Send, 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  CheckCircle,
  AlertCircle,
  Building2,
  User,
  MessageSquare,
  Briefcase,
  Sun,
  Moon
} from 'lucide-react';
import themesConfig from '../theme/themes';

// Theme configuration - matches other pages
const themes = themesConfig;

// Inquiry type options
const inquiryTypes = [
  { value: 'samples', label: 'Request Samples', icon: Briefcase },
  { value: 'pricing', label: 'Pricing & Volume Quotes', icon: Briefcase },
  { value: 'formulation', label: 'Formulation Support', icon: Briefcase },
  { value: 'partnership', label: 'Partnership Inquiry', icon: Briefcase },
  { value: 'general', label: 'General Question', icon: MessageSquare },
];

/**
 * Contact Form Component
 */
function ContactForm({ theme }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    inquiryType: '',
    message: '',
  });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.inquiryType) newErrors.inquiryType = 'Please select an inquiry type';
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setStatus('submitting');

    try {
      // Submit to Firebase Cloud Function
      const payload = {
        name: formData.name,
        email: formData.email,
        company: formData.company || '',
        phone: formData.phone || '',
        inquiryType: inquiryTypes.find(t => t.value === formData.inquiryType)?.label || 'General',
        message: formData.message
      };

      // For production, use your deployed Cloud Function URL
      // For development, use: http://localhost:5001/nano-kava-landing-page/us-central1/sendContactEmail
      const CLOUD_FUNCTION_URL = 'https://us-central1-nano-kava-landing-page.cloudfunctions.net/sendContactEmail';

      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
      } else {
        throw new Error(data.error || 'Form submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setStatus('error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`${theme.bgCard} rounded-3xl border ${theme.borderCard} p-12 text-center`}
      >
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r ${theme.accent} flex items-center justify-center`}>
          <CheckCircle className="w-10 h-10 text-slate-900" />
        </div>
        <h3 className={`text-2xl font-bold mb-4 ${theme.text}`}>Message Sent!</h3>
        <p className={`${theme.textSecondary} mb-8`}>
          Thanks for reaching out! Josh will get back to you within 24 hours. In the meantime, feel free to call us at{' '}
          <a href="tel:+12169212240" className={theme.accentText}>
            (216) 921-2240
          </a>
        </p>
        <button
          onClick={() => {
            setStatus('idle');
            setFormData({
              name: '',
              email: '',
              company: '',
              phone: '',
              inquiryType: '',
              message: '',
            });
          }}
          className={`px-6 py-3 ${theme.bgInput} ${theme.text} rounded-full border ${theme.borderCard}`}
        >
          Send Another Message
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name & Email Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            Full Name *
          </label>
          <div className="relative">
            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Smith"
              className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${errors.name ? 'border-red-500' : theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-all`}
            />
          </div>
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>
        
        <div>
          <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            Email Address *
          </label>
          <div className="relative">
            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@company.com"
              className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${errors.email ? 'border-red-500' : theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-all`}
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>
      </div>

      {/* Company & Phone Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            Company Name
          </label>
          <div className="relative">
            <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your Company"
              className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-all`}
            />
          </div>
        </div>
        
        <div>
          <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            Phone Number
          </label>
          <div className="relative">
            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-all`}
            />
          </div>
        </div>
      </div>

      {/* Inquiry Type */}
      <div>
        <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
          What can we help you with? *
        </label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inquiryTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, inquiryType: type.value }));
                if (errors.inquiryType) setErrors(prev => ({ ...prev, inquiryType: '' }));
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                formData.inquiryType === type.value
                  ? `bg-gradient-to-r ${theme.accent} text-slate-900 border-transparent`
                  : `${theme.bgInput} ${theme.text} ${theme.borderInput} hover:border-emerald-500/50`
              }`}
            >
              <span className="font-medium">{type.label}</span>
            </button>
          ))}
        </div>
        {errors.inquiryType && <p className="text-red-500 text-sm mt-2">{errors.inquiryType}</p>}
      </div>

      {/* Message */}
      <div>
        <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
          Your Message *
        </label>
        <div className="relative">
          <MessageSquare className={`absolute left-4 top-4 w-5 h-5 ${theme.textMuted}`} />
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us about your project, product goals, or any questions you have..."
            rows={5}
            className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${errors.message ? 'border-red-500' : theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-all resize-none`}
          />
        </div>
        {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={status === 'submitting'}
        className={`w-full py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-xl text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {status === 'submitting' ? (
          <>
            <div className="w-5 h-5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Send Message
          </>
        )}
      </motion.button>

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-500 justify-center">
          <AlertCircle className="w-5 h-5" />
          <span>Something went wrong. Please try again or email us directly.</span>
        </div>
      )}
    </form>
  );
}

/**
 * Contact Info Card Component - Compact version
 */
function ContactInfoCard({ icon: Icon, title, children, theme, href }) {
  const content = (
    <div className={`${theme.bgCard} backdrop-blur-xl rounded-xl border ${theme.borderCard} p-4 flex items-start gap-4`}>
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${theme.accent} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-slate-900" />
      </div>
      <div>
        <h3 className={`font-semibold ${theme.text} text-sm`}>{title}</h3>
        <div className={`${theme.textSecondary} text-sm`}>{children}</div>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:scale-[1.02] transition-transform">
        {content}
      </a>
    );
  }
  return content;
}

/**
 * Main Contact Page Component
 */
export default function ContactPage() {
  const { isDark, setIsDark } = useTheme();
  const theme = isDark ? themes.dark : themes.light;

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
              to="/faq"
              className={`btn-shine hidden sm:inline-flex px-5 py-2.5 ${theme.bgInput} ${theme.text} font-semibold rounded-full border ${theme.borderCard}`}
            >
              FAQ
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${theme.text}`}>
              Let's
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Connect</span>
            </h1>
            <p className={`text-xl ${theme.textSecondary} max-w-2xl mx-auto`}>
              Ready to revolutionize your Kava products? Whether you need samples, pricing, or formulation support—Josh is here to help.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form - Takes 2 columns */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className={`${isDark ? theme.bgCard : 'bg-white/40'} backdrop-blur-xl rounded-3xl border ${theme.borderCard} p-8 md:p-10`}>
              <h2 className={`text-2xl font-bold mb-6 ${theme.text}`}>Send Us a Message</h2>
              <ContactForm theme={theme} />
            </div>
          </motion.div>

          {/* Contact Info Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-3"
          >
            <ContactInfoCard 
              icon={Phone} 
              title="Call Us" 
              theme={theme}
              href="tel:+12169212240"
            >
              <p className="font-medium">(216) 921-2240</p>
            </ContactInfoCard>

            <ContactInfoCard 
              icon={Mail} 
              title="Email Us" 
              theme={theme}
              href="mailto:josh.detzel@cannasolusa.com"
            >
              <p className="font-medium break-all">josh.detzel@cannasolusa.com</p>
            </ContactInfoCard>

            <ContactInfoCard 
              icon={MapPin} 
              title="Location" 
              theme={theme}
            >
              <p className="font-medium">Sarasota, Florida, USA</p>
            </ContactInfoCard>

            <ContactInfoCard 
              icon={Clock} 
              title="Hours" 
              theme={theme}
            >
              <p className="font-medium">Mon-Fri, 9:30 AM - 5:30 PM EST</p>
            </ContactInfoCard>

            {/* Quick Links */}
            <div className={`${theme.bgCard} backdrop-blur-xl rounded-xl border ${theme.borderCard} p-4`}>
              <h3 className={`font-semibold ${theme.text} text-sm mb-3`}>Quick Links</h3>
              <div className="space-y-2 text-sm">
                <Link 
                  to="/faq" 
                  className={`block ${theme.textSecondary} hover:${theme.accentText} transition-colors`}
                >
                  → FAQ
                </Link>
                <a 
                  href="https://cannasoltechnologies.com/shop/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block ${theme.textSecondary} hover:${theme.accentText} transition-colors`}
                >
                  → Shop
                </a>
                <a 
                  href="https://cannasoltechnologies.com/resources/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block ${theme.textSecondary} hover:${theme.accentText} transition-colors`}
                >
                  → Resources
                </a>
              </div>
            </div>
          </motion.div>
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
