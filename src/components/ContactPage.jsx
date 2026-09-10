import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import JsonLd from '../seo/JsonLd';
import { contactSchema } from '../seo/structuredData';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
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
import { trackFormConversion, trackPhoneClick, trackEmailClick } from '../utils/gtag';
import { company, sampleOffer } from '../content/company';

// Theme configuration - matches other pages
const themes = themesConfig;

// Inquiry type options
const inquiryTypes = [
  { value: 'samples', label: 'Request Samples', icon: Briefcase },
  { value: 'pricing', label: 'Pricing & Volume Quotes', icon: Briefcase },
  { value: 'formulation', label: 'Formulation Support', icon: Briefcase },
  { value: 'partnership', label: 'Partnership Inquiry', icon: Briefcase },
  { value: 'general', label: 'General Question', icon: MessageSquare },
  { value: 'other', label: 'Other', icon: MessageSquare },
];

/**
 * Contact Form Component
 */
// The five lines ship in one box, so every prefill names the others as an easy add-on.
const ALL_LINES = "Kavalactone Nanoemulsion, Lion's Mane Nanoemulsion, Reishi Nanoemulsion, Cordyceps Nanoemulsion and Bitter Blocker";
const productMessages = {
  'nano-kava': `I'm interested in receiving a free Kavalactone Nanoemulsion sample for evaluation. Happy to see the rest of the line too — ${ALL_LINES}.`,
  'nano-mushrooms': `I'm interested in receiving free mushroom nanoemulsion samples for evaluation — Lion's Mane Nanoemulsion, Reishi Nanoemulsion and Cordyceps Nanoemulsion. Happy to see the Kavalactone Nanoemulsion and Bitter Blocker too.`,
  'lions-mane': "I'm interested in receiving a free Lion's Mane Nanoemulsion sample for evaluation.",
  reishi: "I'm interested in receiving a free Reishi Nanoemulsion sample for evaluation.",
  cordyceps: "I'm interested in receiving a free Cordyceps Nanoemulsion sample for evaluation.",
  'bitter-blocker': "I'm interested in receiving a free Bitter Blocker sample for evaluation.",
};

function ContactForm({ theme, initialInquiry, initialProduct }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    inquiryTypes: initialInquiry ? [initialInquiry] : [],
    message: (initialProduct && productMessages[initialProduct]) || '',
  });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Pure validator — returns an errors object for the given form state
  // without touching React state, so it can be reused for live + submit checks.
  const getErrors = (data) => {
    const newErrors = {};
    if (!data.name.trim()) newErrors.name = 'Name is required';
    if (!data.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (data.inquiryTypes.length === 0) newErrors.inquiryTypes = 'Please select at least one inquiry type';
    if (data.inquiryTypes.includes('other') && !data.message.trim()) newErrors.message = 'Please describe your inquiry';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formErrors = getErrors(formData);
    if (Object.keys(formErrors).length > 0) {
      // Reveal every error and mark all fields touched so they stay live.
      setErrors(formErrors);
      setTouched({ name: true, email: true, inquiryTypes: true, message: true });
      return;
    }

    setStatus('submitting');

    try {
      // Submit to Firebase Cloud Function
      const payload = {
        name: formData.name,
        email: formData.email,
        company: formData.company || '',
        phone: formData.phone || '',
        inquiryType: formData.inquiryTypes.map(v => inquiryTypes.find(t => t.value === v)?.label || v).join(', '),
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
        toast.success('Message sent successfully! Josh will get back to you within 24 hours.', {
          duration: 5000,
        });
        trackFormConversion({
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          company: formData.company,
        });
      } else {
        throw new Error(data.error || 'Form submission failed');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setStatus('error');
      toast.error(`Failed to send message. Please try again or call us at ${company.phone}.`, {
        duration: 6000,
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const next = { ...formData, [name]: value };
    setFormData(next);
    // Once a field has been blurred, validate it live on every keystroke so the
    // error message clears the moment the input becomes valid.
    if (touched[name]) {
      const fieldErrors = getErrors(next);
      setErrors(prev => ({ ...prev, [name]: fieldErrors[name] || '' }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const fieldErrors = getErrors(formData);
    setErrors(prev => ({ ...prev, [name]: fieldErrors[name] || '' }));
  };

  if (status === 'success') {
    return (
      <div
        className={`animate-fade-in-up ${theme.bgCard} rounded-3xl border ${theme.borderCard} p-12 text-center`}
      >
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r ${theme.accent} flex items-center justify-center`}>
          <CheckCircle className="w-10 h-10 text-slate-900" />
        </div>
        <h3 className={`text-2xl font-bold mb-4 ${theme.text}`}>Message Sent!</h3>
        <p className={`${theme.textSecondary} mb-8`}>
          Thanks for reaching out! Josh will get back to you within 24 hours. In the meantime, feel free to call us at{' '}
          <a href={company.phoneHref} onClick={() => trackPhoneClick()} className={theme.accentText}>
            {company.phone}
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
              inquiryTypes: [],
              message: '',
            });
            setErrors({});
            setTouched({});
          }}
          className={`btn-shine px-6 py-3 ${theme.bgInput} ${theme.text} rounded-full border ${theme.borderCard}`}
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name & Email Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-name" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            Full Name *
          </label>
          <div className="relative">
            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
            <input
              type="text"
              id="contact-name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.name}
              placeholder="John Smith"
              className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${errors.name ? 'border-red-500' : theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-[border-color,box-shadow]`}
            />
          </div>
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>
        
        <div>
          <label htmlFor="contact-email" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            Email Address *
          </label>
          <div className="relative">
            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
            <input
              type="email"
              id="contact-email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.email}
              placeholder="john@company.com"
              className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${errors.email ? 'border-red-500' : theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-[border-color,box-shadow]`}
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
        </div>
      </div>

      {/* Company & Phone Row */}
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="contact-company" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            Company Name
          </label>
          <div className="relative">
            <Building2 className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
            <input
              type="text"
              id="contact-company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder="Your Company"
              className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-[border-color,box-shadow]`}
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="contact-phone" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
            Phone Number
          </label>
          <div className="relative">
            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${theme.textMuted}`} />
            <input
              type="tel"
              id="contact-phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+1 (555) 000-0000"
              className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-[border-color,box-shadow]`}
            />
          </div>
        </div>
      </div>

      {/* Inquiry Type — multi-select */}
      <div>
        <label className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
          What can we help you with? (select all that apply) *
        </label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inquiryTypes.map((type) => {
            const isSelected = formData.inquiryTypes.includes(type.value);
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => {
                  const next = {
                    ...formData,
                    inquiryTypes: isSelected
                      ? formData.inquiryTypes.filter(v => v !== type.value)
                      : [...formData.inquiryTypes, type.value],
                  };
                  setFormData(next);
                  setTouched(prev => ({ ...prev, inquiryTypes: true }));
                  // Re-validate selection plus the message rule, which depends on "Other".
                  const fieldErrors = getErrors(next);
                  setErrors(prev => ({
                    ...prev,
                    inquiryTypes: fieldErrors.inquiryTypes || '',
                    message: touched.message ? (fieldErrors.message || '') : prev.message,
                  }));
                }}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  isSelected
                    ? `bg-gradient-to-r ${theme.accent} text-slate-900 border-transparent`
                    : `${theme.bgInput} ${theme.text} ${theme.borderInput} hover:border-emerald-500/50`
                }`}
              >
                <span className="font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
        {errors.inquiryTypes && <p className="text-red-500 text-sm mt-2">{errors.inquiryTypes}</p>}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="contact-message" className={`block text-sm font-medium ${theme.textSecondary} mb-2`}>
          Your Message {formData.inquiryTypes.includes('other') ? '*' : '(optional)'}
        </label>
        <div className="relative">
          <MessageSquare className={`absolute left-4 top-4 w-5 h-5 ${theme.textMuted}`} />
          <textarea
            id="contact-message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!errors.message}
            placeholder="Tell us about your project, product goals, or any questions you have..."
            rows={5}
            className={`w-full pl-12 pr-4 py-3 ${theme.bgInput} ${theme.text} ${theme.placeholder} border ${errors.message ? 'border-red-500' : theme.borderInput} rounded-xl focus:outline-none focus:ring-2 ${theme.focusRing} transition-[border-color,box-shadow] resize-none`}
          />
        </div>
        {errors.message && <p className="text-red-500 text-sm mt-1">{errors.message}</p>}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === 'submitting'}
        className={`btn-shine interactive-btn hover-scale-sm active-press w-full py-4 bg-gradient-to-r ${theme.accent} text-slate-900 font-bold rounded-xl text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed`}
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
      </button>

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
function ContactInfoCard({ icon: Icon, title, children, theme, href, onClick }) {
  const content = (
    <div className={`${theme.bgCard} rounded-xl border ${theme.borderCard} p-4 flex items-start gap-4`}>
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
      <a href={href} onClick={onClick} className="block hover:scale-[1.02] transition-transform">
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
  const [searchParams] = useSearchParams();
  const inquiryParam = searchParams.get('inquiry');
  const productParam = searchParams.get('product');

  return (
    <div className={`min-h-screen ${theme.text} transition-colors duration-500`}>
      <Helmet>
        <title>Contact Us | Nano Kava by EnjoyNano</title>
        <meta name="description" content="Reach the EnjoyNano team for nano kava samples, $250/L pricing, or formulation support. Questions about nano-emulsified kavalactone technology? We'd love to hear from you." />
        <link rel="canonical" href="https://enjoynano.com/contact" />
        <meta property="og:title" content="Contact EnjoyNano — Nano Kava Team" />
        <meta property="og:description" content="Reach out for nano kava samples, pricing, formulation support, or partnership inquiries." />
        <meta property="og:url" content="https://enjoynano.com/contact" />
        <link rel="alternate" type="text/markdown" href="https://enjoynano.com/contact.md" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://enjoynano.com/og-image.png" />
        <meta name="twitter:image" content="https://enjoynano.com/og-image.png" />
      </Helmet>
      <JsonLd data={contactSchema} />

      {/* Navigation */}
      <nav
        className={`animate-slide-down fixed top-0 left-0 right-0 z-50 ${theme.bgNav} border-b ${theme.border}/50 transition-colors duration-500`}
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className={`flex items-center gap-2 py-3 ${theme.textSecondary} hover:${theme.text} transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
            <div className="hidden sm:block w-px h-6 bg-slate-700" />
            <Link to="/" className="flex items-center gap-3 p-1">
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
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            <Link
              to="/faq"
              className={`btn-shine hidden sm:inline-flex px-5 py-2.5 ${theme.bgInput} ${theme.text} font-semibold rounded-full border ${theme.borderCard}`}
            >
              FAQ
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-fade-in-up">
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${theme.text}`}>
              Let's
              <span className={`bg-gradient-to-r ${theme.accentGradientAlt} bg-clip-text text-transparent`}> Connect</span>
              <span className="sr-only"> — Contact EnjoyNano for Nano Kava</span>
            </h1>
            <p className={`text-xl ${theme.textSecondary} max-w-2xl mx-auto`}>
              Ready to revolutionize your Kava products? Whether you need samples, pricing, or formulation support—Josh is here to help.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Form - Takes 2 columns */}
          <div className="lg:col-span-2 animate-fade-in-up anim-delay-100">
            <div className={`${isDark ? theme.bgCard : theme.bgCardOpaque} rounded-3xl border ${theme.borderCard} p-8 md:p-10`}>
              <h2 className={`text-2xl font-bold mb-6 ${theme.text}`}>Send Us a Message</h2>
              <ContactForm theme={theme} initialInquiry={inquiryParam} initialProduct={productParam} />
            </div>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-3 animate-fade-in-up anim-delay-200">
            <ContactInfoCard
              icon={Phone}
              title="Phone"
              theme={theme}
              href={company.phoneHref}
              onClick={() => trackPhoneClick()}
            >
              <p className="font-medium">{company.phone}</p>
            </ContactInfoCard>

            <ContactInfoCard
              icon={Mail}
              title="Email Us"
              theme={theme}
              href={`mailto:${company.founder.email}`}
              onClick={() => trackEmailClick()}
            >
              <p className="font-medium break-all">{company.founder.email}</p>
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
              <p className="font-medium">{company.hours}</p>
            </ContactInfoCard>

            <ContactInfoCard
              icon={Briefcase}
              title="Samples"
              theme={theme}
            >
              <p>{sampleOffer.turnaround}</p>
              <p className="mt-1">{sampleOffer.moq}</p>
            </ContactInfoCard>

            {/* Quick Links */}
            <div className={`${theme.bgCard} rounded-xl border ${theme.borderCard} p-4`}>
              <h3 className={`font-semibold ${theme.text} text-sm mb-3`}>Quick Links</h3>
              <div className="space-y-2 text-sm">
                <Link
                  to="/faq"
                  className={`block py-3 ${theme.textSecondary} hover:${theme.accentText} transition-colors`}
                >
                  → FAQ
                </Link>
                <a
                  href={company.shop}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block py-3 ${theme.textSecondary} hover:${theme.accentText} transition-colors`}
                >
                  → Shop
                </a>
                <a
                  href={company.resources}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block py-3 ${theme.textSecondary} hover:${theme.accentText} transition-colors`}
                >
                  → Resources
                </a>
              </div>
            </div>
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
