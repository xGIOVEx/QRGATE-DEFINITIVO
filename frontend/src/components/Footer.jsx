import React from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-stone-950 text-stone-400 py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1 */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <QrCode className="w-8 h-8 text-stone-50" />
              <span className="text-2xl font-black text-stone-50 tracking-tighter">QRGate</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">{t('footer.tagline')}</p>
          </div>

          {/* Column 2 */}
          <div>
            <div className="space-y-3">
              <a href="#how-it-works" className="block hover:text-amber-500 transition-colors font-medium">
                {t('nav.howItWorks')}
              </a>
              <a href="#pricing" className="block hover:text-amber-500 transition-colors font-medium">
                {t('nav.pricing')}
              </a>
              <a href="#demo" className="block hover:text-amber-500 transition-colors font-medium">
                {t('nav.demo')}
              </a>
              <Link to="/blog" className="block hover:text-amber-500 transition-colors font-medium">
                {t('footer.blog')}
              </Link>
            </div>
          </div>

          {/* Column 3 */}
          <div>
            <div className="space-y-3">
              <Link to="/privacy" className="block hover:text-amber-500 transition-colors font-medium">
                {t('footer.privacyPolicy')}
              </Link>
              <Link to="/terms" className="block hover:text-amber-500 transition-colors font-medium">
                {t('footer.terms')}
              </Link>
              <Link to="/gdpr" className="block hover:text-amber-500 transition-colors font-medium">
                {t('footer.gdpr')}
              </Link>
              <Link to="/status" className="block hover:text-amber-500 transition-colors font-medium">
                {t('footer.status')}
              </Link>
            </div>
          </div>

          {/* Column 4 */}
          <div>
            <div className="space-y-3">
              <Link to="/contact" className="block hover:text-amber-500 transition-colors font-medium">
                {t('footer.contact')}
              </Link>
              <Link to="/support" className="block hover:text-amber-500 transition-colors font-medium">
                {t('footer.support')}
              </Link>
              <Link to="/support/ticket" className="block hover:text-amber-500 transition-colors font-medium">
                {t('footer.openTicket')}
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8">
          <p className="text-center text-xs font-black uppercase tracking-[0.2em]">{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;