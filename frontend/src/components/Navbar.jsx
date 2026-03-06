import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QrCode, Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LanguageToggle from './LanguageToggle';

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const lang = i18n.language?.startsWith('it') ? 'it' : 'en';

  // Scroll detection for bg transition
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  const navLinks = [
    { label: lang === 'it' ? 'Come Funziona' : 'How It Works', href: '/#how-it-works' },
    { label: lang === 'it' ? 'Prezzi' : 'Pricing', to: '/pricing' },
    { label: 'Demo', href: 'https://calendly.com/qrgate-demo', external: true },
  ];

  return (
    <>
      <nav
        className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
            ? 'bg-white/95 backdrop-blur-xl border-b border-stone-200/80 shadow-sm'
            : 'bg-transparent border-b border-transparent'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group" aria-label="QRGate home">
              <div className="w-8 h-8 bg-stone-950 rounded-lg flex items-center justify-center group-hover:bg-stone-800 transition-colors duration-200">
                <QrCode className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-lg font-black text-stone-950 tracking-tight">QRGate</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link, i) => (
                link.to ? (
                  <Link key={i} to={link.to} className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors duration-150">
                    {link.label}
                  </Link>
                ) : (
                  <a key={i} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined}
                    className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors duration-150">
                    {link.label}
                  </a>
                )
              ))}
            </div>

            {/* Right Side */}
            <div className="hidden md:flex items-center gap-3">
              <LanguageToggle />
              <Link to="/login" className="text-sm font-medium text-stone-500 hover:text-stone-900 px-3 py-2 rounded-lg hover:bg-stone-100 transition-all duration-150">
                {lang === 'it' ? 'Accedi' : 'Login'}
              </Link>
              <Link to="/onboarding" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-stone-950 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 active:scale-[0.97] transition-all duration-150 shadow-sm">
                {lang === 'it' ? 'Inizia Gratis' : 'Get Started'}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 -mr-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all duration-150"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-0 top-[calc(56px+1px)] z-40 md:hidden bg-white border-b border-stone-200 shadow-lg"
          >
            <div className="px-4 pt-4 pb-6 space-y-1">
              {navLinks.map((link, i) => (
                link.to ? (
                  <Link key={i} to={link.to} onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition-colors">
                    {link.label} <ChevronRight className="w-4 h-4 text-stone-400" />
                  </Link>
                ) : (
                  <a key={i} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition-colors">
                    {link.label} <ChevronRight className="w-4 h-4 text-stone-400" />
                  </a>
                )
              ))}
              <div className="pt-3 border-t border-stone-100 mt-3 space-y-2">
                <div className="px-4 py-2"><LanguageToggle /></div>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 rounded-xl transition-colors">
                  {lang === 'it' ? 'Accedi' : 'Login'} <ChevronRight className="w-4 h-4 text-stone-400" />
                </Link>
                <Link to="/onboarding" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3.5 bg-stone-950 text-white text-sm font-bold rounded-xl transition-colors">
                  {lang === 'it' ? 'Inizia Gratuitamente' : 'Get Started Free'} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;