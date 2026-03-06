import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const languages = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'hu', label: 'Magyar', flag: '🇭🇺' }
];

const LanguageToggle = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLangCode = i18n.language?.substring(0, 2) || 'it';
  const currentLang = languages.find(l => l.code === currentLangCode) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setIsOpen(false);
    // Update HTML dir for RTL languages like Arabic
    const selectedLang = languages.find(l => l.code === lang);
    document.documentElement.dir = selectedLang?.dir || 'ltr';
    document.documentElement.lang = lang;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-white transition-all shadow-sm group"
      >
        <Globe className="w-4 h-4 text-emerald-500 group-hover:rotate-12 transition-transform" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">
          {currentLang.flag} {currentLang.code}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-56 max-h-[400px] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-2 custom-scrollbar"
          >
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Seleziona Lingua</span>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {languages.map(({ code, label, flag }) => (
                <button
                  key={code}
                  onClick={() => toggleLanguage(code)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${currentLangCode === code
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">{flag}</span>
                    <span>{label}</span>
                  </div>
                  {currentLangCode === code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LanguageToggle;